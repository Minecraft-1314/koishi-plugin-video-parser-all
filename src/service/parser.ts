export { parseApiResponse } from '../parser'
import { generateFormattedText } from '../format'
import { debugLog } from '../logger'
import type { LinkMatch, ParsedData } from '../types'
import { fetchApi } from './api'

export async function processSingleUrl(
  http: ReturnType<typeof import('axios').default.create>,
  config: {
    maxDescLength: number
    unifiedMessageFormat: string
  },
  url: string,
  type: string,
  fieldMapping?: Record<string, string>,
  platformConf?: any
): Promise<{ success: true; data: { text: string; parsed: ParsedData } } | { success: false; msg: string; url: string }> {
  try {
    const info = await fetchApi(http, config, url, type, platformConf)
    if (info.video || info.images.length > 0 || info.live_photo.length > 0) return { success: true, data: { text: generateFormattedText(info, config.unifiedMessageFormat), parsed: info } }
    debugLog('WARN', `解析成功但无内容: ${url}`)
    return { success: false, msg: '解析接口返回空内容', url }
  } catch (error) {
    debugLog('ERROR', `解析失败: ${url}`, error instanceof Error ? error.message : String(error))
    return { success: false, msg: error instanceof Error ? error.message : String(error), url }
  }
}
