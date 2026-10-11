import type { ParsedData } from './types'
import { formatDuration, formatPublishTime } from './utils'

const formatVarRegex = /\$\{([^}]+)\}/g
export const DEFAULT_MESSAGE_FORMAT = '标题：${标题}\n作者：${作者}\n简介：${简介}\n音乐标题：${音乐标题}\n音乐作者：${音乐作者}\n点赞：${点赞数}\n收藏：${收藏数}\n转发：${转发数}\n播放：${播放数}\n评论：${评论数}\n图片数量：${图片数量}'

export function generateFormattedText(p: ParsedData, format?: string, index?: number, total?: number): string {
  const imageCount = (p.images?.length || 0) || (p.live_photo?.length || 0)
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
    '音乐标题': p.music.title || '',
    '音乐作者': p.music.author || '',
  }

  const lines = (typeof format === 'string' && format ? format : DEFAULT_MESSAGE_FORMAT).split('\n')
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
    const newLine = line.replace(formatVarRegex, (_, name: string) => vars[name] ?? '')
    resultLines.push(newLine)
  }
  let text = resultLines.join('\n').trim()
  if (index !== undefined && total !== undefined && total > 1) {
    text = `【${index}/${total}】\n${text}`
  }
  return text
}
