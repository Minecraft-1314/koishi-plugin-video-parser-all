import { LinkMatch } from './types'

export const BUILTIN_LINK_RULES: { pattern: RegExp; type: string }[] = [
  { pattern: /https?:\/\/(?:www\.)?bilibili\.com\/video\/([ab]v[0-9a-zA-Z_-]+)(?:\?[^\s'""]*)?/gi, type: 'bilibili' },
  { pattern: /https?:\/\/(?:b23\.tv|b23\.wtf|bili\d+\.cn|bili2233\.cn|acg\.tv|biliintl\.com)\/[^\s'""]*/gi, type: 'bilibili' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*bilibili\.com\/[^\s'""]*/gi, type: 'bilibili' },

  { pattern: /https?:\/\/(?:www\.)?douyin\.com\/video\/\d{10,}(?:\?[^\s'""]*)?/gi, type: 'douyin' },
  { pattern: /https?:\/\/v\.douyin\.com\/[^\s'""]*/gi, type: 'douyin' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*douyin\.com\/[^\s'""]*/gi, type: 'douyin' },

  { pattern: /https?:\/\/(?:www\.)?dola\.com\/thread\/[0-9a-zA-Z_-]+(?:\?[^\s'""]*)?/gi, type: 'dola' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*dola\.com\/[^\s'""]*/gi, type: 'dola' },

  { pattern: /https?:\/\/(?:www\.)?kuaishou\.com\/short-video\/[0-9a-zA-Z_\/-]+(?:\?[^\s'""]*)?/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/v\.kuaishou\.com\/[^\s'""]*/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:www\.)?kuaishou\.com\/f\/[0-9a-zA-Z_\/-]+(?:\?[^\s'""]*)?/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*kuaishou\.com\/[^\s'""]*/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*gifshow\.com\/[^\s'""]*/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*kwai\.com\/[^\s'""]*/gi, type: 'kuaishou' },

  { pattern: /https?:\/\/(?:www\.)?toutiao\.com\/video\/\d{10,}(?:\?[^\s'""]*)?/gi, type: 'toutiao' },
  { pattern: /https?:\/\/(?:www\.|m\.)?toutiao\.com\/(?:i|w|group|article)\/\d+(?:\?[^\s'""]*)?/gi, type: 'toutiao' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*toutiao\.com\/[^\s'""]*/gi, type: 'toutiao' },

  { pattern: /https?:\/\/(?:www\.)?qianwen\.com\/(?:share\/)?chat\/[0-9a-zA-Z_-]+(?:\?[^\s'""]*)?/gi, type: 'qianwen' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*qianwen\.com\/[^\s'""]*/gi, type: 'qianwen' },
  { pattern: /https?:\/\/(?:www\.)?tongyi\.aliyun\.com\/[^\s'""]*/gi, type: 'qianwen' },

  { pattern: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/\d{10,}(?:\?[^\s'""]*)?/gi, type: 'tiktok' },
  { pattern: /https?:\/\/(?:vm|vt)\.tiktok\.com\/[^\s'""]*/gi, type: 'tiktok' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*tiktok\.com\/[^\s'""]*/gi, type: 'tiktok' },

  { pattern: /https?:\/\/(?:www\.)?acfun\.cn\/v\/ac\d{10,}(?:\?[^\s'""]*)?/gi, type: 'acfun' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*acfun\.cn\/[^\s'""]*/gi, type: 'acfun' },
  { pattern: /https?:\/\/(?:acfun\.tv|acfun\.com)\/[^\s'""]*/gi, type: 'acfun' },

  { pattern: /https?:\/\/weishi\.qq\.com\/weishi\/feed\/[0-9a-zA-Z_\/-]+(?:\?[^\s'""]*)?/gi, type: 'weishi' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*weishi\.qq\.com\/[^\s'""]*/gi, type: 'weishi' },
  { pattern: /https?:\/\/(?:www\.)?weishi\.com\/[^\s'""]*/gi, type: 'weishi' },

  { pattern: /https?:\/\/haokan\.baidu\.com\/v\?vid=[0-9a-zA-Z_\/-]+/gi, type: 'haokan' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*haokan\.baidu\.com\/[^\s'""]*/gi, type: 'haokan' },
  { pattern: /https?:\/\/(?:www\.)?haokan\.com\/[^\s'""]*/gi, type: 'haokan' },

  { pattern: /https?:\/\/(?:www\.)?doubao\.com\/video\/\d{10,}(?:\?[^\s'""]*)?/gi, type: 'doubao' },
  { pattern: /https?:\/\/(?:www\.)?doubao\.com\/video-sharing\?[^\s'""]*/gi, type: 'doubao' },
  { pattern: /https?:\/\/(?:www\.)?doubao\.com\/thread\/[^\s'""]+/gi, type: 'doubao_image' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*doubao\.com\/[^\s'""]*/gi, type: 'doubao' },

  { pattern: /https?:\/\/channels\.weixin\.qq\.com\/[^\s'""]+/gi, type: 'wechat_channel' },
  { pattern: /https?:\/\/weixin\.qq\.com\/sph\/[^\s'""]+/gi, type: 'wechat_channel' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*channels\.weixin\.qq\.com\/[^\s'""]*/gi, type: 'wechat_channel' },

  { pattern: /https?:\/\/(?:www\.)?pearvideo\.com\/video_\d+(?:\?[^\s'""]*)?/gi, type: 'lishi' },
  { pattern: /https?:\/\/video\.li\/[^\s'""]*/gi, type: 'lishi' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*pearvideo\.com\/[^\s'""]*/gi, type: 'lishi' },

  { pattern: /https?:\/\/(?:www\.)?jimeng\.jianying\.com\/[^\s'""]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:www\.)?jimeng\.cn\/[^\s'""]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:www\.)?dreamina\.jianying\.com\/[^\s'""]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:www\.)?dreamina\.capcut\.com\/[^\s'""]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*jimeng\.jianying\.com\/[^\s'""]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*jimeng\.cn\/[^\s'""]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*dreamina\.capcut\.com\/[^\s'""]*/gi, type: 'jimeng' },
]

function dedupeKey(url: string, type: string): string {
  const stripQuery = (u: string) => u.split('?')[0]
  if (type === 'bilibili') {
    const m = url.match(/bilibili\.com\/video\/([ab]v[0-9a-zA-Z_-]+)/i)
    if (m) return `bilibili:${m[1].toLowerCase()}`
  }
  if (type === 'douyin') {
    const m = url.match(/douyin\.com\/video\/(\d+)/)
    if (m) return `douyin:${m[1]}`
  }
  if (type === 'dola') {
    const m = url.match(/dola\.com\/thread\/([0-9a-zA-Z_-]+)/i)
    if (m) return `dola:${m[1]}`
  }
  if (type === 'kuaishou') {
    const m = url.match(/kuaishou\.com\/short-video\/([0-9a-zA-Z_/-]+)/)
    if (m) return `kuaishou:${m[1]}`
  }
  if (type === 'toutiao') {
    const m = url.match(/toutiao\.com\/video\/(\d+)/) || url.match(/toutiao\.com\/(?:i|w|group|article)\/(\d+)/)
    if (m) return `toutiao:${m[1]}`
  }
  if (type === 'qianwen') {
    const m = url.match(/qianwen\.com\/(?:share\/)?chat\/([0-9a-zA-Z_-]+)/)
    if (m) return `qianwen:${m[1]}`
  }
  if (type === 'tiktok') {
    const m = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/)
    if (m) return `tiktok:${m[1]}`
  }
  if (type === 'acfun') {
    const m = url.match(/acfun\.cn\/v\/ac(\d+)/)
    if (m) return `acfun:${m[1]}`
  }
  if (type === 'haokan') {
    const m = url.match(/haokan\.baidu\.com\/v\?vid=([0-9a-zA-Z_-]+)/)
    if (m) return `haokan:${m[1]}`
  }
  return stripQuery(url)
}

export function buildCustomLinkRules(customPlatforms: any[]): { pattern: RegExp; type: string }[] {
  if (!Array.isArray(customPlatforms) || customPlatforms.length === 0) return []
  return customPlatforms
    .filter(p => p.keywords)
    .map(p => {
      const keywords = p.keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
      if (keywords.length === 0) return null
      const escaped = keywords.map((k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const pattern = new RegExp(`https?://[^/\\s"'"]*(${escaped.join('|')})[^\\s"'"]*`, 'gi')
      return { pattern, type: `custom_${p.name}` }
    })
    .filter(Boolean) as { pattern: RegExp; type: string }[]
}

function cleanUrl(url: string): string {
  url = url.replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\\\//g, '/')
  url = url.replace(/^[\s"'<>\[\]()\u201c\u201d]+/, '')
  const trailingGarbage = /["',\s\u201c\u201d\)\]\}].*$/
  const cleaned = url.replace(trailingGarbage, '')
  if (cleaned) url = cleaned
  const tagStart = url.indexOf('<')
  if (tagStart > 0) url = url.slice(0, tagStart)
  try {
    const parsed = new URL(url)
    url = parsed.origin + parsed.pathname + parsed.search + parsed.hash
  } catch {}
  if (!/^https?:\/\//i.test(url)) {
    if (/^\/\//.test(url)) url = 'https:' + url
    else return url
  }
  return url
}

export function linkTypeParser(content: string, customRules: { pattern: RegExp; type: string }[]): LinkMatch[] {
  content = content.replace(/\\\//g, '/')
  const allRules = [...BUILTIN_LINK_RULES, ...customRules]
  const matches: (LinkMatch & { pos: number })[] = []
  const seen = new Set<string>()
  for (const rule of allRules) {
    let match: RegExpExecArray | null
    rule.pattern.lastIndex = 0
    while ((match = rule.pattern.exec(content)) !== null) {
      let url = match[0]
      url = cleanUrl(url)
      if (!url) continue
      const key = dedupeKey(url, rule.type)
      if (seen.has(key)) continue
      seen.add(key)
      matches.push({ type: rule.type, url, id: match[1] || url, pos: match.index })
    }
  }
  return matches.sort((a, b) => a.pos - b.pos).map(({ pos, ...m }) => m)
}

export function extractAllUrlsFromMessage(session: any, customRules: { pattern: RegExp; type: string }[]): LinkMatch[] {
  const content = session.content?.trim() || ''
  const matchedLinks = linkTypeParser(content, customRules)
  const cardsContent: string[] = []
  if (session.elements) {
    for (const elem of session.elements) {
      if (elem.type === 'xml' && typeof elem.data === 'string') cardsContent.push(elem.data)
      else if (elem.type === 'json' && elem.data) {
        try {
          const json = typeof elem.data === 'string' ? JSON.parse(elem.data) : elem.data
          const visited = new WeakSet<object>()
          const extract = (obj: any) => {
            if (!obj || typeof obj !== 'object' || visited.has(obj)) return
            visited.add(obj)
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
  const cleanResult: LinkMatch[] = []
  const seenUrls = new Set<string>()
  for (const link of matchedLinks) {
    const cleaned = cleanUrl(link.url)
    if (!cleaned || !/^https?:\/\//i.test(cleaned)) continue
    const key = dedupeKey(cleaned, link.type)
    if (!seenUrls.has(key)) {
      seenUrls.add(key)
      cleanResult.push({ ...link, url: cleaned })
    }
  }
  return cleanResult
}
