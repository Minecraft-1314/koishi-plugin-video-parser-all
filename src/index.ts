import { Context, Schema, h, Logger } from 'koishi'
import axios, { AxiosInstance } from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { LRUCache } from 'lru-cache'

export const name = 'video-parser-all'

export const Config = Schema.intersect([
  Schema.object({
    enable: Schema.boolean().default(true).description('是否启用视频解析插件'),
    botName: Schema.string().default('视频解析机器人').description('合并转发消息中显示的机器人名称'),
    showWaitingTip: Schema.boolean().default(true).description('解析时显示等待提示'),
    debug: Schema.boolean().default(false).description('开启调试模式，在控制台输出详细日志'),
  }).description('基础设置'),

  Schema.object({
    unifiedMessageFormat: Schema.string().role('textarea').default(
      `标题：${'标题'}\n作者：${'作者'}\n简介：${'简介'}\n点赞：${'点赞数'}\n收藏：${'收藏数'}\n转发：${'转发数'}\n播放：${'播放数'}\n评论：${'评论数'}\n图片数量：${'图片数量'}`
    ).description('统一消息格式，可用变量：${标题} ${作者} ${简介} ${点赞数} ${收藏数} ${转发数} ${播放数} ${评论数} ${视频时长} ${发布时间} ${图片数量} ${作者ID} ${封面}'),
  }).description('消息格式设置'),

  Schema.object({
    showImageText: Schema.boolean().default(true).description('是否发送解析后的文字内容'),
    showVideoFile: Schema.boolean().default(true).description('是否发送视频文件（关闭则只发送视频链接）'),
    maxDescLength: Schema.number().min(0).step(1).default(200).description('简介内容最大长度（字符），超出自动截断'),
    videoDownloadTimeout: Schema.number().min(0).step(1).default(120000).description('视频下载超时（毫秒）'),
    tempDir: Schema.string().default('./temp_videos').description('临时视频存储目录'),
    maxVideoSize: Schema.number().min(0).step(1).default(0).description('最大下载视频大小（MB），0 为不限制大小'),
    forceDownloadVideo: Schema.boolean().default(false).description('强制下载视频后发送'),
  }).description('内容显示设置'),

  Schema.object({
    timeout: Schema.number().min(0).step(1).default(180000).description('API 请求超时（毫秒）'),
    videoSendTimeout: Schema.number().min(0).step(1).default(60000).description('视频消息发送超时（毫秒，0 为不限制）'),
    userAgent: Schema.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36').description('API 请求 UA'),
  }).description('网络与 API 设置'),

  Schema.object({
    ignoreSendError: Schema.boolean().default(true).description('忽略消息发送失败，避免插件崩溃'),
    retryTimes: Schema.number().min(0).step(1).default(3).description('API 请求及消息发送失败时的重试次数'),
    retryInterval: Schema.number().min(0).step(1).default(1000).description('重试间隔（毫秒，同时用于消息发送重试）'),
  }).description('错误与重试设置'),

  Schema.object({
    enableForward: Schema.boolean().default(false).description('启用合并转发（仅 OneBot 平台）'),
  }).description('发送方式设置'),

  Schema.object({
    primaryApiUrl: Schema.string().default('https://api.bugpk.com/api/short_videos').description('主 API 地址'),
    backupApiUrl: Schema.string().default('https://api.bugpk.com/api/svparse').description('备用主 API 地址（仅支持抖音/小红书/ins/即梦）'),
    platformDedicatedFirst: Schema.object({
      bilibili: Schema.boolean().default(false).description('哔哩哔哩'),
      douyin: Schema.boolean().default(false).description('抖音'),
      kuaishou: Schema.boolean().default(false).description('快手'),
      xiaohongshu: Schema.boolean().default(false).description('小红书'),
      weibo: Schema.boolean().default(false).description('微博'),
      xigua: Schema.boolean().default(false).description('西瓜视频'),
      youtube: Schema.boolean().default(false).description('YouTube'),
      tiktok: Schema.boolean().default(false).description('TikTok'),
      acfun: Schema.boolean().default(false).description('AcFun'),
      zhihu: Schema.boolean().default(false).description('知乎'),
      weishi: Schema.boolean().default(false).description('微视'),
      huya: Schema.boolean().default(false).description('虎牙'),
      haokan: Schema.boolean().default(false).description('好看视频'),
      meipai: Schema.boolean().default(false).description('美拍'),
      twitter: Schema.boolean().default(false).description('Twitter/X'),
      instagram: Schema.boolean().default(false).description('Instagram'),
      doubao: Schema.boolean().default(false).description('豆包'),
    }).description('各平台独立开关：是否优先使用专属 API'),
    customApis: Schema.array(
      Schema.object({
        platform: Schema.union([
          Schema.const('bilibili').description('哔哩哔哩'),
          Schema.const('douyin').description('抖音'),
          Schema.const('kuaishou').description('快手'),
          Schema.const('xiaohongshu').description('小红书'),
          Schema.const('weibo').description('微博'),
          Schema.const('xigua').description('西瓜视频'),
          Schema.const('youtube').description('YouTube'),
          Schema.const('tiktok').description('TikTok'),
          Schema.const('acfun').description('AcFun'),
          Schema.const('zhihu').description('知乎'),
          Schema.const('weishi').description('微视'),
          Schema.const('huya').description('虎牙'),
          Schema.const('haokan').description('好看视频'),
          Schema.const('meipai').description('美拍'),
          Schema.const('twitter').description('Twitter/X'),
          Schema.const('instagram').description('Instagram'),
          Schema.const('doubao').description('豆包'),
        ]).description('选择平台'),
        apiUrl: Schema.string().description('API 地址'),
      })
    ).default([]).description('自定义平台专属 API 地址，留空则使用内置默认专属 API'),
  }).description('API 选择设置'),

  Schema.object({
    waitingTipText: Schema.string().default('正在解析视频，请稍候...').description('解析等待提示'),
    unsupportedPlatformText: Schema.string().default('不支持该平台链接').description('不支持的平台提示'),
    invalidLinkText: Schema.string().default('无效的视频链接').description('无效链接提示（parse 指令）'),
    parseErrorPrefix: Schema.string().default('❌ 解析失败：').description('解析失败消息前缀'),
    parseErrorItemFormat: Schema.string().default('【${url}】: ${msg}').description('每条解析失败格式，可用 ${url}（链接）和 ${msg}（错误信息）'),
  }).description('界面文字设置'),
])

