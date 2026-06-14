import { Context, Schema, h, Logger } from 'koishi'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { randomBytes } from 'crypto'

declare module 'koishi' {
  interface Context {
    downloads?: {
      download(url: string, dest: string, options?: Record<string, unknown>): Promise<string>
    }
  }
}

class SimpleLRUCache<V> {
  private map = new Map<string, { value: V; expireAt: number }>()
  constructor(private max: number, private ttlMs: number) {}
  get(key: string): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expireAt) {
      this.map.delete(key)
      return undefined
    }
    return entry.value
  }
  set(key: string, value: V): void {
    this.map.delete(key)
    while (this.map.size >= this.max) {
      const k = this.map.keys().next().value
      if (k === undefined) break
      this.map.delete(k)
    }
    this.map.set(key, { value, expireAt: Date.now() + this.ttlMs })
  }
  clear(): void {
    this.map.clear()
  }
}

class ConcurrencyLimiter {
  private running = 0
  private queue: (() => void)[] = []
  constructor(private max: number) {}
  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++
      return
    }
    return new Promise(resolve => {
      this.queue.push(() => {
        this.running++
        resolve()
      })
    })
  }
  release(): void {
    this.running--
    const next = this.queue.shift()
    if (next) next()
  }
}

export const name = 'video-parser-all'

