import { LinkMatch } from './types'

export const BUILTIN_LINK_RULES: { pattern: RegExp; type: string }[] = [
  { pattern: /https?:\/\/(?:www\.)?bilibili\.com\/video\/([ab]v[0-9a-zA-Z_-]+)(?:\?[^\s'"“”‘’]*)?/gi, type: 'bilibili' },
  { pattern: /https?:\/\/(?:b23\.tv|b23\.wtf|bili\d+\.cn|bili2233\.cn|acg\.tv|biliintl\.com)\/[^\s'"“”‘’]*/gi, type: 'bilibili' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*bilibili\.com\/[^\s'"“”‘’]*/gi, type: 'bilibili' },

  { pattern: /https?:\/\/(?:www\.)?douyin\.com\/video\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'douyin' },
  { pattern: /https?:\/\/v\.douyin\.com\/[^\s'"“”‘’]*/gi, type: 'douyin' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*douyin\.com\/[^\s'"“”‘’]*/gi, type: 'douyin' },

  { pattern: /https?:\/\/(?:www\.)?kuaishou\.com\/short-video\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/v\.kuaishou\.com\/[^\s'"“”‘’]*/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:www\.)?kuaishou\.com\/f\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*kuaishou\.com\/[^\s'"“”‘’]*/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*gifshow\.com\/[^\s'"“”‘’]*/gi, type: 'kuaishou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*kwai\.com\/[^\s'"“”‘’]*/gi, type: 'kuaishou' },

  { pattern: /https?:\/\/(?:www\.)?xiaohongshu\.com\/discovery\/item\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'xiaohongshu' },
  { pattern: /https?:\/\/(?:xhslink\.com|xhslink\.cn|xhsurl\.cn|xhsurl\.com)\/[^\s'"“”‘’]*/gi, type: 'xiaohongshu' },
  { pattern: /https?:\/\/(?:www\.)?xiaohongshu\.com\/explore\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'xiaohongshu' },
  { pattern: /https?:\/\/(?:www\.)?xiaohongshu\.com\/board\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'xiaohongshu' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*xiaohongshu\.com\/[^\s'"“”‘’]*/gi, type: 'xiaohongshu' },

  { pattern: /https?:\/\/(?:www\.)?oasis\.weibo\.com\/v\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'oasis' },
  { pattern: /https?:\/\/(?:m\.)?oasis\.weibo\.cn\/[^\s'"“”‘’]*/gi, type: 'oasis' },
  { pattern: /https?:\/\/(?:www\.)?lvzhou\.com\/[^\s'"“”‘’]*/gi, type: 'oasis' },

  { pattern: /https?:\/\/weibo\.com\/\d+\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'weibo' },
  { pattern: /https?:\/\/video\.weibo\.com\/show\?fid=[0-9a-zA-Z_\/-]+/gi, type: 'weibo' },
  { pattern: /https?:\/\/t\.cn\/[^\s'"“”‘’]*/gi, type: 'weibo' },
  { pattern: /https?:\/\/m\.weibo\.cn\/[^\s'"“”‘’]+/gi, type: 'weibo' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*weibo\.com\/[^\s'"“”‘’]*/gi, type: 'weibo' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*weibo\.cn\/[^\s'"“”‘’]*/gi, type: 'weibo' },

  { pattern: /https?:\/\/(?:www\.)?ixigua\.com\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'xigua' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*ixigua\.com\/[^\s'"“”‘’]*/gi, type: 'xigua' },

  { pattern: /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}(?:&[^\s'"“”‘’]*)?/gi, type: 'youtube' },
  { pattern: /https?:\/\/youtu\.be\/[^\s'"“”‘’]*/gi, type: 'youtube' },
  { pattern: /https?:\/\/(?:www\.)?youtube\.com\/shorts\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'youtube' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*youtube\.com\/[^\s'"“”‘’]*/gi, type: 'youtube' },

  { pattern: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'tiktok' },
  { pattern: /https?:\/\/(?:vm|vt)\.tiktok\.com\/[^\s'"“”‘’]*/gi, type: 'tiktok' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*tiktok\.com\/[^\s'"“”‘’]*/gi, type: 'tiktok' },

  { pattern: /https?:\/\/(?:www\.)?acfun\.cn\/v\/ac\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'acfun' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*acfun\.cn\/[^\s'"“”‘’]*/gi, type: 'acfun' },
  { pattern: /https?:\/\/(?:acfun\.tv|acfun\.com)\/[^\s'"“”‘’]*/gi, type: 'acfun' },

  { pattern: /https?:\/\/(?:www\.)?zhihu\.com\/video\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'zhihu' },
  { pattern: /https?:\/\/(?:www\.|m\.)?zhihu\.com\/question\/\d+\/answer\/\d+(?:\?[^\s'"“”‘’]*)?/gi, type: 'zhihu' },
  { pattern: /https?:\/\/zhuanlan\.zhihu\.com\/p\/\d+(?:\?[^\s'"“”‘’]*)?/gi, type: 'zhihu' },
  { pattern: /https?:\/\/(?:www\.|m\.)?zhihu\.com\/zvideo\/\d+(?:\?[^\s'"“”‘’]*)?/gi, type: 'zhihu' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*zhihu\.com\/[^\s'"“”‘’]*/gi, type: 'zhihu' },
  { pattern: /https?:\/\/zhi\.hu\/[^\s'"“”‘’]+/gi, type: 'zhihu' },

  { pattern: /https?:\/\/weishi\.qq\.com\/weishi\/feed\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'weishi' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*weishi\.qq\.com\/[^\s'"“”‘’]*/gi, type: 'weishi' },
  { pattern: /https?:\/\/(?:www\.)?weishi\.com\/[^\s'"“”‘’]*/gi, type: 'weishi' },

  { pattern: /https?:\/\/(?:www\.)?huya\.com\/video\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'huya' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*huya\.com\/[^\s'"“”‘’]*/gi, type: 'huya' },

  { pattern: /https?:\/\/haokan\.baidu\.com\/v\?vid=[0-9a-zA-Z_\/-]+/gi, type: 'haokan' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*haokan\.baidu\.com\/[^\s'"“”‘’]*/gi, type: 'haokan' },
  { pattern: /https?:\/\/(?:www\.)?haokan\.com\/[^\s'"“”‘’]*/gi, type: 'haokan' },

  { pattern: /https?:\/\/(?:www\.)?meipai\.com\/media\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'meipai' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*meipai\.com\/[^\s'"“”‘’]*/gi, type: 'meipai' },

  { pattern: /https?:\/\/twitter\.com\/\w+\/status\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'twitter' },
  { pattern: /https?:\/\/x\.com\/\w+\/status\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'twitter' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*(?:twitter\.com|x\.com)\/[^\s'"“”‘’]*/gi, type: 'twitter' },
  { pattern: /https?:\/\/t\.co\/[^\s'"“”‘’]+/gi, type: 'twitter' },

  { pattern: /https?:\/\/(?:www\.)?instagram\.com\/p\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'instagram' },
  { pattern: /https?:\/\/(?:www\.)?instagram\.com\/reel\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'instagram' },
  { pattern: /https?:\/\/(?:www\.)?instagram\.com\/share\/(?:reel|p)\/[0-9a-zA-Z_\/-]+(?:\?[^\s'"“”‘’]*)?/gi, type: 'instagram' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*instagram\.com\/[^\s'"“”‘’]*/gi, type: 'instagram' },
  { pattern: /https?:\/\/(?:instagr\.am|ig\.me)\/[^\s'"“”‘’]+/gi, type: 'instagram' },

  { pattern: /https?:\/\/(?:www\.)?doubao\.com\/video\/\d{10,}(?:\?[^\s'"“”‘’]*)?/gi, type: 'doubao' },
  { pattern: /https?:\/\/(?:www\.)?doubao\.com\/video-sharing\?[^\s'"“”‘’]*/gi, type: 'doubao' },
  { pattern: /https?:\/\/(?:www\.)?doubao\.com\/thread\/[^\s'"“”‘’]+/gi, type: 'doubao_image' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*doubao\.com\/[^\s'"“”‘’]*/gi, type: 'doubao' },

  { pattern: /https?:\/\/channels\.weixin\.qq\.com\/[^\s'"“”‘’]+/gi, type: 'wechat_channel' },
  { pattern: /https?:\/\/weixin\.qq\.com\/sph\/[^\s'"“”‘’]+/gi, type: 'wechat_channel' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*channels\.weixin\.qq\.com\/[^\s'"“”‘’]*/gi, type: 'wechat_channel' },

  { pattern: /https?:\/\/(?:www\.)?pearvideo\.com\/video_\d+(?:\?[^\s'"“”‘’]*)?/gi, type: 'lishi' },
  { pattern: /https?:\/\/video\.li\/[^\s'"“”‘’]*/gi, type: 'lishi' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*pearvideo\.com\/[^\s'"“”‘’]*/gi, type: 'lishi' },

  { pattern: /https?:\/\/(?:www\.)?quanmin\.tv\/[^\s'"“”‘’]+/gi, type: 'quanmin' },
  { pattern: /https?:\/\/(?:www\.)?quanmintv\.cn\/[^\s'"“”‘’]+/gi, type: 'quanmin' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*quanmin\.tv\/[^\s'"“”‘’]*/gi, type: 'quanmin' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*quanmintv\.cn\/[^\s'"“”‘’]*/gi, type: 'quanmin' },

  { pattern: /https?:\/\/h5\.pipigx\.com\/pp\/post\/\d+(?:\?[^\s'"“”‘’]*)?/gi, type: 'pipigx' },
  { pattern: /https?:\/\/(?:www\.)?ippzone\.com\/[^\s'"“”‘’]+/gi, type: 'pipigx' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*pipigx\.com\/[^\s'"“”‘’]*/gi, type: 'pipigx' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*ippzone\.com\/[^\s'"“”‘’]*/gi, type: 'pipigx' },

  { pattern: /https?:\/\/(?:h5|www)\.pipix\.com\/[^\s'"“”‘’]+/gi, type: 'pipixia' },
  { pattern: /https?:\/\/(?:www\.)?pipixia\.com\/[^\s'"“”‘’]+/gi, type: 'pipixia' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*pipix\.com\/[^\s'"“”‘’]*/gi, type: 'pipixia' },

  { pattern: /https?:\/\/share\.xiaochuankeji\.cn\/hybrid\/share\/post\?pid=\d+/gi, type: 'zuiyou' },
  { pattern: /https?:\/\/(?:h5|www)\.izuiyou\.com\/[^\s'"“”‘’]+/gi, type: 'zuiyou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*izuiyou\.com\/[^\s'"“”‘’]*/gi, type: 'zuiyou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*ixiaochuan\.cn\/[^\s'"“”‘’]*/gi, type: 'zuiyou' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*zuiyou\.tv\/[^\s'"“”‘’]*/gi, type: 'zuiyou' },

  { pattern: /https?:\/\/(?:www\.)?jimeng\.jianying\.com\/[^\s'"“”‘’]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:www\.)?jimeng\.cn\/[^\s'"“”‘’]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:www\.)?dreamina\.jianying\.com\/[^\s'"“”‘’]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:www\.)?dreamina\.capcut\.com\/[^\s'"“”‘’]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*jimeng\.jianying\.com\/[^\s'"“”‘’]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*jimeng\.cn\/[^\s'"“”‘’]*/gi, type: 'jimeng' },
  { pattern: /https?:\/\/(?:[a-z0-9-]+\.)*dreamina\.capcut\.com\/[^\s'"“”‘’]*/gi, type: 'jimeng' },
]

export function buildCustomLinkRules(customPlatforms: any[]): { pattern: RegExp; type: string }[] {
  if (!Array.isArray(customPlatforms) || customPlatforms.length === 0) return []
  return customPlatforms
    .filter(p => p.keywords)
    .map(p => {
      const keywords = p.keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
      if (keywords.length === 0) return null
      const escaped = keywords.map((k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const pattern = new RegExp(`https?://[^/\\s"'“”‘’]*(${escaped.join('|')})[^\\s"'“”‘’]*`, 'gi')
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
  url = url.replace(/^[\s"'<（(“”‘’]+/, '')
  url = url.replace(/[\s"'<>\{\}\[\]`,;，。！？：；“”‘’…—～.()）]+$/, '')
  const tagStart = url.indexOf('<')
  if (tagStart > 0) url = url.slice(0, tagStart)
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
      if (seen.has(url)) continue
      seen.add(url)
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
  const cleanResult: LinkMatch[] = []
  const seenUrls = new Set<string>()
  for (const link of matchedLinks) {
    const cleaned = cleanUrl(link.url)
    if (!cleaned || !/^https?:\/\//i.test(cleaned)) continue
    if (!seenUrls.has(cleaned)) {
      seenUrls.add(cleaned)
      cleanResult.push({ ...link, url: cleaned })
    }
  }
  return cleanResult
}