interface VideoQuality {
  quality: string
  url: string
  bit_rate?: number
}

interface ParsedData {
  type: string
  title: string
  desc: string
  author: string
  uid: string
  avatar: string
  cover: string
  video: string
  videos: VideoQuality[]
  images: string[]
  live_photo: Array<{ image: string; video: string }>
  music: { title?: string; author?: string; cover?: string; url?: string }
  like: number
  comment: number
  collect: number
  share: number
  play: number
  duration: number
  publishTime: number
}

const logger = new Logger(name)
let debugEnabled = false

function debugLog(level: string, ...args: any[]) {
  if (!debugEnabled) return
  const timestamp = new Date().toISOString()
  const message = `[${timestamp}] [${level}] ${args.map(a => {
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a, null, 2)
      } catch {
        return String(a)
      }
    }
    return String(a)
  }).join(' ')}`
  logger.info(message)
}

interface LinkMatch {
  type: string
  url: string
  id: string
}

const urlCache = new LRUCache<string, { data: ParsedData; expire: number }>({
  max: 500,
  ttl: 10 * 60 * 1000,
  updateAgeOnGet: false,
})

function linkTypeParser(content: string): LinkMatch[] {
  content = content.replace(/\\\//g, '/')
  const rules: { pattern: RegExp; type: string }[] = [
    { pattern: /https?:\/\/(?:www\.)?bilibili\.com\/video\/([ab]v[0-9a-zA-Z_-]+)/gi, type: 'bilibili' },
    { pattern: /https?:\/\/b23\.tv\/[0-9a-zA-Z_-]{5,}/gi, type: 'bilibili' },
    { pattern: /https?:\/\/bili\d+\.cn\/[0-9a-zA-Z_-]{5,}/gi, type: 'bilibili' },
    { pattern: /https?:\/\/(?:www\.)?douyin\.com\/video\/\d{10,}/gi, type: 'douyin' },
    { pattern: /https?:\/\/v\.douyin\.com\/[0-9a-zA-Z_-]{8,}/gi, type: 'douyin' },
    { pattern: /https?:\/\/(?:www\.)?kuaishou\.com\/short-video\/[0-9a-zA-Z_-]{10,}/gi, type: 'kuaishou' },
    { pattern: /https?:\/\/v\.kuaishou\.com\/[0-9a-zA-Z_-]{8,}/gi, type: 'kuaishou' },
    { pattern: /https?:\/\/(?:www\.)?xiaohongshu\.com\/discovery\/item\/[0-9a-zA-Z_-]{10,}/gi, type: 'xiaohongshu' },
    { pattern: /https?:\/\/xhslink\.com\/[0-9a-zA-Z_-]{8,}/gi, type: 'xiaohongshu' },
    { pattern: /https?:\/\/weibo\.com\/\d+\/[0-9a-zA-Z_-]{10,}/gi, type: 'weibo' },
    { pattern: /https?:\/\/video\.weibo\.com\/show\?fid=[0-9a-zA-Z_-]{10,}/gi, type: 'weibo' },
    { pattern: /https?:\/\/(?:www\.)?ixigua\.com\/\d{10,}/gi, type: 'xigua' },
    { pattern: /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/gi, type: 'youtube' },
    { pattern: /https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/gi, type: 'youtube' },
    { pattern: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/\d{10,}/gi, type: 'tiktok' },
    { pattern: /https?:\/\/vm\.tiktok\.com\/[0-9a-zA-Z_-]{8,}/gi, type: 'tiktok' },
    { pattern: /https?:\/\/(?:www\.)?acfun\.cn\/v\/ac\d{10,}/gi, type: 'acfun' },
    { pattern: /https?:\/\/(?:www\.)?zhihu\.com\/video\/\d{10,}/gi, type: 'zhihu' },
    { pattern: /https?:\/\/weishi\.qq\.com\/weishi\/feed\/[0-9a-zA-Z_-]{10,}/gi, type: 'weishi' },
    { pattern: /https?:\/\/(?:www\.)?huya\.com\/video\/[0-9a-zA-Z_-]{10,}/gi, type: 'huya' },
    { pattern: /https?:\/\/haokan\.baidu\.com\/v\?vid=[0-9a-zA-Z_-]{10,}/gi, type: 'haokan' },
    { pattern: /https?:\/\/(?:www\.)?meipai\.com\/media\/\d{10,}/gi, type: 'meipai' },
    { pattern: /https?:\/\/twitter\.com\/\w+\/status\/\d{10,}/gi, type: 'twitter' },
    { pattern: /https?:\/\/x\.com\/\w+\/status\/\d{10,}/gi, type: 'twitter' },
    { pattern: /https?:\/\/(?:www\.)?instagram\.com\/p\/[0-9a-zA-Z_-]{10,}/gi, type: 'instagram' },
    { pattern: /https?:\/\/(?:www\.)?doubao\.com\/video\/\d{10,}/gi, type: 'doubao' },
  ]

  const matches: LinkMatch[] = []
  const seen = new Set<string>()

  for (const rule of rules) {
    let match: RegExpExecArray | null
    rule.pattern.lastIndex = 0
    while ((match = rule.pattern.exec(content)) !== null) {
      const url = match[0]
      if (seen.has(url)) continue
      seen.add(url)
      matches.push({ type: rule.type, url, id: match[1] || url })
    }
  }
  return matches
}

function extractAllUrlsFromMessage(session: any): LinkMatch[] {
  const content = session.content?.trim() || ''
  const matchedLinks = linkTypeParser(content)

  const cardsContent: string[] = []
  if (session.elements) {
    for (const elem of session.elements) {
      if (elem.type === 'xml' && elem.data) {
        cardsContent.push(elem.data)
      } else if (elem.type === 'json' && elem.data) {
        try {
          const json = JSON.parse(elem.data)
          const extract = (obj: any) => {
            if (!obj || typeof obj !== 'object') return
            for (const val of Object.values(obj)) {
              if (typeof val === 'string') {
                cardsContent.push(val)
              } else if (typeof val === 'object') extract(val)
            }
          }
          extract(json)
        } catch {}
      }
    }
  }

  for (const cardContent of cardsContent) {
    const cardLinks = linkTypeParser(cardContent)
    matchedLinks.push(...cardLinks)
  }

  const seen = new Set<string>()
  const result: LinkMatch[] = []
  for (const link of matchedLinks) {
    if (!seen.has(link.url)) {
      seen.add(link.url)
      result.push(link)
    }
  }
  return result
}

function cleanUrl(url: string): string {
  try {
    url = url.replace(/&amp;/g, '&')
    const urlObj = new URL(url)
    
    if (urlObj.protocol === 'http:') {
      urlObj.protocol = 'https:'
    }

    if (urlObj.hostname.includes('douyin.com') || urlObj.hostname.includes('v.douyin.com')) {
      ['source', 'share_type', 'share_token', 'timestamp', 'from', 'isappinstalled'].forEach(p => {
        urlObj.searchParams.delete(p)
      })
      return urlObj.origin + urlObj.pathname
    }
    
    if (urlObj.hostname.includes('bilibili.com') || urlObj.hostname.includes('b23.tv')) {
      ['share_source', 'share_medium', 'share_plat', 'share_session_id', 'share_tag', 'timestamp'].forEach(p => {
        urlObj.searchParams.delete(p)
      })
      return urlObj.origin + urlObj.pathname
    }

    return urlObj.toString()
  } catch (e) {
    debugLog('WARN', '清理URL失败:', e, '原始URL:', url)
    return url.replace(/&amp;/g, '&').replace(/\?.*/, '')
  }
}

async function resolveShortUrl(url: string): Promise<string> {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.baidu.com/',
      },
      validateStatus: (status: number) => status >= 200 && status < 400,
    })
    const finalUrl = (res.request as any)?.res?.responseUrl || url
    return cleanUrl(finalUrl)
  } catch (e) {
    debugLog('WARN', '解析短链接失败:', e, '原始URL:', url)
    return cleanUrl(url)
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatPublishTime(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const y = d.getFullYear(), mo = (d.getMonth() + 1).toString().padStart(2, '0'), day = d.getDate().toString().padStart(2, '0'), H = d.getHours().toString().padStart(2, '0'), i = d.getMinutes().toString().padStart(2, '0')
  return `${y}年${mo}月${day}日 ${H}:${i}`
}

function pickBestQuality(videoBackup: any[]): VideoQuality[] {
  if (!Array.isArray(videoBackup)) return []
  return videoBackup
    .filter(v => v && v.url)
    .map(v => ({ 
      quality: v.quality || v.label || 'unknown', 
      url: v.url, 
      bit_rate: Number(v.bit_rate || 0) 
    }))
    .sort((a, b) => b.bit_rate - a.bit_rate)
}

function parseApiResponse(raw: any, maxDescLen: number): ParsedData {
  debugLog('DEBUG', '原始API返回数据:', raw)
  const data = raw?.data || {}
  const extra = data.extra || {}

  let type = data.type || ''
  if (!type) {
    if (data.images?.length > 0 && !data.url) type = 'image'
    else if (data.live_photo?.length > 0) type = 'live_photo'
    else if (raw.msg === 'live' || data.live) type = 'live'
    else type = 'video'
  }

  const authorObj = data.author
  let author = '', uid = '', avatar = ''
  if (authorObj && typeof authorObj === 'object') {
    author = authorObj.name || authorObj.author || ''
    uid = String(authorObj.id || data.uid || '')
    avatar = authorObj.avatar || data.avatar || ''
  } else {
    author = data.author || data.auther || ''
    uid = String(data.uid || '')
    avatar = data.avatar || ''
  }

  const title = data.title || ''
  const desc = (data.desc || data.description || '').slice(0, maxDescLen).trim()
  const cover = data.cover || ''

  let video = ''
  let videos: VideoQuality[] = []
  
  if (Array.isArray(data.video_backup) && data.video_backup.length) {
    const bestQ = pickBestQuality(data.video_backup)
    videos = bestQ
    video = bestQ[0]?.url || ''
  }
  
  if (!video && Array.isArray(data.videos) && data.videos.length) {
    const validVideos = data.videos.filter((v: any) => v && v.url)
    if (validVideos.length) {
      video = validVideos[0].url
      videos = validVideos.map((v: any) => ({ 
        quality: v.accept?.[0] || 'unknown', 
        url: v.url 
      }))
    }
  }
  
  if (!video && data.url) {
    video = data.url
  }
  
  if (video && !video.startsWith('http')) {
    video = 'https:' + video
  }

  const images: string[] = Array.isArray(data.images) 
    ? data.images.filter((img: any) => img && typeof img === 'string').map((img: any) => {
        if (!img.startsWith('http')) return 'https:' + img
        return img
      }) 
    : []
  
  const live_photo = Array.isArray(data.live_photo) 
    ? data.live_photo.filter((lp: any) => lp && lp.image).map((lp: any) => ({
        image: lp.image.startsWith('http') ? lp.image : 'https:' + lp.image,
        video: lp.video ? (lp.video.startsWith('http') ? lp.video : 'https:' + lp.video) : ''
      })) 
    : []

  const music = {
    title: data.music?.title || data.music?.name || '',
    author: data.music?.author || data.music?.artist || '',
    cover: data.music?.cover || '',
    url: data.music?.url || ''
  }

  const stats = extra.statistics || {}
  const like = Number(data.like ?? stats.digg_count ?? 0)
  const comment = Number(stats.comment_count ?? 0)
  const collect = Number(stats.collect_count ?? 0)
  const share = Number(stats.share_count ?? 0)
  const play = Number(stats.play_count ?? 0)

  let duration = 0
  if (data.duration) {
    duration = typeof data.duration === 'string' ? parseInt(data.duration, 10) : data.duration
    if (duration > 1000000) duration = Math.floor(duration / 1000)
  } else if (extra.duration_ms) {
    duration = Math.floor(extra.duration_ms / 1000)
  }

  let publishTime = 0
  if (data.time) {
    publishTime = typeof data.time === 'number' ? data.time : parseInt(data.time, 10)
    if (publishTime < 1000000000000) publishTime *= 1000
  } else if (extra.create_time) {
    publishTime = extra.create_time * 1000
  }

  return {
    type, title, desc, author, uid, avatar, cover,
    video, videos, images, live_photo, music,
    like, comment, collect, share, play,
    duration, publishTime
  }
}

function generateFormattedText(p: ParsedData, format: string): string {
  const imageCount = p.images.length || p.live_photo.length
  const vars: Record<string, string> = {
    '标题': p.title,
    '作者': p.author,
    '简介': p.desc,
    '视频时长': p.duration > 0 ? formatDuration(p.duration) : '',
    '点赞数': String(p.like),
    '收藏数': String(p.collect),
    '转发数': String(p.share),
    '播放数': String(p.play),
    '评论数': String(p.comment),
    '发布时间': p.publishTime ? formatPublishTime(p.publishTime) : '',
    '图片数量': String(imageCount),
    '作者ID': p.uid,
    '封面': p.cover,
    '视频链接': p.video,
  }

  const lines = format.split('\n')
  const resultLines: string[] = []

  for (const line of lines) {
    const varMatches = line.match(/\$\{([^}]+)\}/g)
    if (varMatches) {
      let allEmpty = true
      for (const match of varMatches) {
        const varName = match.replace(/\$\{|\}/g, '')
        const val = vars[varName]
        if (val && val !== '0') {
          allEmpty = false
          break
        }
      }
      if (allEmpty) continue
    }
    let newLine = line
    for (const [key, value] of Object.entries(vars)) {
      newLine = newLine.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value)
    }
    resultLines.push(newLine)
  }

  return resultLines.join('\n').trim()
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function buildForwardNode(session: any, content: any, botName: string) {
  let messageContent: any[]
  if (Array.isArray(content)) messageContent = content
  else if (content && typeof content === 'object' && content.type) messageContent = [content]
  else messageContent = [h.text(String(content))]
  return h('node', { 
    user: { 
      nickname: botName.substring(0, 15), 
      user_id: session.selfId 
    } 
  }, messageContent)
}