export const Config = Schema.intersect([
  Schema.object({
    enable: Schema.boolean().default(true).description('是否启用视频解析插件'),
    botName: Schema.string().default('视频解析机器人').description('合并转发中显示的昵称'),
    showWaitingTip: Schema.boolean().default(true).description('解析时显示等待提示'),
    debug: Schema.boolean().default(false).description('开启调试日志'),
    platformEnabled: Schema.object({
      bilibili: Schema.boolean().default(true).description('哔哩哔哩'),
      douyin: Schema.boolean().default(true).description('抖音'),
      kuaishou: Schema.boolean().default(true).description('快手'),
      xiaohongshu: Schema.boolean().default(true).description('小红书'),
      weibo: Schema.boolean().default(true).description('微博'),
      xigua: Schema.boolean().default(true).description('西瓜视频'),
      youtube: Schema.boolean().default(true).description('YouTube'),
      tiktok: Schema.boolean().default(true).description('TikTok'),
      acfun: Schema.boolean().default(true).description('AcFun（A站）'),
      zhihu: Schema.boolean().default(true).description('知乎'),
      weishi: Schema.boolean().default(true).description('微视'),
      huya: Schema.boolean().default(true).description('虎牙'),
      haokan: Schema.boolean().default(true).description('好看视频'),
      meipai: Schema.boolean().default(true).description('美拍'),
      twitter: Schema.boolean().default(true).description('Twitter/X'),
      instagram: Schema.boolean().default(true).description('Instagram'),
      doubao: Schema.boolean().default(true).description('豆包'),
      oasis: Schema.boolean().default(true).description('绿洲'),
      wechat_channel: Schema.boolean().default(true).description('视频号'),
      lishi: Schema.boolean().default(true).description('梨视频'),
      quanmin: Schema.boolean().default(true).description('全民直播'),
      pipigx: Schema.boolean().default(true).description('皮皮搞笑'),
      pipixia: Schema.boolean().default(true).description('皮皮虾'),
      zuiyou: Schema.boolean().default(true).description('最右'),
    }).description('各平台解析开关'),
  }).description('基本设置'),

  Schema.object({
    unifiedMessageFormat: Schema.string().role('textarea').default(
      '标题：${标题}\n作者：${作者}\n简介：${简介}\n音乐标题：${音乐标题}\n音乐作者：${音乐作者}\n点赞：${点赞数}\n收藏：${收藏数}\n转发：${转发数}\n播放：${播放数}\n评论：${评论数}\n图片数量：${图片数量}'
    ).description('文字格式，支持变量，空行自动隐藏'),
  }).description('消息格式'),

  Schema.object({
    showImageText: Schema.boolean().default(true).description('发送文字内容'),
    showCoverImage: Schema.boolean().default(true).description('发送封面图片'),
    showMusicCover: Schema.boolean().default(true).description('发送音乐封面图片'),
    showImageFile: Schema.boolean().default(true).description('封面/图片是否以图片形式发送（关闭则只发送链接）'),
    showVideoFile: Schema.boolean().default(true).description('视频是否以视频形式发送（关闭则只发送链接）'),
    forceDownloadImage: Schema.boolean().default(false).description('强制下载封面/图片'),
    forceDownloadVideo: Schema.boolean().default(false).description('强制下载视频'),
  }).description('媒体发送'),

  Schema.object({
    showMusicVoice: Schema.boolean().default(false).description('音乐链接以语音形式发送'),
    showMusicVoiceFile: Schema.boolean().default(true).description('音乐语音是否以文件形式发送（关闭则只发送链接）'),
    forceDownloadMusicVoice: Schema.boolean().default(false).description('强制下载音乐语音'),
  }).description('音乐语音（需 silk 和 ffmpeg）'),

  Schema.object({
    maxDescLength: Schema.number().min(0).step(1).default(200).description('简介长度上限'),
    maxConcurrent: Schema.number().min(1).step(1).default(3).description('解析最大并发数'),
    downloadConcurrency: Schema.number().min(1).step(1).default(3).description('下载线程数'),
    mediaDownloadTimeout: Schema.number().min(0).step(1).default(120000).description('统一下载超时 (ms)'),
    maxMediaSize: Schema.number().min(0).step(1).default(0).description('最大下载文件大小 (MB)，0 为不限制'),
    downloadEngine: Schema.union([
      Schema.const('internal').description('内置下载'),
      Schema.const('aria2').description('aria2 下载'),
    ]).default('internal').description('下载引擎'),
    aria2Host: Schema.string().default('127.0.0.1').description('aria2 RPC 地址'),
    aria2Port: Schema.number().default(6800).description('aria2 RPC 端口'),
    aria2Secret: Schema.string().default('').description('aria2 RPC 密钥'),
    resumeDownload: Schema.boolean().default(true).description('启用断点续传（仅 aria2 模式）'),
  }).description('性能与限制'),

  Schema.object({
    timeout: Schema.number().min(0).step(1).default(180000).description('API 请求超时 (ms)'),
    videoSendTimeout: Schema.number().min(0).step(1).default(180000).description('消息发送超时 (ms)'),
    userAgent: Schema.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36').description('User-Agent'),
    proxy: Schema.object({
      enabled: Schema.boolean().default(false).description('启用代理'),
      protocol: Schema.union([
        Schema.const('http').description('HTTP'),
        Schema.const('https').description('HTTPS'),
      ]).default('http').description('协议'),
      host: Schema.string().default('127.0.0.1').description('地址'),
      port: Schema.number().default(7890).description('端口'),
      auth: Schema.object({
        username: Schema.string().default('').description('用户名'),
        password: Schema.string().default('').description('密码'),
      }).description('认证'),
    }).description('HTTP/HTTPS 代理'),
    customHeaders: Schema.array(
      Schema.object({
        name: Schema.string().required().description('头名称'),
        value: Schema.string().required().description('头值'),
      })
    ).default([]).description('自定义请求头'),
  }).description('网络与请求'),

  Schema.object({
    ignoreSendError: Schema.boolean().default(true).description('忽略发送失败'),
    retryTimes: Schema.number().min(0).step(1).default(3).description('重试次数'),
    retryInterval: Schema.number().min(0).step(1).default(1000).description('重试间隔 (ms)'),
    enableForward: Schema.boolean().default(false).description('合并转发（OneBot/Satori）'),
  }).description('发送与重试'),

  Schema.object({
    deduplicationInterval: Schema.number().min(0).step(1).default(180).description('去重间隔 (s)'),
    cacheTTL: Schema.number().min(0).step(1).default(600).description('缓存时间 (s)'),
    cacheDir: Schema.string().default('./temp_cache').description('统一临时目录'),
  }).description('缓存与临时文件'),

  Schema.object({
    primaryApiUrl: Schema.string().default('https://api.bugpk.com/api/short_videos').hidden(),
    backupApiUrl: Schema.string().default('https://api.bugpk.com/api/svparse').hidden(),
    platformDedicatedFirst: Schema.object({
      bilibili: Schema.boolean().default(false).description('哔哩哔哩'),
      douyin: Schema.boolean().default(false).description('抖音'),
      kuaishou: Schema.boolean().default(false).description('快手'),
      xiaohongshu: Schema.boolean().default(false).description('小红书'),
      weibo: Schema.boolean().default(false).description('微博'),
      xigua: Schema.boolean().default(false).description('西瓜视频'),
      youtube: Schema.boolean().default(false).description('YouTube'),
      tiktok: Schema.boolean().default(false).description('TikTok'),
      acfun: Schema.boolean().default(false).description('AcFun（A站）'),
      zhihu: Schema.boolean().default(false).description('知乎'),
      weishi: Schema.boolean().default(false).description('微视'),
      huya: Schema.boolean().default(false).description('虎牙'),
      haokan: Schema.boolean().default(false).description('好看视频'),
      meipai: Schema.boolean().default(false).description('美拍'),
      twitter: Schema.boolean().default(false).description('Twitter/X'),
      instagram: Schema.boolean().default(false).description('Instagram'),
      doubao: Schema.boolean().default(false).description('豆包'),
      oasis: Schema.boolean().default(false).description('绿洲'),
      wechat_channel: Schema.boolean().default(false).description('视频号'),
      lishi: Schema.boolean().default(false).description('梨视频'),
      quanmin: Schema.boolean().default(false).description('全民直播'),
      pipigx: Schema.boolean().default(false).description('皮皮搞笑'),
      pipixia: Schema.boolean().default(false).description('皮皮虾'),
      zuiyou: Schema.boolean().default(false).description('最右'),
    }).description('优先使用专属 API'),
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
          Schema.const('acfun').description('AcFun（A站）'),
          Schema.const('zhihu').description('知乎'),
          Schema.const('weishi').description('微视'),
          Schema.const('huya').description('虎牙'),
          Schema.const('haokan').description('好看视频'),
          Schema.const('meipai').description('美拍'),
          Schema.const('twitter').description('Twitter/X'),
          Schema.const('instagram').description('Instagram'),
          Schema.const('doubao').description('豆包'),
          Schema.const('oasis').description('绿洲'),
          Schema.const('wechat_channel').description('视频号'),
        ]).description('平台'),
        apiUrl: Schema.string().description('API 地址'),
        apiKey: Schema.string().description('API Key').default(''),
        authHeaderType: Schema.union([
          Schema.const('Bearer').description('Bearer'),
          Schema.const('X-API-Key').description('X-API-Key'),
          Schema.const('Custom').description('自定义'),
        ]).default('Bearer').description('认证头类型'),
        customHeaderName: Schema.string().default('X-API-Key').description('自定义头名称'),
        fieldMapping: Schema.string().role('textarea').default('{}').description('字段映射 JSON'),
      })
    ).default([]).description('覆盖内置平台 API'),
    customPlatforms: Schema.array(
      Schema.object({
        name: Schema.string().required().description('平台名称'),
        exampleUrl: Schema.string().description('示例链接'),
        keywords: Schema.string().required().description('关键词（逗号分隔）'),
        apiUrl: Schema.string().required().description('解析 API'),
        apiKey: Schema.string().default('').description('API Key'),
        authHeaderType: Schema.union([
          Schema.const('Bearer').description('Bearer'),
          Schema.const('X-API-Key').description('X-API-Key'),
          Schema.const('Custom').description('自定义'),
        ]).default('Bearer').description('认证头类型'),
        customHeaderName: Schema.string().default('X-API-Key').description('自定义头名称'),
        fieldMapping: Schema.string().role('textarea').default('{}').description('字段映射 JSON'),
        proxy: Schema.object({
          enabled: Schema.boolean().default(false).description('启用独立代理'),
          protocol: Schema.union([
            Schema.const('http').description('HTTP'),
            Schema.const('https').description('HTTPS'),
          ]).default('http').description('协议'),
          host: Schema.string().default('127.0.0.1').description('地址'),
          port: Schema.number().default(7890).description('端口'),
          auth: Schema.object({
            username: Schema.string().default('').description('用户名'),
            password: Schema.string().default('').description('密码'),
          }).description('认证'),
        }).description('独立代理（覆盖全局代理）'),
      })
    ).default([]).description('自定义新平台'),
    globalFieldMapping: Schema.string().role('textarea').default(
      '{\n' +
      '  "title": "data.title",\n' +
      '  "desc": "data.description",\n' +
      '  "author": "data.author.name",\n' +
      '  "uid": "data.author.id",\n' +
      '  "avatar": "data.author.avatar",\n' +
      '  "cover": "data.cover_url",\n' +
      '  "video": "data.video_url",\n' +
      '  "video_backup": "data.video_qualities",\n' +
      '  "videos": "data.videos",\n' +
      '  "type": "data.type",\n' +
      '  "like": "data.statistics.likes",\n' +
      '  "comment": "data.statistics.comments",\n' +
      '  "collect": "data.statistics.favorites",\n' +
      '  "share": "data.statistics.shares",\n' +
      '  "play": "data.statistics.plays",\n' +
      '  "duration": "data.duration",\n' +
      '  "publishTime": "data.create_time",\n' +
      '  "music_title": "data.music.title",\n' +
      '  "music_author": "data.music.author",\n' +
      '  "music_cover": "data.music.cover",\n' +
      '  "music_url": "data.music.url"\n' +
      '}'
    ).description('全局字段映射 JSON'),
  }).description('API 与平台'),

  Schema.object({
    waitingTipText: Schema.string().default('正在解析视频，请稍候...').description('等待提示'),
    unsupportedPlatformText: Schema.string().default('不支持该平台链接').description('不支持提示'),
    invalidLinkText: Schema.string().default('无效的视频链接').description('无效链接提示'),
    parseErrorPrefix: Schema.string().default('❌ 解析失败：').description('错误前缀'),
    parseErrorItemFormat: Schema.string().default('【${url}】: ${msg}').description('错误格式'),
  }).description('界面文本'),
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

