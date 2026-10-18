import { Context, h } from 'koishi'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { Config } from './config'
import type { PluginConfig } from './config'
import { LinkMatch, ParsedData, CustomPlatformConfig } from './types'
import { SimpleLRUCache, ConcurrencyLimiter, delay, getErrorMessage, parseFieldMapping } from './utils'
import { logger, debugLog, setDebugEnabled, elapsedSince, describeContent, maskSecret } from './logger'
import { buildCustomLinkRules, linkTypeParser, extractAllUrlsFromMessage } from './link-rules'
import { processSingleUrl } from './service/parser'
import { DeduplicationManager } from './dedupe'
import { buildMergeKinds, buildSendPlan, groupSendPlan } from './send-plan'
import type { SendKind, SendPlanItem } from './send-plan'

export { Config }
export const name = 'video-parser-all'

interface SendResult {
  success: boolean
  uncertain: boolean
}

const SEND_INTERVAL_MS = 300
const IMAGE_SEND_INTERVAL_MS = 1000
const MAX_FORWARD_NODES = 50

export function apply(ctx: Context, config: PluginConfig) {
  setDebugEnabled(config.debug || false)
  debugLog('INFO', 'plugin start', {
    apiKey: maskSecret(config.apiKey),
    authMode: config.authMode,
    enableForward: config.enableForward,
    mergeKinds: [...buildMergeKinds(config)],
    showImageText: config.showImageText,
    showCoverImage: config.showCoverImage,
    showAuthorAvatar: config.showAuthorAvatar,
    showMusicCover: config.showMusicCover,
    showVideo: config.showVideo,
    showVideoFile: config.showVideoFile,
    showMusicVoice: config.showMusicVoice,
    musicVoiceScope: config.musicVoiceScope,
    showMusicVoiceFile: config.showMusicVoiceFile,
    maxConcurrent: config.maxConcurrent,
    timeout: config.timeout,
    videoSendTimeout: config.videoSendTimeout,
    retryTimes: config.retryTimes,
    retryInterval: config.retryInterval,
    cacheTTL: config.cacheTTL,
    deduplicationInterval: config.deduplicationInterval,
  })
  const disabledPlatforms = Object.entries(config.platformEnabled || {}).filter(([, enabled]) => !enabled).map(([type]) => type)
  debugLog('INFO', `已关闭的平台: ${disabledPlatforms.length ? disabledPlatforms.join(', ') : '无'}`)
  if (!config.apiKey) {
    logger.warn('未配置 api-new.ifphp.com API Key，所有解析请求可能失败。请在插件配置中填写 apiKey。')
  }

  const dedupInterval = typeof config.deduplicationInterval === 'number' && config.deduplicationInterval >= 0 ? config.deduplicationInterval : 180
  const deduplication = new DeduplicationManager(dedupInterval)
  const dedupCache = new SimpleLRUCache<number>(1000, Math.max(dedupInterval, 1) * 1000)
  const cacheTTL = typeof config.cacheTTL === 'number' && config.cacheTTL >= 0 ? config.cacheTTL * 1000 : 60000
  const contentDedupCache = new SimpleLRUCache<number>(1000, dedupInterval * 1000)
  const pendingSends = new Map<string, Promise<SendResult>>()
  const processingMessages = new Set<string>()
  const requestConfig = {
    maxDescLength: config.maxDescLength,
    unifiedMessageFormat: config.unifiedMessageFormat,
    authMode: config.authMode,
    timeout: config.timeout,
    userAgent: config.userAgent,
    retryTimes: config.retryTimes,
    retryInterval: config.retryInterval,
    customHeaders: config.customHeaders,
    primaryApiUrl: config.primaryApiUrl,
    cacheTTL,
    apiKey: config.apiKey || '',
  }

  function contentFingerprint(p: ParsedData): string {
    const imgSig = p.images?.length ? p.images.slice(0, 3).join('|') : (p.live_photo ? p.live_photo.slice(0, 3).map(lp => lp.image).join('|') : '')
    return [p.type, p.title, p.author, p.uid, p.video, imgSig].map(v => String(v ?? '')).join('::')
  }

  function getText(key: string): string {
    const defaults: Record<string, string> = {
      waitingTipText: '正在解析视频，请稍候...',
      unsupportedPlatformText: '不支持该平台链接',
      invalidLinkText: '无效的视频链接',
      parseErrorPrefix: '❌ 解析失败：',
      parseErrorItemFormat: '【${url}】: ${msg}',
      deduplicationTipText: '链接 ${url} 在最近 ${interval} 秒内已解析过，已跳过。',
    }
    return config[key] || defaults[key] || ''
  }

  async function sendDeduplicationTip(session: any, url: string): Promise<void> {
    const shortUrl = url.length > 80 ? url.slice(0, 80) + '...' : url
    const tip = getText('deduplicationTipText')
      .replace(/\$\{url\}/g, shortUrl)
      .replace(/\$\{interval\}/g, String(dedupInterval))
    await sendSafe(session, tip, getText('deduplicationTipText'))
  }

  async function sendSafe(session: any, content: any, contextLabel: string): Promise<boolean> {
    try {
      const result = await sendWithTimeout(session, content)
      if (!result.success && !result.uncertain) {
        await sendWithTimeout(session, `发送失败：${contextLabel}`)
        return false
      }
      return true
    } catch (err) {
      debugLog('ERROR', `发送失败 [${contextLabel}]: ${getErrorMessage(err)}`)
      try {
        await sendWithTimeout(session, `发送失败：${contextLabel}`)
      } catch {}
      return false
    }
  }

  const proxyConfig = config.proxy || {}
  const customPlatforms: CustomPlatformConfig[] = (config.customPlatforms || []).map((p: any) => ({
    name: p.name,
    apiUrl: p.apiUrl,
    apiKey: p.apiKey || '',
    authHeaderType: p.authHeaderType || 'X-API-Key',
    customHeaderName: p.customHeaderName || 'X-API-Key',
    fieldMapping: parseFieldMapping(p.fieldMapping),
    proxy: p.proxy || null
  }))

  function getPlatformConfig(type: string): { apiUrls: string[]; dedicatedFirst: boolean; apiKey: string; authHeaderType: string; customHeaderName: string; fieldMapping?: Record<string, string>; customProxy?: any; videoIdApiUrl?: string; videoIdParam?: string } {
    if (type.startsWith('custom_')) {
      const name = type.slice(7)
      const custom = customPlatforms.find(p => p.name === name)
      if (custom) {
        return {
          apiUrls: custom.apiUrl ? [custom.apiUrl] : [],
          dedicatedFirst: true,
          apiKey: custom.apiKey || config.apiKey || '',
          authHeaderType: custom.authHeaderType,
          customHeaderName: custom.customHeaderName,
          fieldMapping: custom.fieldMapping,
          customProxy: custom.proxy
        }
      }
      return { apiUrls: [], dedicatedFirst: false, apiKey: config.apiKey || '', authHeaderType: 'X-API-Key', customHeaderName: 'X-API-Key' }
    }

    const custom = config.customApis?.find((item: any) => item.platform === type)
    const defaultDedicatedApis: Record<string, string[]> = {
      bilibili: ['https://api-new.ifphp.com/api/bilibili'],
      douyin: ['https://api-new.ifphp.com/api/dyjx', 'https://api-new.ifphp.com/api/dydj'],
      kuaishou: ['https://api-new.ifphp.com/api/ksjx'],
      wechat_channel: ['https://api-new.ifphp.com/api/wxsph'],
      doubao: ['https://api-new.ifphp.com/api/doubao'],
      pipigx: ['https://api-new.ifphp.com/api/pipigx'],
      jimeng: ['https://api-new.ifphp.com/api/jimeng'],
      dola: ['https://api-new.ifphp.com/api/dola'],
    }
    let apiUrls = defaultDedicatedApis[type] || []
    let apiKey = config.apiKey || ''
    let authHeaderType = 'X-API-Key'
    let customHeaderName = 'X-API-Key'
    let fieldMapping: Record<string, string> | undefined = undefined
    if (custom && custom.apiUrl) {
      apiUrls = [custom.apiUrl]
      apiKey = custom.apiKey || config.apiKey || ''
      authHeaderType = custom.authHeaderType || 'X-API-Key'
      customHeaderName = custom.customHeaderName || 'X-API-Key'
      fieldMapping = parseFieldMapping(custom.fieldMapping)
    }
    const dedicatedFirst = config.platformDedicatedFirst?.[type] ?? false
    if (!fieldMapping) {
      fieldMapping = parseFieldMapping(config.globalFieldMapping)
    }
    const videoIdConfig = type === 'douyin' ? {
      videoIdApiUrl: 'https://api-new.ifphp.com/api/zjyh',
      videoIdParam: 'video_id',
    } : {}
    return { apiUrls, dedicatedFirst, apiKey, authHeaderType, customHeaderName, fieldMapping, ...videoIdConfig }
  }

  async function sendWithTimeout(session: any, content: any, customRetries?: number): Promise<SendResult> {
    const messageId = session?.messageId
    const sendKey = messageId ? `${messageId}::${typeof content === 'string' ? content : JSON.stringify(content)}` : null
    if (sendKey) {
      const existing = pendingSends.get(sendKey)
      if (existing) return existing
    }
    const sendPromise = (async () => {
      const maxRetries = customRetries ?? config.retryTimes ?? 3
      const retryDelay = config.retryInterval ?? 1000
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const startedAt = Date.now()
        debugLog('DEBUG', `发送中 第 ${attempt + 1}/${maxRetries + 1} 次`, describeContent(content))
        try {
          if (config.videoSendTimeout > 0) {
            let timer: NodeJS.Timeout | undefined
            const timeoutPromise = new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('发送超时')), config.videoSendTimeout)
            })
            try {
              await Promise.race([session.send(content), timeoutPromise])
            } finally {
              if (timer) clearTimeout(timer)
            }
          } else {
            await session.send(content)
          }
          debugLog('DEBUG', '发送成功', elapsedSince(startedAt), describeContent(content))
          return { success: true, uncertain: false }
        } catch (err) {
          const errMsg = getErrorMessage(err)
          debugLog('DEBUG', '发送异常', elapsedSince(startedAt), errMsg, describeContent(content))
          if (errMsg === '发送超时') {
            debugLog('WARN', `发送超时（消息可能仍在发送中）: ${errMsg}`)
            return { success: false, uncertain: true }
          }
          debugLog('ERROR', `发送失败尝试 ${attempt + 1}: ${errMsg}`)
          if (attempt < maxRetries) await delay(retryDelay)
          else if (!config.ignoreSendError) throw err
          else return { success: false, uncertain: false }
        }
      }
      return { success: false, uncertain: false }
    })().catch((err) => {
      debugLog('ERROR', `发送最终失败: ${getErrorMessage(err)}`)
      throw err
    })
    if (sendKey) pendingSends.set(sendKey, sendPromise)
    try {
      return await sendPromise
    } finally {
      if (sendKey) pendingSends.delete(sendKey)
    }
  }

  function createMediaElement(mediaType: 'image' | 'video' | 'audio', url: string) {
    if (mediaType === 'audio') return h.audio(url)
    if (mediaType === 'video') return h.video(url)
    return h.image(url)
  }

  async function sendPlanItem(session: any, item: SendPlanItem): Promise<void> {
    const startedAt = Date.now()
    debugLog('INFO', `[发送] ${item.label}`, { url: item.url, text: item.text ? item.text.slice(0, 120) : undefined })
    if (item.text) {
      await sendSafe(session, item.text, `${item.label}文字`)
      if (item.url) await delay(SEND_INTERVAL_MS)
    }
    if (!item.url || !item.mediaType) {
      debugLog('INFO', `[发送完成] ${item.label}`, elapsedSince(startedAt))
      return
    }
    const fallback = `${item.label}链接：${item.url}`
    try {
      const result = await sendWithTimeout(session, createMediaElement(item.mediaType, item.url))
      if (!result.success && !result.uncertain) await sendSafe(session, fallback, `${item.label}降级`)
      debugLog('INFO', `[发送完成] ${item.label}`, elapsedSince(startedAt), { success: result.success, uncertain: result.uncertain })
    } catch (err) {
      debugLog('WARN', `[发送失败] ${item.label}`, elapsedSince(startedAt), getErrorMessage(err))
      await sendSafe(session, fallback, `${item.label}降级`)
    }
  }

  function buildPlanNode(session: any, item: SendPlanItem, botName: string) {
    const content: any[] = []
    if (item.text) content.push(h.text(item.text))
    if (item.url && item.mediaType) content.push(createMediaElement(item.mediaType, item.url))
    return buildForwardNode(session, content, botName)
  }

  function resolveMergeKinds(session: any): Set<SendKind> {
    if (!config.enableForward) return new Set<SendKind>()
    if (session.platform !== 'onebot' && session.platform !== 'satori') return new Set<SendKind>()
    return buildMergeKinds(config)
  }

  async function sendForwardSegment(session: any, items: SendPlanItem[], botName: string): Promise<void> {
    for (let start = 0; start < items.length; start += MAX_FORWARD_NODES) {
      const chunk = items.slice(start, start + MAX_FORWARD_NODES)
      try {
        const nodes = chunk.map(item => buildPlanNode(session, item, botName))
        const result = await sendWithTimeout(session, h('message', { forward: true }, nodes), config.retryTimes)
        if (!result.success && !result.uncertain) throw new Error('合并转发发送失败')
      } catch (err) {
        debugLog('WARN', `合并转发失败，降级逐条发送: ${getErrorMessage(err)}`)
        for (const item of chunk) {
          await sendPlanItem(session, item)
          await delay(SEND_INTERVAL_MS)
        }
      }
    }
  }

  function buildForwardNode(session: any, content: any, botName: string) {
    let messageContent: any[]
    if (Array.isArray(content)) messageContent = content
    else if (content && typeof content === 'object' && content.type) messageContent = [content]
    else messageContent = [h.text(String(content))]
    const node = h('node', { user: { nickname: botName.substring(0, 15), user_id: session.selfId } }, messageContent)
    Object.assign(node, { __vpContent: messageContent })
    return node
  }

  async function flush(session: any, matches: LinkMatch[]) {
    const flushStartedAt = Date.now()
    debugLog('INFO', `开始解析 ${matches.length} 个链接`, matches.map(match => ({ type: match.type, url: match.url })))
    const items: { text: string; parsed: ParsedData; index: number }[] = []
    const errors: { item: string; index: number }[] = []
    const limiter = new ConcurrencyLimiter(config.maxConcurrent || 3)

    const promises = matches.map(async (match, index) => {
      await limiter.acquire()
      const itemStartedAt = Date.now()
      try {
        if (config.enableDeduplication !== false && dedupInterval > 0) {
          const lastTime = dedupCache.get(match.url)
          if (lastTime && Date.now() - lastTime < dedupInterval * 1000) {
            debugLog('INFO', `跳过重复链接: ${match.url}`, { seenMs: Date.now() - lastTime, intervalMs: dedupInterval * 1000 })
            await sendDeduplicationTip(session, match.url)
            return
          }
        }

        debugLog('INFO', `解析链接: ${match.url} (${match.type})`)
        const platformConf = getPlatformConfig(match.type)
        debugLog('DEBUG', `平台配置 ${match.type}`, {
          apiUrls: platformConf.apiUrls,
          dedicatedFirst: platformConf.dedicatedFirst,
          apiKey: maskSecret(platformConf.apiKey),
          authHeaderType: platformConf.authHeaderType,
          fieldMappingKeys: platformConf.fieldMapping ? Object.keys(platformConf.fieldMapping).length : 0,
          videoIdApiUrl: platformConf.videoIdApiUrl,
        })
        const result = await processSingleUrl(http, requestConfig, match.url, match.type, platformConf)

        if (result.success) {
          if (config.enableDeduplication !== false && dedupInterval > 0) {
            const fp = contentFingerprint(result.data.parsed)
            const lastDedup = contentDedupCache.get(fp)
            if (lastDedup && Date.now() - lastDedup < dedupInterval * 1000) {
              debugLog('INFO', `跳过重复内容: ${match.url}`, { fingerprint: fp })
              dedupCache.set(match.url, Date.now())
              await sendDeduplicationTip(session, match.url)
              return
            }
            contentDedupCache.set(fp, Date.now())
            dedupCache.set(match.url, Date.now())
          }
          debugLog('INFO', `解析完成: ${match.url}`, elapsedSince(itemStartedAt), {
            type: result.data.parsed.type,
            title: result.data.parsed.title,
            hasVideo: Boolean(result.data.parsed.video),
            images: result.data.parsed.images.length,
            livePhoto: result.data.parsed.live_photo.length,
            hasMusic: Boolean(result.data.parsed.music.url),
            hasMusicCover: Boolean(result.data.parsed.music.cover),
            hasAvatar: Boolean(result.data.parsed.avatar),
            hasCover: Boolean(result.data.parsed.cover),
          })
          items.push({ ...result.data, index })
        } else {
          debugLog('WARN', `解析失败: ${match.url}`, elapsedSince(itemStartedAt), result.msg)
          const displayUrl = match.url.length > 80 ? match.url.slice(0, 80) + '...' : match.url
          const item = getText('parseErrorItemFormat')
            .replace(/\$\{url\}/g, displayUrl)
            .replace(/\$\{msg\}/g, result.msg)
          errors.push({ item, index })
        }
      } finally {
        limiter.release()
      }
    })

    await Promise.all(promises)

    items.sort((a, b) => a.index - b.index)
    errors.sort((a, b) => a.index - b.index)
    const orderedItems = items.map(({ index, ...data }) => data)
    const orderedErrors = errors.map(e => e.item)

    if (orderedErrors.length) {
      await sendSafe(session, `${getText('parseErrorPrefix')}\n${orderedErrors.join('\n')}`, '解析错误')
    }
    if (!orderedItems.length) return

    const totalItems = orderedItems.length
    const botName = config.botName || '视频解析机器人'
    const mergeKinds = resolveMergeKinds(session)

    debugLog('INFO', '开始发送', { items: totalItems, mergeKinds: [...mergeKinds] })

    for (let i = 0; i < orderedItems.length; i++) {
      const item = orderedItems[i]
      const text = totalItems > 1 ? `【${i + 1}/${totalItems}】\n${item.text}` : item.text
      const plan = buildSendPlan(item.parsed, config, text)
      debugLog('INFO', `[计划] 第 ${i + 1}/${totalItems} 项`, { type: item.parsed.type, kinds: plan.map(entry => entry.kind), text: text.slice(0, 120) })
      for (const segment of groupSendPlan(plan, mergeKinds)) {
        debugLog('INFO', `[分段] ${segment.merged ? '合并转发' : '单独发送'}`, segment.items.map(entry => ({ kind: entry.kind, url: entry.url, text: entry.text ? entry.text.slice(0, 60) : undefined })))
        if (segment.merged) await sendForwardSegment(session, segment.items, botName)
        else await sendPlanItem(session, segment.items[0])
        const lastItem = segment.items[segment.items.length - 1]
        await delay(lastItem.mediaType === 'image' ? IMAGE_SEND_INTERVAL_MS : SEND_INTERVAL_MS)
      }
    }
    debugLog('INFO', '处理完成', elapsedSince(flushStartedAt))
  }

  const customRules = buildCustomLinkRules(config.customPlatforms || [])

  const axiosConfig: AxiosRequestConfig = {
    timeout: config.timeout,
    headers: {
      'User-Agent': config.userAgent,
      'Referer': 'https://www.baidu.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  }
  if (proxyConfig.enabled && proxyConfig.host) {
    axiosConfig.proxy = {
      protocol: proxyConfig.protocol || 'http',
      host: proxyConfig.host,
      port: proxyConfig.port || 7890,
      auth: proxyConfig.auth?.username ? {
        username: proxyConfig.auth.username,
        password: proxyConfig.auth.password || ''
      } : undefined
    }
  }
  const http: AxiosInstance = axios.create(axiosConfig)

  function isPlatformEnabled(type: string): boolean {
    if (type.startsWith('custom_')) return true
    return config.platformEnabled?.[type] ?? true
  }

  ctx.on('message', async (session) => {
    if (!config.enable) return
    if (/^\s*parse\b/i.test(session.content || '')) return
    if (session.subtype === 'file_upload') return
    if (session.elements?.some(elem => elem.type === 'file' || elem.type === 'folder')) return
    if (session.selfId === session.userId) return
    const messageId = session.messageId
    if (messageId && processingMessages.has(messageId)) return
    if (messageId) {
      if (!deduplication.acquireLock(messageId)) return
      if (deduplication.isMessageProcessed(messageId)) {
        deduplication.releaseLock(messageId)
        return
      }
    }
    if (messageId) processingMessages.add(messageId)
    try {
      const matches = extractAllUrlsFromMessage(session, customRules)
      if (!matches.length) return
      const enabledMatches = matches.filter(match => isPlatformEnabled(match.type))
      if (!enabledMatches.length) return
      debugLog('DEBUG', '消息命中链接', {
        platform: session.platform,
        selfId: session.selfId,
        userId: session.userId,
        channelId: session.channelId,
        guildId: session.guildId,
        messageId: session.messageId,
        elements: session.elements?.map(elem => elem.type),
      })
      debugLog('INFO', `检测到 ${enabledMatches.length} 个链接`, enabledMatches.map(match => ({ type: match.type, url: match.url })), {
        disabledPlatforms: matches.filter(match => !isPlatformEnabled(match.type)).map(match => match.type),
      })
      if (config.showWaitingTip) {
        const waitingContent = session.messageId ? [h.quote(session.messageId), h.text(getText('waitingTipText'))] : getText('waitingTipText')
        try {
          await sendWithTimeout(session, waitingContent)
        } catch (e) {
          debugLog('WARN', '等待提示发送失败:', e)
        }
      }
      await flush(session, enabledMatches)
    } catch (err) {
      debugLog('ERROR', '消息处理异常', getErrorMessage(err))
    } finally {
      if (messageId) {
        processingMessages.delete(messageId)
        deduplication.releaseLock(messageId)
      }
    }
  })

  ctx.command('parse <url>', '手动解析视频').action(async ({ session }, url) => {
    if (!url) { await sendWithTimeout(session, getText('invalidLinkText')); return }
    const matches = linkTypeParser(url, customRules)
    if (!matches.length) { await sendWithTimeout(session, getText('invalidLinkText')); return }
    const enabledMatches = matches.filter(match => isPlatformEnabled(match.type))
    if (!enabledMatches.length) { await sendWithTimeout(session, getText('unsupportedPlatformText')); return }
    if (config.showWaitingTip) {
      const waitingContent = session?.messageId ? [h.quote(session.messageId), h.text(getText('waitingTipText'))] : getText('waitingTipText')
      try {
        await sendWithTimeout(session, waitingContent)
      } catch (e) {
        debugLog('WARN', '等待提示发送失败:', e)
      }
    }
    try {
      await flush(session, enabledMatches)
    } catch (err) {
      debugLog('ERROR', '指令解析异常', getErrorMessage(err))
    }
  })

  ctx.on('dispose', () => {
    dedupCache.clear()
    contentDedupCache.clear()
    deduplication.clear()
    pendingSends.clear()
    processingMessages.clear()
    debugLog('INFO', '插件已卸载')
  })

  debugLog('INFO', '插件初始化完成')
}