async function downloadVideoFile(videoUrl: string, tempDir: string, timeout: number, maxSizeMB: number): Promise<string> {
  if (!videoUrl) throw new Error('视频链接为空')

  await fs.mkdir(tempDir, { recursive: true })
  const fileName = `video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`
  const filePath = path.resolve(tempDir, fileName)
  
  debugLog('INFO', `开始下载视频: ${videoUrl.substring(0, 100)}...`)
  debugLog('INFO', `临时文件路径: ${filePath}`)

  const writer = createWriteStream(filePath)
  let response
  
  try {
    response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    })
  } catch (e) {
    writer.destroy()
    await fs.unlink(filePath).catch(() => {})
    throw new Error(`下载视频失败: ${getErrorMessage(e)}`)
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  const contentLength = Number(response.headers['content-length'] || 0)
  
  if (maxSizeMB > 0 && contentLength > maxSizeBytes) {
    writer.destroy()
    await fs.unlink(filePath).catch(() => {})
    throw new Error(`视频文件过大(${Math.round(contentLength/1024/1024)}MB)，超过限制(${maxSizeMB}MB)`)
  }

  try {
    await pipeline(response.data, writer)
    debugLog('INFO', `视频下载完成`)
    return filePath
  } catch (e) {
    await fs.unlink(filePath).catch(() => {})
    throw new Error(`写入视频文件失败: ${getErrorMessage(e)}`)
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function apply(ctx: Context, config: any) {
  debugEnabled = config.debug || false
  debugLog('INFO', '插件初始化开始')

  const texts = {
    waitingTipText: config.waitingTipText || '正在解析视频，请稍候...',
    unsupportedPlatformText: config.unsupportedPlatformText || '不支持该平台链接',
    invalidLinkText: config.invalidLinkText || '无效的视频链接',
    parseErrorPrefix: config.parseErrorPrefix || '❌ 解析失败：',
    parseErrorItemFormat: config.parseErrorItemFormat || '【${url}】: ${msg}',
  }

  const http: AxiosInstance = axios.create({
    timeout: config.timeout,
    headers: {
      'User-Agent': config.userAgent,
      'Referer': 'https://www.baidu.com/',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  const defaultDedicatedApis: Record<string, string> = {
    bilibili: 'https://api.bugpk.com/api/bilibili',
    douyin: 'https://api.bugpk.com/api/douyin',
    doubao: 'https://api.bugpk.com/api/dbvideos',
    kuaishou: 'https://api.bugpk.com/api/kuaishou',
    xiaohongshu: 'https://api.bugpk.com/api/xhs',
    jimeng: 'https://api.bugpk.com/api/jimengai',
    toutiao: 'https://api.bugpk.com/api/toutiao',
    weibo: 'https://api.bugpk.com/api/weibo',
    huya: 'https://api.bugpk.com/api/huya',
    pipigx: 'https://api.bugpk.com/api/pipigx',
    pipixia: 'https://api.bugpk.com/api/pipixia',
    zuiyou: 'https://api.bugpk.com/api/zuiyou',
  }

  const backupSupportedPlatforms = new Set(['douyin', 'xiaohongshu', 'instagram', 'jimeng'])

  function getPlatformConfig(type: string): { apiUrl: string | null, dedicatedFirst: boolean } {
    const custom = config.customApis?.find((item: any) => item.platform === type)
    let apiUrl = defaultDedicatedApis[type] || null
    if (custom && custom.apiUrl) {
      apiUrl = custom.apiUrl
    }

    const dedicatedFirst = config.platformDedicatedFirst?.[type] ?? false
    return { apiUrl, dedicatedFirst }
  }

  async function fetchApi(url: string, type: string): Promise<ParsedData> {
    const cacheKey = url
    const cached = urlCache.get(cacheKey)
    if (cached && cached.expire > Date.now()) {
      debugLog('DEBUG', `使用缓存: ${url}`)
      return cached.data
    }

    const { apiUrl: dedicatedUrl, dedicatedFirst } = getPlatformConfig(type)
    const primaryApi = config.primaryApiUrl || 'https://api.bugpk.com/api/short_videos'
    const backupApi = config.backupApiUrl || 'https://api.bugpk.com/api/svparse'
    const backupAllowed = backupSupportedPlatforms.has(type)

    const apiList: Array<{ url: string; label: string }> = []

    if (dedicatedFirst && dedicatedUrl) {
      apiList.push({ url: dedicatedUrl, label: `专属API(${type})` })
      apiList.push({ url: primaryApi, label: '默认主API' })
      if (backupAllowed) apiList.push({ url: backupApi, label: '备用主API' })
    } else {
      apiList.push({ url: primaryApi, label: '默认主API' })
      if (backupAllowed) apiList.push({ url: backupApi, label: '备用主API' })
      if (dedicatedUrl) apiList.push({ url: dedicatedUrl, label: `专属API(${type})` })
    }

    let lastError: Error | null = null

    for (const api of apiList) {
      for (let attempt = 0; attempt <= config.retryTimes; attempt++) {
        try {
          const res = await http.get(api.url, {
            params: { url },
            timeout: config.timeout
          })
          if (res.data && (res.data.code === 200 || res.data.code === 0)) {
            const parsed = parseApiResponse(res.data, config.maxDescLength)
            urlCache.set(cacheKey, { data: parsed, expire: Date.now() + 10 * 60 * 1000 })
            return parsed
          }
          throw new Error(res.data?.msg || `API返回错误码: ${res.data?.code}`)
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          debugLog('ERROR', `${api.label} 第${attempt+1}次请求失败: ${lastError.message}`)
          if (attempt < config.retryTimes) {
            await delay(config.retryInterval)
          }
        }
      }
      debugLog('WARN', `${api.label} 所有重试均失败，切换下一个API`)
    }

    throw lastError || new Error('所有API请求全部失败')
  }

  async function parseUrl(url: string, type: string): Promise<{ success: true; data: ParsedData } | { success: false; msg: string }> {
    const realUrl = await resolveShortUrl(url)
    const candidates = [realUrl, url]
    for (const candidate of [...new Set(candidates)]) {
      try {
        const info = await fetchApi(candidate, type)
        if (info.video || info.images.length > 0) {
          return { success: true, data: info }
        }
        debugLog('WARN', `解析成功但无有效内容: ${candidate}`)
      } catch (error) {
        debugLog('ERROR', `候选链接解析失败: ${candidate}`, getErrorMessage(error))
      }
    }
    return { success: false, msg: texts.unsupportedPlatformText }
  }

  async function processSingleUrl(url: string, type: string): Promise<
    { success: true; data: { text: string; parsed: ParsedData } } | 
    { success: false; msg: string; url: string }
  > {
    const result = await parseUrl(url, type)
    if (!result.success) {
      return { success: false, msg: result.msg, url }
    }
    
    const text = generateFormattedText(result.data, config.unifiedMessageFormat)
    
    return { 
      success: true, 
      data: { 
        text, 
        parsed: result.data
      } 
    }
  }

  async function sendWithTimeout(session: any, content: any, customRetries?: number): Promise<any> {
    const maxRetries = customRetries ?? config.retryTimes ?? 3
    const retryDelay = config.retryInterval || 1000
    let timeoutId: NodeJS.Timeout | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let sendPromise = session.send(content)
        if (config.videoSendTimeout > 0) {
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('发送超时')), config.videoSendTimeout)
          })
          const result = await Promise.race([sendPromise, timeoutPromise])
          if (timeoutId) clearTimeout(timeoutId)
          return result
        } else {
          return await sendPromise
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId)
        const errMsg = getErrorMessage(err)
        debugLog('ERROR', `第${attempt + 1}次发送失败: ${errMsg}`)
        if (attempt < maxRetries) {
          debugLog('INFO', `等待 ${retryDelay}ms 后进行第 ${attempt + 2} 次重试`)
          await delay(retryDelay)
        } else {
          if (!config.ignoreSendError) throw err
          return null
        }
      }
    }
    return null
  }

  async function sendVideoFile(session: any, videoUrl: string): Promise<any> {
    if (!videoUrl) return

    if (!config.showVideoFile) {
      return await sendWithTimeout(session, `视频链接：${videoUrl}`)
    }

    const sendLink = async () => {
      await sendWithTimeout(session, `视频链接：${videoUrl}`).catch(() => {})
    }

    if (config.forceDownloadVideo) {
      try {
        const tempFilePath = await downloadVideoFile(
          videoUrl,
          config.tempDir || './temp_videos',
          config.videoDownloadTimeout || 120000,
          config.maxVideoSize || 0
        )
        const localFile = `file://${tempFilePath}`
        await sendWithTimeout(session, h.video(localFile))
        return
      } catch (e) {
        debugLog('ERROR', '强制下载失败，尝试直接发送URL:', getErrorMessage(e))
        try {
          await sendWithTimeout(session, h.video(videoUrl))
          return
        } catch (urlErr) {
          debugLog('ERROR', '发送URL也失败，降级发送链接:', getErrorMessage(urlErr))
          await sendLink()
        }
      }
      return
    }

    try {
      debugLog('INFO', '尝试直接发送视频URL')
      await sendWithTimeout(session, h.video(videoUrl))
      return
    } catch (urlErr) {
      debugLog('ERROR', '直接发送URL失败，尝试下载:', getErrorMessage(urlErr))
      try {
        const tempFilePath = await downloadVideoFile(
          videoUrl,
          config.tempDir || './temp_videos',
          config.videoDownloadTimeout || 120000,
          config.maxVideoSize || 0
        )
        const localFile = `file://${tempFilePath}`
        await sendWithTimeout(session, h.video(localFile))
        return
      } catch (downloadErr) {
        debugLog('ERROR', '下载失败，降级发送链接:', getErrorMessage(downloadErr))
        await sendLink()
      }
    }
  }

  async function flush(session: any, matches: LinkMatch[]) {
    debugLog('INFO', `开始解析 ${matches.length} 个链接`)
    
    const items: { text: string; parsed: ParsedData }[] = []
    const errors: string[] = []

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      debugLog('INFO', `正在解析第 ${i+1}/${matches.length} 个链接: ${match.url} (平台: ${match.type})`)
      
      const result = await processSingleUrl(match.url, match.type)
      if (result.success) {
        items.push(result.data)
      } else {
        const item = texts.parseErrorItemFormat
          .replace(/\$\{url\}/g, match.url.length > 50 ? match.url.slice(0,50)+'...' : match.url)
          .replace(/\$\{msg\}/g, result.msg)
        errors.push(item)
      }
      
      if (i < matches.length - 1) {
        await delay(500)
      }
    }

    if (errors.length) {
      await sendWithTimeout(session, `${texts.parseErrorPrefix}\n${errors.join('\n')}`)
      await delay(500)
    }
    
    if (!items.length) {
      debugLog('INFO', '没有成功解析的内容')
      return
    }

    const enableForward = config.enableForward && session.platform === 'onebot'
    const botName = config.botName || '视频解析机器人'

    if (enableForward) {
      const forwardMessages: any[] = []

      for (const item of items) {
        const p = item.parsed
        const text = item.text

        if (text && config.showImageText) {
          forwardMessages.push(buildForwardNode(session, text, botName))
        }
        if (p.cover && p.type !== 'live_photo' && !(p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          forwardMessages.push(buildForwardNode(session, h.image(p.cover), botName))
        }
        if (p.type === 'image' || p.type === 'live_photo' || (p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          const imageUrls = p.images?.length ? p.images : (p.live_photo?.map(lp => lp.image) ?? [])
          for (const imgUrl of imageUrls) {
            forwardMessages.push(buildForwardNode(session, h.image(imgUrl), botName))
          }
        }
        if (p.video) {
          forwardMessages.push(buildForwardNode(session, h.video(p.video), botName))
        }
      }

      if (forwardMessages.length) {
        const forwardMsg = h('message', { forward: true }, forwardMessages.slice(0, 100))
        try {
          debugLog('INFO', `发送合并转发消息，包含 ${forwardMessages.length} 条内容`)
          await sendWithTimeout(session, forwardMsg, config.retryTimes)
        } catch (err) {
          debugLog('ERROR', '合并转发发送失败，降级为逐条发送:', err)
          for (const node of forwardMessages) {
            await sendWithTimeout(session, node.data.content).catch(() => {})
            await delay(300)
          }
        }
      }
    } else {
      for (const item of items) {
        const p = item.parsed
        const text = item.text

        if (text && config.showImageText) {
          await sendWithTimeout(session, text)
          await delay(300)
        }
        if (p.cover && p.type !== 'live_photo' && !(p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          await sendWithTimeout(session, h.image(p.cover)).catch(() => {})
          await delay(300)
        }
        if (p.video && (p.type === 'video' || (p.type === 'live' && !p.live_photo?.length && !p.images?.length))) {
          if (config.showVideoFile) {
            try {
              await sendVideoFile(session, p.video)
            } catch (e) {
              debugLog('ERROR', `视频发送失败: ${getErrorMessage(e)}`)
            }
          } else {
            await sendWithTimeout(session, `视频链接：${p.video}`)
          }
          await delay(500)
        }
        if (p.type === 'image' || p.type === 'live_photo' || (p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          const imageUrls = p.images?.length ? p.images : (p.live_photo?.map(lp => lp.image) ?? [])
          for (const imgUrl of imageUrls) {
            await sendWithTimeout(session, h.image(imgUrl)).catch(() => {})
            await delay(200)
          }
        }
      }
    }
    
    debugLog('INFO', '所有内容处理完成')
  }

  ctx.on('message', async (session) => {
    if (!config.enable) return

    if (session.subtype === 'file_upload') return
    if (session.elements?.some(elem => elem.type === 'file' || elem.type === 'folder')) return
    if (session.selfId === session.userId) return

    const matches = extractAllUrlsFromMessage(session)
    if (!matches.length) return

    debugLog('INFO', `检测到 ${matches.length} 个链接，开始处理`)

    if (config.showWaitingTip) {
      try { 
        await sendWithTimeout(session, texts.waitingTipText) 
      } catch (e) {
        debugLog('WARN', '发送等待提示失败:', e)
      }
    }
    
    await flush(session, matches)
  })

  ctx.command('parse <url>', '手动解析视频').action(async ({ session }, url) => {
    if (!url) {
      await sendWithTimeout(session, texts.invalidLinkText)
      return
    }
    
    const matches = linkTypeParser(url)
    if (!matches.length) {
      await sendWithTimeout(session, texts.invalidLinkText)
      return
    }
    
    if (config.showWaitingTip) {
      try { 
        await sendWithTimeout(session, texts.waitingTipText) 
      } catch {}
    }
    
    await flush(session, matches)
  })

  const tempCleanupInterval = setInterval(async () => {
    try {
      const tempDir = config.tempDir || './temp_videos'
      const files = await fs.readdir(tempDir)
      const now = Date.now()
      let deletedCount = 0
      
      for (const file of files) {
        if (file.startsWith('video_') && file.endsWith('.mp4')) {
          const filePath = path.join(tempDir, file)
          const stats = await fs.stat(filePath)
          if (now - stats.mtimeMs > 3600000) {
            await fs.unlink(filePath).catch(() => {})
            deletedCount++
          }
        }
      }
      
      if (deletedCount > 0) {
        debugLog('INFO', `清理了 ${deletedCount} 个过期临时视频文件`)
      }
    } catch (e) {
      debugLog('WARN', '清理临时文件失败:', e)
    }
  }, 3600000)

  ctx.on('dispose', () => {
    clearInterval(tempCleanupInterval)
    urlCache.clear()
    debugLog('INFO', '插件已卸载，资源已清理')
  })

  process.on('exit', async () => {
    try {
      const tempDir = config.tempDir || './temp_videos'
      const files = await fs.readdir(tempDir)
      for (const file of files) {
        if (file.startsWith('video_') && file.endsWith('.mp4')) {
          await fs.unlink(path.join(tempDir, file)).catch(() => {})
        }
      }
      debugLog('INFO', '进程退出，已清理所有临时视频文件')
    } catch {}
  })

  debugLog('INFO', '插件初始化完成')
}