interface LinkMatch {
  type: string
  url: string
  id: string
}

interface ApiItem {
  url: string
  label: string
  apiKey?: string
  authHeaderType?: string
  customHeaderName?: string
  fieldMapping?: Record<string, string>
}

interface CustomPlatformConfig {
  name: string
  apiUrl: string
  apiKey: string
  authHeaderType: string
  customHeaderName: string
  fieldMapping?: Record<string, string>
  proxy?: any
}

const logger = new Logger(name)
let debugEnabled = false
function debugLog(level: string, ...args: any[]) {
  if (!debugEnabled) return
  logger.info(`[${new Date().toISOString()}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`)
}

const BUILTIN_LINK_RULES: { pattern: RegExp; type: string }[] = [
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
  { pattern: /https?:\/\/(?:www\.)?oasis\.weibo\.com\/v\/[0-9a-zA-Z_-]+/gi, type: 'oasis' },
  { pattern: /https?:\/\/channels\.weixin\.qq\.com\/[0-9a-zA-Z_-]+/gi, type: 'wechat_channel' },
  { pattern: /https?:\/\/weixin\.qq\.com\/sph\/[0-9a-zA-Z_-]+/gi, type: 'wechat_channel' },
  { pattern: /https?:\/\/(?:www\.)?pearvideo\.com\/video_\d+/gi, type: 'lishi' },
  { pattern: /https?:\/\/video\.li\/[0-9a-zA-Z_-]{3,}/gi, type: 'lishi' },
  { pattern: /https?:\/\/(?:www\.)?quanmin\.tv\/\w+/gi, type: 'quanmin' },
  { pattern: /https?:\/\/(?:www\.)?quanmintv\.cn\/\w+/gi, type: 'quanmin' },
  { pattern: /https?:\/\/h5\.pipigx\.com\/pp\/post\/\d+/gi, type: 'pipigx' },
  { pattern: /https?:\/\/(?:www\.)?ippzone\.com\/\w+/gi, type: 'pipigx' },
  { pattern: /https?:\/\/(?:h5|www)\.pipix\.com\/\w+/gi, type: 'pipixia' },
  { pattern: /https?:\/\/(?:www\.)?pipixia\.com\/\w+/gi, type: 'pipixia' },
  { pattern: /https?:\/\/share\.xiaochuankeji\.cn\/hybrid\/share\/post\?pid=\d+/gi, type: 'zuiyou' },
  { pattern: /https?:\/\/(?:h5|www)\.izuiyou\.com\/\w+/gi, type: 'zuiyou' },
]

