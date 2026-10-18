export { parseApiResponse } from '../parser'
import { generateFormattedText } from '../format'
import { debugLog, elapsedSince } from '../logger'
import type { ParsedData } from '../types'
import { fetchApi } from './api'

export async function processSingleUrl(
  http: import('axios').AxiosInstance,
  config: {
    maxDescLength: number
    unifiedMessageFormat: string
    authMode?: string
    timeout?: number
    userAgent?: string
    retryTimes?: number
    retryInterval?: number
    customHeaders?: { name: string; value: string }[]
    primaryApiUrl?: string
    cacheTTL?: number
    apiKey?: string
  },
  url: string,
  type: string,
  platformConf?: any
): Promise<{ success: true; data: { text: string; parsed: ParsedData } } | { success: false; msg: string; url: string }> {
  const startedAt = Date.now()
  try {
    const info = await fetchApi(http, config, url, type, platformConf)
    if (info.video || info.images.length > 0 || info.live_photo.length > 0) {
      const text = generateFormattedText(info, config.unifiedMessageFormat)
      debugLog('DEBUG', '文字内容已生成', elapsedSince(startedAt), { length: text.length, text: text.slice(0, 200) })
      return { success: true, data: { text, parsed: info } }
    }
    debugLog('WARN', `解析成功但无内容: ${url}`, elapsedSince(startedAt))
    return { success: false, msg: '解析接口返回空内容', url }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    debugLog('ERROR', `解析失败: ${url}`, elapsedSince(startedAt), message)
    return { success: false, msg: message, url }
  }
}
