import { Context, h } from 'koishi'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { Config } from './config'
import { LinkMatch, ParsedData, ApiItem, CustomPlatformConfig } from './types'
import { SimpleLRUCache, ConcurrencyLimiter, delay, getErrorMessage, parseFieldMapping, getFirst } from './utils'
import { logger, debugLog, setDebugEnabled } from './logger'
import { buildCustomLinkRules, linkTypeParser, extractAllUrlsFromMessage } from './link-rules'
import { generateFormattedText } from './format'
import { fetchApi } from './service/api'
import { processSingleUrl } from './service/parser'
import { DeduplicationManager } from './dedupe'

export { Config }
export const name = 'video-parser-all'

export function apply(ctx: Context, config: any) {
  setDebugEnabled(config.debug || false)
  debugLog('INFO', 'plugin start')
  if (!config.apiKey) {
    logger.warn('未配置 api-new.ifphp.com API Key，所有解析请求可能失败。请在插件配置中填写 apiKey。')
  }

  const dedupInterval = typeof config.deduplicationInterval === 'number' && config.deduplicationInterval > 0 ? config.deduplicationInterval : 180
  const deduplication = new DeduplicationManager(dedupInterval)
  const dedupCache = new SimpleLRUCache<number>(1000, dedupInterval * 1000)
  const cacheTTL = (config.cacheTTL || 600) * 1000
  const urlCacheLocal = new SimpleLRUCache<{ data: ParsedData; expire: number }>(500, cacheTTL)
  const contentDedupCache = new SimpleLRUCache<number>(1000, dedupInterval * 1000)
  const pendingSends = new Map<string, Promise<void>>()
  const processingMessages = new Set<string>()

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

  async function sendSafe(session: any, content: any, contextLabel: string): Promise<boolean> {
    try {
      await sendWithTimeout(session, content)
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

  function getPlatformConfig(type: string): { apiUrl: string | null; dedicatedFirst: boolean; apiKey: string; authHeaderType: string; customHeaderName: string; fieldMapping?: Record<string, string>; customProxy?: any } {
    if (type.startsWith('custom_')) {
      const name = type.slice(7)
      const custom = customPlatforms.find(p => p.name === name)
      if (custom) {
        return {
          apiUrl: custom.apiUrl,
          dedicatedFirst: true,
          apiKey: custom.apiKey || config.apiKey || '',
          authHeaderType: custom.authHeaderType,
          customHeaderName: custom.customHeaderName,
          fieldMapping: custom.fieldMapping,
          customProxy: custom.proxy
        }
      }
      return { apiUrl: null, dedicatedFirst: false, apiKey: config.apiKey || '', authHeaderType: 'X-API-Key', customHeaderName: 'X-API-Key' }
    }

    const custom = config.customApis?.find((item: any) => item.platform === type)
    const defaultDedicatedApis: Record<string, string> = {
      bilibili: 'https://api-new.ifphp.com/api/bilibili',
      douyin: 'https://api-new.ifphp.com/api/dyjx',
      kuaishou: 'https://api-new.ifphp.com/api/ksjx',
      wechat_channel: 'https://api-new.ifphp.com/api/wxsph',
      doubao: 'https://api-new.ifphp.com/api/doubao',
      pipigx: 'https://api-new.ifphp.com/api/pipigx',
      jimeng: 'https://api-new.ifphp.com/api/jimeng',
    }
    let apiUrl = defaultDedicatedApis[type] || null
    let apiKey = config.apiKey || ''
    let authHeaderType = 'X-API-Key'
    let customHeaderName = 'X-API-Key'
    let fieldMapping: Record<string, string> | undefined = undefined
    if (custom && custom.apiUrl) {
      apiUrl = custom.apiUrl
      apiKey = custom.apiKey || config.apiKey || ''
      authHeaderType = custom.authHeaderType || 'X-API-Key'
      customHeaderName = custom.customHeaderName || 'X-API-Key'
      fieldMapping = parseFieldMapping(custom.fieldMapping)
    }
    const dedicatedFirst = config.platformDedicatedFirst?.[type] ?? false
    if (!fieldMapping) {
      fieldMapping = parseFieldMapping(config.globalFieldMapping)
    }
    return { apiUrl, dedicatedFirst, apiKey, authHeaderType, customHeaderName, fieldMapping }
  }

  function buildAuthHeaders(apiKey: string, authHeaderType: string, customHeaderName: string): Record<string, string> {
    if (!apiKey) return {}
    if (authHeaderType === 'Bearer') return { 'Authorization': `Bearer ${apiKey}` }
    if (authHeaderType === 'X-API-Key') return { 'X-API-Key': apiKey }
    if (authHeaderType === 'Custom' && customHeaderName) return { [customHeaderName]: apiKey }
    return {}
  }

  async function sendWithTimeout(session: any, content: any, customRetries?: number): Promise<any> {
    const messageId = session?.messageId
    const sendKey = messageId ? `${messageId}::${typeof content === 'string' ? content : JSON.stringify(content)}` : null
    if (sendKey) {
      const existing = pendingSends.get(sendKey)
      if (existing) return existing.catch(() => null)
    }
    const sendPromise = (async () => {
      const maxRetries = customRetries ?? config.retryTimes ?? 3
      const retryDelay = config.retryInterval || 1000
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
          return
        } catch (err) {
          const errMsg = getErrorMessage(err)
          if (errMsg === '发送超时') {
            debugLog('WARN', `发送超时（消息可能仍在发送中）: ${errMsg}`)
            return
          }
          debugLog('ERROR', `发送失败尝试 ${attempt + 1}: ${errMsg}`)
          if (attempt < maxRetries) await delay(retryDelay)
          else if (!config.ignoreSendError) throw err
        }
      }
    })().catch((err) => {
      debugLog('ERROR', `发送最终失败: ${getErrorMessage(err)}`)
      throw err
    })
    if (sendKey) pendingSends.set(sendKey, sendPromise)
    try {
      await sendPromise
    } finally {
      if (sendKey) pendingSends.delete(sendKey)
    }
  }

  async function sendMedia(session: any, url: string, type: 'image' | 'video' | 'audio', showFile: boolean) {
    if (!url) return
    if (!showFile) {
      await sendSafe(session, `${type === 'audio' ? '音乐' : type === 'video' ? '视频' : '图片'}链接：${url}`, `${type}链接`)
      return
    }
    try {
      await sendWithTimeout(session, type === 'audio' ? h.audio(url) : type === 'video' ? h.video(url) : h.image(url))
    } catch {
      await sendSafe(session, `${type === 'audio' ? '音乐' : type === 'video' ? '视频' : '图片'}链接：${url}`, `${type}降级`)
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
    debugLog('INFO', `开始解析 ${matches.length} 个链接`)
    const items: { text: string; parsed: ParsedData; index: number }[] = []
    const errors: { item: string; index: number }[] = []
    const limiter = new ConcurrencyLimiter(config.maxConcurrent || 3)

    const promises = matches.map(async (match, index) => {
      await limiter.acquire()
      try {
        if (config.enableDeduplication !== false && config.deduplicationInterval > 0) {
          const lastTime = dedupCache.get(match.url)
          if (lastTime && Date.now() - lastTime < config.deduplicationInterval * 1000) {
            debugLog('INFO', `跳过重复链接: ${match.url}`)
            const shortUrl = match.url.length > 80 ? match.url.slice(0, 80) + '...' : match.url
            const tip = getText('deduplicationTipText')
              .replace(/\$\{url\}/g, shortUrl)
              .replace(/\$\{interval\}/g, String(config.deduplicationInterval))
            await sendSafe(session, tip, getText('deduplicationTipText'))
            return
          }
        }

        debugLog('INFO', `解析链接: ${match.url} (${match.type})`)
        const platformConf = getPlatformConfig(match.type)
        const fieldMapping = platformConf.fieldMapping
        const result = await processSingleUrl(http, { maxDescLength: config.maxDescLength, unifiedMessageFormat: config.unifiedMessageFormat }, match.url, match.type, fieldMapping, platformConf)

        if (result.success) {
          if (config.enableDeduplication !== false && config.deduplicationInterval > 0) {
            const fp = contentFingerprint(result.data.parsed)
            const lastDedup = contentDedupCache.get(fp)
            if (lastDedup && Date.now() - lastDedup < config.deduplicationInterval * 1000) {
              debugLog('INFO', `跳过重复内容: ${match.url}`)
              return
            }
            contentDedupCache.set(fp, Date.now())
            dedupCache.set(match.url, Date.now())
          }
          items.push({ ...result.data, index })
        } else {
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
    const enableForward = config.enableForward && (session.platform === 'onebot' || session.platform === 'satori')
    const botName = config.botName || '视频解析机器人'

    if (enableForward) {
      const forwardMessages: any[] = []
      for (let i = 0; i < orderedItems.length; i++) {
        const item = orderedItems[i]
        const p = item.parsed
        const textWithIndex = totalItems > 1 ? `【${i + 1}/${totalItems}】\n${item.text}` : item.text
        let text = textWithIndex

        if (config.showAuthorAvatar && p.avatar && config.showAuthorAvatarText) {
          text = text ? text + '\n' + (config.authorAvatarText || '作者头像：') : (config.authorAvatarText || '作者头像：')
        }
        if (text && config.showImageText) {
          forwardMessages.push(buildForwardNode(session, text, botName))
        }

        if (config.showAuthorAvatar && p.avatar) {
          if (config.showAuthorAvatarFile) {
            forwardMessages.push(buildForwardNode(session, h.image(p.avatar), botName))
          } else {
            forwardMessages.push(buildForwardNode(session, `作者头像链接：${p.avatar}`, botName))
          }
        }

        if (p.cover && config.showCoverImage && p.type !== 'live_photo' && p.type !== 'image') {
          if (config.showCoverText) {
            forwardMessages.push(buildForwardNode(session, config.coverText || '封面：', botName))
          }
          if (config.showCoverFile) {
            forwardMessages.push(buildForwardNode(session, h.image(p.cover), botName))
          } else {
            forwardMessages.push(buildForwardNode(session, `封面链接：${p.cover}`, botName))
          }
        }

        if (config.showMusicCover && p.music.cover) {
          forwardMessages.push(buildForwardNode(session, h.image(p.music.cover), botName))
        }

        if (p.type === 'live_photo' && p.live_photo?.length) {
          for (const lp of p.live_photo) {
            if (config.showImageFileNew) {
              forwardMessages.push(buildForwardNode(session, h.image(lp.image), botName))
            } else {
              forwardMessages.push(buildForwardNode(session, `图片链接：${lp.image}`, botName))
            }
          }
        } else if (p.type === 'image') {
          const imageUrls = p.images?.length ? p.images : (p.live_photo?.map(lp => lp.image) ?? [])
          for (const imgUrl of imageUrls) {
            if (config.showImageFileNew) {
              forwardMessages.push(buildForwardNode(session, h.image(imgUrl), botName))
            } else {
              forwardMessages.push(buildForwardNode(session, `图片链接：${imgUrl}`, botName))
            }
          }
        }

        if (p.video && p.type !== 'live_photo') {
          if (config.showVideoFile) {
            forwardMessages.push(buildForwardNode(session, h.video(p.video), botName))
          } else {
            forwardMessages.push(buildForwardNode(session, `视频链接：${p.video}`, botName))
          }
        }

        if (config.showMusicVoice && p.music.url) {
          if (config.showMusicVoiceFile) {
            forwardMessages.push(buildForwardNode(session, h.audio(p.music.url), botName))
          } else {
            forwardMessages.push(buildForwardNode(session, `音乐链接：${p.music.url}`, botName))
          }
        }
      }

      const MAX_NODES = 50
      for (let i = 0; i < forwardMessages.length; i += MAX_NODES) {
        const batch = forwardMessages.slice(i, i + MAX_NODES)
        try {
          await sendWithTimeout(session, h('message', { forward: true }, batch), config.retryTimes)
        } catch (err) {
          debugLog('ERROR', '合并转发失败，降级逐条发送:', err)
          for (const node of batch) {
            const content = (node as any).__vpContent ?? node.data?.content ?? node.children
            if (Array.isArray(content)) {
              for (const c of content) {
                await sendSafe(session, c, '合并转发降级')
                await delay(200)
              }
            } else {
              await sendSafe(session, content, '合并转发降级')
            }
            await delay(300)
          }
        }
      }
    } else {
      for (let i = 0; i < orderedItems.length; i++) {
        const item = orderedItems[i]
        const p = item.parsed
        const textWithIndex = totalItems > 1 ? `【${i + 1}/${totalItems}】\n${item.text}` : item.text
        let text = textWithIndex
        if (text && config.showImageText) {
          await sendSafe(session, text, '文字内容')
          await delay(300)
        }
        if (config.showAuthorAvatar && p.avatar) {
          if (config.showAuthorAvatarText) await sendSafe(session, config.authorAvatarText || '作者头像：', '作者头像文字')
          await sendMedia(session, p.avatar, 'image', config.showAuthorAvatarFile)
          await delay(300)
        }
        if (p.cover && config.showCoverImage && p.type !== 'live_photo' && p.type !== 'image') {
          if (config.showCoverText) await sendSafe(session, config.coverText || '封面：', '封面文字')
          await sendMedia(session, p.cover, 'image', config.showCoverFile)
          await delay(300)
        }
        if (config.showMusicCover && p.music.cover) {
          await sendMedia(session, p.music.cover, 'image', true)
          await delay(300)
        }
        if (p.type === 'live_photo' && p.live_photo?.length) {
          for (const lp of p.live_photo) {
            await sendMedia(session, lp.image, 'image', config.showImageFileNew)
            await delay(500)
          }
        } else if (p.type === 'image') {
          const imageUrls = p.images?.length ? p.images : (p.live_photo?.map(lp => lp.image) ?? [])
          for (let j = 0; j < imageUrls.length; j++) {
            debugLog('INFO', `[发送] 图片 ${j + 1}/${imageUrls.length}`)
            await sendMedia(session, imageUrls[j], 'image', config.showImageFileNew)
            await delay(1000)
          }
        }
        if (p.video && p.type !== 'live_photo') {
          await sendMedia(session, p.video, 'video', config.showVideoFile)
          await delay(300)
        }
        if (config.showMusicVoice && p.music.url) {
          await sendMedia(session, p.music.url, 'audio', config.showMusicVoiceFile)
          await delay(300)
        }
      }
    }
    debugLog('INFO', '处理完成')
  }

  const customRules = buildCustomLinkRules(config.customPlatforms || [])

  const axiosConfig: AxiosRequestConfig = {
    timeout: config.timeout,
    headers: {
      'User-Agent': config.userAgent,
      'Referer': 'https://www.baidu.com/',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(config.apiKey && config.authMode !== 'query' ? { 'X-API-Key': config.apiKey } : {})
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
      debugLog('INFO', `检测到 ${enabledMatches.length} 个链接`)
      if (config.showWaitingTip) {
        try {
          await sendWithTimeout(session, [h.quote(session.messageId), h.text(getText('waitingTipText'))])
        } catch (e) {
          debugLog('WARN', '等待提示发送失败:', e)
        }
      }
      await flush(session, enabledMatches)
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
      try {
        await sendWithTimeout(session, [h.quote(session?.messageId), h.text(getText('waitingTipText'))])
      } catch {}
    }
    await flush(session, enabledMatches)
  })

  ctx.on('dispose', () => {
    urlCacheLocal.clear()
    dedupCache.clear()
    contentDedupCache.clear()
    deduplication.clear()
    pendingSends.clear()
    processingMessages.clear()
    debugLog('INFO', '插件已卸载')
  })

  debugLog('INFO', '插件初始化完成')
}