function buildCustomLinkRules(customPlatforms: any[]): { pattern: RegExp; type: string }[] {
  if (!Array.isArray(customPlatforms) || customPlatforms.length === 0) return []
  return customPlatforms
    .filter(p => p.keywords)
    .map(p => {
      const keywords = p.keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
      if (keywords.length === 0) return null
      const escaped = keywords.map((k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const pattern = new RegExp('https?://[^/\\s]*(' + escaped.join('|') + ')[^\\s]*', 'gi')
      return { pattern, type: `custom_${p.name}` }
    })
    .filter(Boolean) as { pattern: RegExp; type: string }[]
}

function linkTypeParser(content: string, customRules: { pattern: RegExp; type: string }[]): LinkMatch[] {
  content = content.replace(/\\\//g, '/')
  const allRules = [...BUILTIN_LINK_RULES, ...customRules]
  const matches: LinkMatch[] = []
  const seen = new Set<string>()
  for (const rule of allRules) {
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

function extractAllUrlsFromMessage(session: any, customRules: { pattern: RegExp; type: string }[]): LinkMatch[] {
  const content = session.content?.trim() || ''
  const matchedLinks = linkTypeParser(content, customRules)
  const cardsContent: string[] = []
  if (session.elements) {
    for (const elem of session.elements) {
      if (elem.type === 'xml' && elem.data) cardsContent.push(elem.data)
      else if (elem.type === 'json' && elem.data) {
        try {
          const json = JSON.parse(elem.data)
          const extract = (obj: any) => {
            if (!obj || typeof obj !== 'object') return
            for (const val of Object.values(obj)) {
              if (typeof val === 'string') cardsContent.push(val)
              else if (typeof val === 'object') extract(val)
            }
          }
          extract(json)
        } catch {}
      }
    }
  }
  for (const cardContent of cardsContent) {
    matchedLinks.push(...linkTypeParser(cardContent, customRules))
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
    if (urlObj.protocol === 'http:') urlObj.protocol = 'https:'
    if (urlObj.hostname.includes('douyin.com') || urlObj.hostname.includes('v.douyin.com')) {
      ['source', 'share_type', 'share_token', 'timestamp', 'from', 'isappinstalled'].forEach(p => urlObj.searchParams.delete(p))
      return urlObj.origin + urlObj.pathname
    }
    if (urlObj.hostname.includes('bilibili.com') || urlObj.hostname.includes('b23.tv')) {
      ['share_source', 'share_medium', 'share_plat', 'share_session_id', 'share_tag', 'timestamp'].forEach(p => urlObj.searchParams.delete(p))
      return urlObj.origin + urlObj.pathname
    }
    return urlObj.toString()
  } catch {
    return url.replace(/&amp;/g, '&').replace(/\?.*/, '')
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
  const y = d.getFullYear()
  const mo = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const H = d.getHours().toString().padStart(2, '0')
  const i = d.getMinutes().toString().padStart(2, '0')
  return `${y}年${mo}月${day}日 ${H}:${i}`
}

function pickBestQuality(videoBackup: any[]): VideoQuality[] {
  if (!Array.isArray(videoBackup)) return []
  return videoBackup.filter(v => v && v.url).map(v => ({
    quality: v.quality || v.label || 'unknown',
    url: v.url,
    bit_rate: Number(v.bit_rate || 0)
  })).sort((a, b) => b.bit_rate - a.bit_rate)
}

function getNestedValue(obj: any, path: string): any {
  if (!path) return obj
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }
  return current
}

function parseCount(val: any): number {
  if (val === undefined || val === null) return 0
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (str.includes('万')) {
    const num = parseFloat(str)
    return isNaN(num) ? 0 : Math.round(num * 10000)
  }
  if (str.includes('亿')) {
    const num = parseFloat(str)
    return isNaN(num) ? 0 : Math.round(num * 100000000)
  }
  const num = parseInt(str, 10)
  return isNaN(num) ? 0 : num
}

function parseApiResponse(raw: any, maxDescLen: number, fieldMapping?: Record<string, string>): ParsedData {
  debugLog('DEBUG', 'API raw response', raw)
  const data = raw?.data || {}
  const extra = data.extra || {}

  const mapField = (name: string, fallback: () => any) => {
    if (fieldMapping && fieldMapping[name]) {
      const value = getNestedValue(raw, fieldMapping[name])
      if (value !== undefined) return value
    }
    return fallback()
  }

  let type = mapField('type', () => {
    let t = data.type || data.videoType || ''
    if (!t) {
      if (data.images?.length > 0 && !data.url) t = 'image'
      else if (data.live_photo?.length > 0) t = 'live_photo'
      else if (raw.msg === 'live' || data.live) t = 'live'
      else t = 'video'
    }
    return t
  })

  let authorObj = mapField('author', () => data.author || data.user)
  let author = '', uid = '', avatar = ''
  if (authorObj && typeof authorObj === 'object') {
    author = authorObj.name || authorObj.author || ''
    uid = String(authorObj.id || authorObj.userID || data.uid || data.userID || data.author_id || '')
    avatar = authorObj.avatar || data.avatar || ''
  } else {
    author = mapField('author', () => data.author || data.auther || '')
    uid = String(mapField('uid', () => data.uid || data.userID || data.author_id || ''))
    avatar = mapField('avatar', () => data.avatar || '')
  }

  const title = mapField('title', () => data.title || '')
  const desc = (mapField('desc', () => data.desc || data.description || '') as string).slice(0, maxDescLen).trim()
  const coverRaw = mapField('cover', () => data.cover || '')
  const cover = coverRaw ? (String(coverRaw).startsWith('http') ? String(coverRaw) : 'https:' + coverRaw) : ''

  let video = ''
  let videos: VideoQuality[] = []
  const videoBackup = mapField('video_backup', () => data.video_backup)
  if (Array.isArray(videoBackup) && videoBackup.length) {
    const bestQ = pickBestQuality(videoBackup)
    videos = bestQ
    video = bestQ[0]?.url || ''
  }
  if (!video) {
    const rawVideos = mapField('videos', () => data.videos)
    if (Array.isArray(rawVideos) && rawVideos.length) {
      const validVideos = rawVideos.filter((v: any) => v && v.url)
      if (validVideos.length) {
        video = validVideos[0].url
        videos = validVideos.map((v: any) => ({ quality: v.accept?.[0] || 'unknown', url: v.url }))
      }
    }
  }
  if (!video && data.quality_urls && typeof data.quality_urls === 'object') {
    const entries = Object.entries(data.quality_urls)
    videos = entries.map(([label, url]) => ({ quality: label, url: String(url) }))
    if (videos.length) video = videos[0].url
  }
  if (!video) video = mapField('video', () => data.url || '')
  if (video && !video.startsWith('http')) video = 'https:' + video

  let images: string[] = []
  const directImages = mapField('images', () => data.images)
  if (Array.isArray(directImages)) {
    images = directImages.filter((img: any) => img && typeof img === 'string').map((img: any) => img.startsWith('http') ? img : 'https:' + img)
  } else if (Array.isArray(data.imgurl)) {
    images = data.imgurl.filter((img: any) => img && typeof img === 'string').map((img: any) => img.startsWith('http') ? img : 'https:' + img)
  }

  const live_photo = Array.isArray(data.live_photo) ? data.live_photo.filter((lp: any) => lp && lp.image).map((lp: any) => ({
    image: lp.image.startsWith('http') ? lp.image : 'https:' + lp.image,
    video: lp.video ? (lp.video.startsWith('http') ? lp.video : 'https:' + lp.video) : ''
  })) : []

  const musicCoverRaw = mapField('music_cover', () => data.music?.cover || data.music?.albumCover?.url || '')
  const musicUrlRaw = mapField('music_url', () => data.music?.url || data.music?.playURL || '')
  const music = {
    title: mapField('music_title', () => data.music?.title || data.music?.name || '') as string,
    author: mapField('music_author', () => data.music?.author || data.music?.artist || '') as string,
    cover: musicCoverRaw ? (String(musicCoverRaw).startsWith('http') ? String(musicCoverRaw) : 'https:' + musicCoverRaw) : '',
    url: musicUrlRaw ? (String(musicUrlRaw).startsWith('http') ? String(musicUrlRaw) : 'https:' + musicUrlRaw) : '',
  }

  const like = parseCount(mapField('like', () => data.like ?? data.statistics?.digg_count ?? data.statistics?.like_count ?? data.statistics?.likes ?? extra.statistics?.digg_count ?? extra.statistics?.like_count ?? extra.statistics?.likes ?? data.attitudes_count ?? 0))
  const comment = parseCount(mapField('comment', () => data.comment ?? data.statistics?.comment_count ?? data.statistics?.comments ?? extra.statistics?.comment_count ?? extra.statistics?.comments ?? data.comments_count ?? 0))
  const collect = parseCount(mapField('collect', () => data.collect ?? data.statistics?.collect_count ?? data.statistics?.favorite_count ?? data.statistics?.favorites ?? extra.statistics?.collect_count ?? extra.statistics?.favorite_count ?? extra.statistics?.favorites ?? data.favorites_count ?? 0))
  const share = parseCount(mapField('share', () => data.share ?? data.statistics?.share_count ?? data.statistics?.forward_count ?? data.statistics?.shares ?? extra.statistics?.share_count ?? extra.statistics?.forward_count ?? extra.statistics?.shares ?? data.reposts_count ?? 0))
  const play = parseCount(mapField('play', () => data.play ?? data.statistics?.play_count ?? data.statistics?.view_count ?? data.statistics?.plays ?? extra.statistics?.play_count ?? extra.statistics?.view_count ?? extra.statistics?.plays ?? data.play_count ?? data.view_count ?? 0))

  let duration = 0
  if (extra.duration_ms) {
    duration = Math.floor(Number(extra.duration_ms) / 1000)
  } else {
    const durRaw = mapField('duration', () => data.duration)
    if (durRaw) {
      duration = typeof durRaw === 'string' ? parseInt(durRaw, 10) : Number(durRaw)
    }
  }

  let publishTime = 0
  const timeRaw = mapField('publishTime', () => data.time)
  if (timeRaw) {
    publishTime = typeof timeRaw === 'number' ? timeRaw : parseInt(timeRaw, 10)
    if (publishTime < 1000000000000) publishTime *= 1000
  } else if (extra.create_time) {
    publishTime = Number(extra.create_time) * 1000
  }

  return { type, title, desc, author, uid, avatar, cover, video, videos, images, live_photo, music, like, comment, collect, share, play, duration, publishTime }
}

const formatVarRegex = /\$\{([^}]+)\}/g
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
    '视频链接': p.video,
    '音乐标题': p.music.title || '',
    '音乐作者': p.music.author || '',
    '音乐封面': p.music.cover || '',
  }
  const varReplacements = Object.entries(vars).map(([key, val]) => ({
    regex: new RegExp(`\\$\\{${key}\\}`, 'g'),
    value: val,
  }))
  const lines = format.split('\n')
  const resultLines: string[] = []
  for (const line of lines) {
    const varMatches = line.match(formatVarRegex)
    if (varMatches && varMatches.length > 0) {
      let allEmptyOrZero = true
      for (const match of varMatches) {
        const varName = match.slice(2, -1)
        const val = vars[varName]
        if (val && val !== '0') {
          allEmptyOrZero = false
          break
        }
      }
      if (allEmptyOrZero) continue
    }
    let newLine = line
    for (const { regex, value } of varReplacements) {
      newLine = newLine.replace(regex, value)
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
  return h('node', { user: { nickname: botName.substring(0, 15), user_id: session.selfId } }, messageContent)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as Record<string, unknown>).message)
  return String(error)
}

function parseFieldMapping(mappingStr: string): Record<string, string> | undefined {
  if (!mappingStr || mappingStr.trim() === '{}' || mappingStr.trim() === '') return undefined
  try {
    const obj = JSON.parse(mappingStr)
    if (typeof obj === 'object' && !Array.isArray(obj)) return obj
    return undefined
  } catch {
    return undefined
  }
}

export function apply(ctx: Context, config: any) {
  debugEnabled = config.debug || false
  debugLog('INFO', 'plugin start')

  const dedupCache = new SimpleLRUCache<number>(1000, config.deduplicationInterval * 1000)
  const cacheTTL = (config.cacheTTL || 600) * 1000
  const urlCacheLocal = new SimpleLRUCache<{ data: ParsedData; expire: number }>(500, cacheTTL)

  const texts = {
    waitingTipText: config.waitingTipText || '正在解析视频，请稍候...',
    unsupportedPlatformText: config.unsupportedPlatformText || '不支持该平台链接',
    invalidLinkText: config.invalidLinkText || '无效的视频链接',
    parseErrorPrefix: config.parseErrorPrefix || '❌ 解析失败：',
    parseErrorItemFormat: config.parseErrorItemFormat || '【${url}】: ${msg}',
  }

  const proxyConfig = config.proxy || {}
  const cacheDir = config.cacheDir || './temp_cache'
  const customPlatforms: CustomPlatformConfig[] = (config.customPlatforms || []).map((p: any) => ({
    name: p.name,
    apiUrl: p.apiUrl,
    apiKey: p.apiKey || '',
    authHeaderType: p.authHeaderType || 'Bearer',
    customHeaderName: p.customHeaderName || 'X-API-Key',
    fieldMapping: parseFieldMapping(p.fieldMapping),
    proxy: p.proxy || null
  }))

  const downloadLimiter = new ConcurrencyLimiter(config.downloadConcurrency || 3)
  const mediaDownloadTimeout = config.mediaDownloadTimeout ?? 120000
  const maxMediaSize = config.maxMediaSize ?? 0
  const downloadEngine = config.downloadEngine || 'internal'
  let aria2: any = null
  if (downloadEngine === 'aria2') {
    try {
      const Aria2 = require('aria2')
      aria2 = new Aria2({
        host: config.aria2Host || '127.0.0.1',
        port: config.aria2Port || 6800,
        secure: false,
        secret: config.aria2Secret || '',
        path: '/jsonrpc'
      })
      aria2.open()
      logger.info('aria2 连接成功')
    } catch (e) {
      logger.warn('aria2 连接失败，回退到内置下载')
    }
  }

  function getPlatformConfig(type: string): { apiUrl: string | null; dedicatedFirst: boolean; apiKey: string; authHeaderType: string; customHeaderName: string; fieldMapping?: Record<string, string>; customProxy?: any } {
    if (type.startsWith('custom_')) {
      const name = type.slice(7)
      const custom = customPlatforms.find(p => p.name === name)
      if (custom) {
        return {
          apiUrl: custom.apiUrl,
          dedicatedFirst: true,
          apiKey: custom.apiKey || '',
          authHeaderType: custom.authHeaderType,
          customHeaderName: custom.customHeaderName,
          fieldMapping: custom.fieldMapping,
          customProxy: custom.proxy
        }
      }
      return { apiUrl: null, dedicatedFirst: false, apiKey: '', authHeaderType: 'Bearer', customHeaderName: 'X-API-Key' }
    }

    const custom = config.customApis?.find((item: any) => item.platform === type)
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
      wechat_channel: 'https://api.bugpk.com/api/wxsph',
    }
    let apiUrl = defaultDedicatedApis[type] || null
    let apiKey = ''
    let authHeaderType = 'Bearer'
    let customHeaderName = 'X-API-Key'
    let fieldMapping: Record<string, string> | undefined = undefined
    if (custom && custom.apiUrl) {
      apiUrl = custom.apiUrl
      apiKey = custom.apiKey || ''
      authHeaderType = custom.authHeaderType || 'Bearer'
      customHeaderName = custom.customHeaderName || 'X-API-Key'
      fieldMapping = parseFieldMapping(custom.fieldMapping)
    } else {
      apiKey = ''
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

  async function resolveShortUrl(url: string): Promise<string> {
    try {
      const res = await http.get(url, {
        timeout: 10000,
        maxRedirects: 10,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.baidu.com/' },
        validateStatus: (status: number) => status >= 200 && status < 400,
      })
      const finalUrl = (res.request as { res?: { responseUrl?: string } })?.res?.responseUrl || url
      return cleanUrl(finalUrl)
    } catch {
      return cleanUrl(url)
    }
  }

  async function downloadFile(url: string, timeout: number, maxSize: number, filePrefix: string, fileExts: string[]): Promise<string> {
    if (!url) throw new Error('链接为空')
    await fs.mkdir(cacheDir, { recursive: true })
    const extRegexCache: Record<string, RegExp> = {}
    const ext = fileExts.find(e => {
      const r = extRegexCache[e] || (extRegexCache[e] = new RegExp('\\.' + e + '(\\?|$)', 'i'))
      return r.test(url)
    }) || fileExts[0]
    const fileName = `${filePrefix}_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`
    const filePath = path.resolve(cacheDir, fileName)

    if (ctx.downloads) {
      try {
        const dest = await ctx.downloads.download(url, path.join(cacheDir, fileName), {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout
        })
        const stat = await fs.stat(dest)
        if (maxSize > 0 && stat.size > maxSize * 1024 * 1024) {
          await fs.unlink(dest).catch(() => {})
          throw new Error(`文件过大(${Math.round(stat.size/1024/1024)}MB)，超过限制(${maxSize}MB)`)
        }
        return dest
      } catch (e) {
        debugLog('ERROR', `downloads 服务下载失败，回退: ${getErrorMessage(e)}`)
      }
    }

    if (aria2 && config.resumeDownload) {
      try {
        const gid = await aria2.call('aria2.addUri', [url], {
          dir: cacheDir,
          out: fileName,
          split: 4,
          continue: true,
          maxConnectionPerServer: 5,
          timeout: timeout / 1000,
          maxFileNotFound: 5,
          maxTries: 5,
          retryWait: 2,
          header: [`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`, `Referer: https://www.baidu.com/`]
        })
        let completed = false
        const ariaStartTime = Date.now()
        while (!completed) {
          if (Date.now() - ariaStartTime > timeout) {
            await aria2.call('aria2.remove', gid).catch(() => {})
            throw new Error('aria2下载超时')
          }
          const status = await aria2.call('aria2.tellStatus', gid)
          if (status.status === 'complete') {
            completed = true
          } else if (status.status === 'error' || status.status === 'removed') {
            throw new Error('aria2下载失败')
          } else {
            await delay(1000)
          }
        }
        const stat = await fs.stat(filePath)
        if (maxSize > 0 && stat.size > maxSize * 1024 * 1024) {
          await fs.unlink(filePath).catch(() => {})
          throw new Error(`文件过大(${Math.round(stat.size/1024/1024)}MB)，超过限制(${maxSize}MB)`)
        }
        return filePath
      } catch (e) {
        debugLog('ERROR', `aria2下载失败，回退内置下载: ${getErrorMessage(e)}`)
      }
    }

    const writer = createWriteStream(filePath)
    let response
    try {
      response = await http({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.baidu.com/' },
        maxRedirects: 5,
        validateStatus: (status: number) => status >= 200 && status < 300,
      })
    } catch (e) {
      writer.destroy()
      await fs.unlink(filePath).catch(() => {})
      throw new Error(`下载失败: ${getErrorMessage(e)}`)
    }
    const maxSizeBytes = maxSize * 1024 * 1024
    const contentLength = Number(response.headers['content-length'] || 0)
    if (maxSizeBytes > 0 && contentLength > maxSizeBytes) {
      writer.destroy()
      await fs.unlink(filePath).catch(() => {})
      throw new Error(`文件过大(${Math.round(contentLength/1024/1024)}MB)，超过限制(${maxSize}MB)`)
    }
    try {
      await pipeline(response.data, writer)
      return filePath
    } catch (e) {
      await fs.unlink(filePath).catch(() => {})
      throw new Error(`写入文件失败: ${getErrorMessage(e)}`)
    }
  }

  async function sendMedia(session: any, url: string, type: 'image' | 'video' | 'audio', forceDownload: boolean, showFile: boolean) {
    if (!url) return
    await downloadLimiter.acquire()
    try {
      const sendLink = async () => { await sendWithTimeout(session, `${type === 'audio' ? '音乐' : type === 'video' ? '视频' : '图片'}链接：${url}`).catch(() => {}) }
      const extMap: Record<string, string[]> = {
        image: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
        video: ['mp4'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
      }
      const prefixMap = { image: 'img', video: 'video', audio: 'music' }
      const sendFunc = type === 'audio' ? h.audio : type === 'video' ? h.video : h.image

      if (forceDownload) {
        try {
          const localPath = await downloadFile(url, mediaDownloadTimeout, maxMediaSize, prefixMap[type], extMap[type])
          try {
            await sendWithTimeout(session, sendFunc(`file://${localPath}`))
          } finally {
            await fs.unlink(localPath).catch(() => {})
          }
          return
        } catch (e) {
          debugLog('ERROR', `强制下载${type}失败，尝试URL发送:`, getErrorMessage(e))
          try {
            await sendWithTimeout(session, sendFunc(url))
          } catch { await sendLink() }
        }
        return
      }
      if (!showFile) {
        await sendLink()
        return
      }
      try {
        await sendWithTimeout(session, sendFunc(url))
      } catch {
        try {
          const localPath = await downloadFile(url, mediaDownloadTimeout, maxMediaSize, prefixMap[type], extMap[type])
          try {
            await sendWithTimeout(session, sendFunc(`file://${localPath}`))
          } finally {
            await fs.unlink(localPath).catch(() => {})
          }
        } catch { await sendLink() }
      }
    } finally {
      downloadLimiter.release()
    }
  }

  async function flush(session: any, matches: LinkMatch[]) {
    debugLog('INFO', `开始解析 ${matches.length} 个链接`)
    const items: { text: string; parsed: ParsedData }[] = []
    const errors: string[] = []
    const limiter = new ConcurrencyLimiter(config.maxConcurrent || 3)
    const promises = matches.map(async (match) => {
      await limiter.acquire()
      try {
        const platformEnabled = config.platformEnabled?.[match.type] ?? true
        if (!platformEnabled && !match.type.startsWith('custom_')) {
          debugLog('INFO', `平台 ${match.type} 已禁用，跳过链接: ${match.url}`)
          return
        }
        if (config.deduplicationInterval > 0) {
          const lastTime = dedupCache.get(match.url)
          if (lastTime && (Date.now() - lastTime < config.deduplicationInterval * 1000)) {
            debugLog('INFO', `跳过重复链接: ${match.url}`)
            const shortUrl = match.url.length > 50 ? match.url.slice(0, 50) + '...' : match.url
            await sendWithTimeout(session, `链接 ${shortUrl} 在最近 ${config.deduplicationInterval} 秒内已解析过，已跳过。`).catch(() => {})
            return
          }
        }
        debugLog('INFO', `解析链接: ${match.url} (${match.type})`)
        const platformConf = getPlatformConfig(match.type)
        const fieldMapping = platformConf.fieldMapping
        const result = await processSingleUrl(match.url, match.type, fieldMapping, platformConf)
        if (result.success) {
          items.push(result.data)
          if (config.deduplicationInterval > 0) dedupCache.set(match.url, Date.now())
        } else {
          const item = texts.parseErrorItemFormat.replace(/\$\{url\}/g, match.url.length > 50 ? match.url.slice(0,50)+'...' : match.url).replace(/\$\{msg\}/g, result.msg)
          errors.push(item)
        }
      } finally {
        limiter.release()
      }
    })
    await Promise.all(promises)

    if (errors.length) await sendWithTimeout(session, `${texts.parseErrorPrefix}\n${errors.join('\n')}`)
    if (!items.length) return

    const enableForward = config.enableForward && (session.platform === 'onebot' || session.platform === 'satori')
    const botName = config.botName || '视频解析机器人'
    if (enableForward) {
      const forwardMessages: any[] = []
      for (const item of items) {
        const p = item.parsed
        const text = item.text
        if (text && config.showImageText) forwardMessages.push(buildForwardNode(session, text, botName))
        if (p.cover && config.showCoverImage && p.type !== 'live_photo' && !(p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          forwardMessages.push(buildForwardNode(session, h.image(p.cover), botName))
        }
        if (config.showMusicCover && p.music.cover) {
          forwardMessages.push(buildForwardNode(session, h.image(p.music.cover), botName))
        }
        if (p.type === 'image' || p.type === 'live_photo' || (p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          const imageUrls = p.images?.length ? p.images : (p.live_photo?.map(lp => lp.image) ?? [])
          for (const imgUrl of imageUrls) forwardMessages.push(buildForwardNode(session, h.image(imgUrl), botName))
        }
        if (p.video) forwardMessages.push(buildForwardNode(session, h.video(p.video), botName))
        if (config.showMusicVoice && p.music.url) {
          forwardMessages.push(buildForwardNode(session, h.audio(p.music.url), botName))
        }
      }
      if (forwardMessages.length) {
        try {
          await sendWithTimeout(session, h('message', { forward: true }, forwardMessages.slice(0, 100)), config.retryTimes)
        } catch (err) {
          debugLog('ERROR', '合并转发失败，降级逐条发送:', err)
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
        if (text && config.showImageText) { await sendWithTimeout(session, text); await delay(300) }
        if (p.cover && config.showCoverImage && p.type !== 'live_photo' && !(p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          await sendMedia(session, p.cover, 'image', config.forceDownloadImage, config.showImageFile).catch(() => {})
          await delay(300)
        }
        if (config.showMusicCover && p.music.cover) {
          await sendMedia(session, p.music.cover, 'image', config.forceDownloadImage, config.showImageFile).catch(() => {})
          await delay(300)
        }
        if (p.video && (p.type === 'video' || (p.type === 'live' && !p.live_photo?.length && !p.images?.length))) {
          await sendMedia(session, p.video, 'video', config.forceDownloadVideo, config.showVideoFile).catch(() => {})
          await delay(500)
        }
        if (p.type === 'image' || p.type === 'live_photo' || (p.type === 'live' && (p.live_photo?.length || p.images?.length))) {
          const imageUrls = p.images?.length ? p.images : (p.live_photo?.map(lp => lp.image) ?? [])
          for (const imgUrl of imageUrls) {
            await sendMedia(session, imgUrl, 'image', config.forceDownloadImage, config.showImageFile).catch(() => {})
            await delay(200)
          }
        }
        if (config.showMusicVoice && p.music.url) {
          await sendMedia(session, p.music.url, 'audio', config.forceDownloadMusicVoice, config.showMusicVoiceFile).catch(() => {})
          await delay(300)
        }
      }
    }
    debugLog('INFO', '处理完成')
  }

  async function fetchApi(url: string, type: string, fieldMapping?: Record<string, string>, platformConf?: any): Promise<ParsedData> {
    const cacheKey = url
    const cached = urlCacheLocal.get(cacheKey)
    if (cached && cached.expire > Date.now()) return cached.data

    const { apiUrl: dedicatedUrl, dedicatedFirst, apiKey, authHeaderType, customHeaderName, customProxy } = platformConf || getPlatformConfig(type)
    const primaryApi = config.primaryApiUrl || 'https://api.bugpk.com/api/short_videos'
    const backupApi = config.backupApiUrl || 'https://api.bugpk.com/api/svparse'
    const backupAllowed = new Set(['douyin', 'xiaohongshu', 'instagram', 'jimeng']).has(type)

    const apiList: ApiItem[] = []
    if (dedicatedFirst && dedicatedUrl) {
      apiList.push({ url: dedicatedUrl, label: `专属API(${type})`, apiKey, authHeaderType, customHeaderName, fieldMapping })
      apiList.push({ url: primaryApi, label: '默认主API', fieldMapping })
      if (backupAllowed) apiList.push({ url: backupApi, label: '备用主API', fieldMapping })
    } else {
      apiList.push({ url: primaryApi, label: '默认主API', fieldMapping })
      if (backupAllowed) apiList.push({ url: backupApi, label: '备用主API', fieldMapping })
      if (dedicatedUrl) apiList.push({ url: dedicatedUrl, label: `专属API(${type})`, apiKey, authHeaderType, customHeaderName, fieldMapping })
    }

    if (type.startsWith('custom_') && apiList.length === 0 && dedicatedUrl) {
      apiList.push({ url: dedicatedUrl, label: `自定义API(${type})`, apiKey, authHeaderType, customHeaderName, fieldMapping })
    }

    const customHeaders = config.customHeaders || []
    let lastError: Error | null = null
    for (const api of apiList) {
      for (let attempt = 0; attempt <= config.retryTimes; attempt++) {
        try {
          const headers: any = {
            'User-Agent': config.userAgent,
            'Referer': 'https://www.baidu.com/',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
          for (const h of customHeaders) {
            if (h.name && h.value) headers[h.name] = h.value
          }
          if (api.apiKey) {
            const authHeaders = buildAuthHeaders(api.apiKey, api.authHeaderType || 'Bearer', api.customHeaderName || 'X-API-Key')
            Object.assign(headers, authHeaders)
          }
          const proxyToUse = customProxy && customProxy.enabled ? customProxy : (proxyConfig.enabled ? proxyConfig : undefined)
          const axiosConfigLocal: AxiosRequestConfig = {
            params: { url },
            timeout: config.timeout,
            headers,
            proxy: proxyToUse && proxyToUse.host ? {
              protocol: proxyToUse.protocol || 'http',
              host: proxyToUse.host,
              port: proxyToUse.port || 7890,
              auth: proxyToUse.auth?.username ? { username: proxyToUse.auth.username, password: proxyToUse.auth.password || '' } : undefined
            } : undefined
          }
          const res = await http.get(api.url, axiosConfigLocal)
          if (res.data && (res.data.code === 200 || res.data.code === 0)) {
            const parsed = parseApiResponse(res.data, config.maxDescLength, api.fieldMapping)
            urlCacheLocal.set(cacheKey, { data: parsed, expire: Date.now() + cacheTTL })
            return parsed
          }
          throw new Error(res.data?.msg || `API返回错误码: ${res.data?.code}`)
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          debugLog('ERROR', `${api.label} attempt ${attempt+1} failed: ${lastError.message}`)
          if (attempt < config.retryTimes) await delay(config.retryInterval)
        }
      }
      debugLog('WARN', `${api.label} all retries failed`)
    }
    throw lastError || new Error('所有API请求全部失败')
  }

  async function parseUrl(url: string, type: string, fieldMapping?: Record<string, string>, platformConf?: any): Promise<{ success: true; data: ParsedData } | { success: false; msg: string }> {
    const realUrl = await resolveShortUrl(url)
    const candidates = [...new Set([realUrl, url])]
    for (const candidate of candidates) {
      try {
        const info = await fetchApi(candidate, type, fieldMapping, platformConf)
        if (info.video || info.images.length > 0 || info.live_photo.length > 0) return { success: true, data: info }
        debugLog('WARN', `解析成功但无内容: ${candidate}`)
      } catch (error) {
        debugLog('ERROR', `候选链接失败: ${candidate}`, getErrorMessage(error))
      }
    }
    return { success: false, msg: texts.unsupportedPlatformText }
  }

  async function processSingleUrl(url: string, type: string, fieldMapping?: Record<string, string>, platformConf?: any): Promise<{ success: true; data: { text: string; parsed: ParsedData } } | { success: false; msg: string; url: string }> {
    const result = await parseUrl(url, type, fieldMapping, platformConf)
    if (!result.success) return { success: false, msg: result.msg, url }
    const text = generateFormattedText(result.data, config.unifiedMessageFormat)
    return { success: true, data: { text, parsed: result.data } }
  }

  async function sendWithTimeout(session: any, content: any, customRetries?: number): Promise<any> {
    const maxRetries = customRetries ?? config.retryTimes ?? 3
    const retryDelay = config.retryInterval || 1000
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let sendPromise = session.send(content)
        if (config.videoSendTimeout > 0) {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('发送超时')), config.videoSendTimeout))
          return await Promise.race([sendPromise, timeoutPromise])
        } else {
          return await sendPromise
        }
      } catch (err) {
        const errMsg = getErrorMessage(err)
        debugLog('ERROR', `发送失败尝试 ${attempt+1}: ${errMsg}`)
        if (attempt < maxRetries) await delay(retryDelay)
        else if (!config.ignoreSendError) throw err
      }
    }
    return null
  }

  const customRules = buildCustomLinkRules(config.customPlatforms || [])

  const axiosConfig: AxiosRequestConfig = {
    timeout: config.timeout,
    headers: {
      'User-Agent': config.userAgent,
      'Referer': 'https://www.baidu.com/',
      'Content-Type': 'application/x-www-form-urlencoded'
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

  ctx.on('message', async (session) => {
    if (!config.enable) return
    if (session.subtype === 'file_upload') return
    if (session.elements?.some(elem => elem.type === 'file' || elem.type === 'folder')) return
    if (session.selfId === session.userId) return
    const matches = extractAllUrlsFromMessage(session, customRules)
    if (!matches.length) return
    debugLog('INFO', `检测到 ${matches.length} 个链接`)
    if (config.showWaitingTip) { try { await sendWithTimeout(session, texts.waitingTipText) } catch(e) { debugLog('WARN', '等待提示发送失败:', e) } }
    await flush(session, matches)
  })

  ctx.command('parse <url>', '手动解析视频').action(async ({ session }, url) => {
    if (!url) { await sendWithTimeout(session, texts.invalidLinkText); return }
    const matches = linkTypeParser(url, customRules)
    if (!matches.length) { await sendWithTimeout(session, texts.invalidLinkText); return }
    if (config.showWaitingTip) { try { await sendWithTimeout(session, texts.waitingTipText) } catch {} }
    await flush(session, matches)
  })

  const tempCleanupInterval = setInterval(async () => {
    try {
      const files = await fs.readdir(cacheDir)
      const now = Date.now()
      for (const file of files) {
        if ((file.startsWith('video_') && file.endsWith('.mp4')) ||
            (file.startsWith('img_') && file.match(/\.(png|jpg|jpeg|gif|webp)$/i)) ||
            (file.startsWith('music_') && file.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i))) {
          const filePath = path.join(cacheDir, file)
          const stats = await fs.stat(filePath)
          if (now - stats.mtimeMs > 3600000) { await fs.unlink(filePath).catch(() => {}) }
        }
      }
    } catch (e) { debugLog('WARN', '清理临时文件失败:', e) }
  }, 3600000)

  ctx.on('dispose', () => {
    clearInterval(tempCleanupInterval)
    if (aria2) aria2.close()
    urlCacheLocal.clear()
    dedupCache.clear()
    debugLog('INFO', '插件已卸载')
  })

  process.on('beforeExit', async () => {
    try {
      const files = await fs.readdir(cacheDir)
      for (const file of files) {
        if ((file.startsWith('video_') && file.endsWith('.mp4')) ||
            (file.startsWith('img_') && file.match(/\.(png|jpg|jpeg|gif|webp)$/i)) ||
            (file.startsWith('music_') && file.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i))) {
          await fs.unlink(path.join(cacheDir, file)).catch(() => {})
        }
      }
    } catch {}
  })

  debugLog('INFO', '插件初始化完成')
}