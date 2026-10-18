import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { ApiItem, ParsedData } from '../types'
import { parseApiResponse } from '../parser'
import { delay, getFirst } from '../utils'
import { debugLog, elapsedSince, isDebugEnabled, maskSecret } from '../logger'

interface CacheEntry {
  data: ParsedData
  expire: number
}

interface ApiRequest {
  url: string
  label: string
  apiKey?: string
  authHeaderType?: string
  customHeaderName?: string
  fieldMapping?: Record<string, string>
  videoIdParam?: string
}

interface PlatformConf {
  apiUrl?: string | null
  apiUrls?: string[]
  dedicatedFirst?: boolean
  apiKey?: string
  authHeaderType?: string
  customHeaderName?: string
  fieldMapping?: Record<string, string>
  customProxy?: any
  videoIdApiUrl?: string
  videoIdParam?: string
}

interface FetchConfig {
  maxDescLength: number
  authMode?: string
  timeout?: number
  userAgent?: string
  retryTimes?: number
  retryInterval?: number
  customHeaders?: { name: string; value: string }[]
  primaryApiUrl?: string
  cacheTTL?: number
  apiKey?: string
}

const cacheStores = new WeakMap<AxiosInstance, Map<string, CacheEntry>>()

function getCacheStore(http: AxiosInstance): Map<string, CacheEntry> {
  let store = cacheStores.get(http)
  if (!store) {
    store = new Map()
    cacheStores.set(http, store)
  }
  return store
}

function isSuccessStatus(value: any): boolean {
  if (value === undefined) return true
  if (value === true || value === 200 || value === 0) return true
  const normalized = String(value).trim().toLowerCase()
  return normalized === '200' || normalized === '0' || normalized === 'success' || normalized === 'ok'
}

function hasParseableContent(data: ParsedData): boolean {
  return Boolean(data.video || data.images.length || data.live_photo.length)
}

function getResponseMessage(data: any, statusField: any): string {
  const message = getFirst(data, ['error', 'message', 'msg', 'errmsg', 'err_msg', 'error_msg', 'description', 'detail'])
  if (message !== undefined) return String(message)
  return `API返回错误码: ${String(statusField ?? 'unknown')}`
}

function buildApiList(type: string, primaryApi: string, platformConf: PlatformConf | undefined, globalApiKey: string | undefined): ApiRequest[] {
  const { apiUrl, apiUrls, dedicatedFirst, apiKey, authHeaderType, customHeaderName, fieldMapping, videoIdApiUrl, videoIdParam } = platformConf || {}
  const configuredUrls = Array.from(new Set((apiUrls?.length ? apiUrls : apiUrl ? [apiUrl] : []).filter(Boolean)))
  const dedicatedItems: ApiRequest[] = configuredUrls.map((url, index) => ({
    url,
    label: `${type.startsWith('custom_') ? '自定义' : '专属'}API(${type})${configuredUrls.length > 1 ? `-${index + 1}` : ''}`,
    apiKey,
    authHeaderType: authHeaderType || 'X-API-Key',
    customHeaderName: customHeaderName || 'X-API-Key',
    fieldMapping,
  }))
  if (type.startsWith('custom_')) return dedicatedItems
  const primaryItem: ApiItem = {
    url: primaryApi,
    label: '默认主API',
    apiKey: globalApiKey,
    authHeaderType: 'X-API-Key',
    customHeaderName: 'X-API-Key',
    fieldMapping,
  }
  const orderedItems = dedicatedFirst ? [...dedicatedItems, primaryItem] : [primaryItem, ...dedicatedItems]
  const videoIdItem: ApiRequest[] = videoIdApiUrl && videoIdParam ? [{
    url: videoIdApiUrl,
    label: '抖音video_id原画API(zjyh)',
    apiKey,
    authHeaderType: authHeaderType || 'X-API-Key',
    customHeaderName: customHeaderName || 'X-API-Key',
    fieldMapping,
    videoIdParam,
  }] : []
  return Array.from(new Map([...orderedItems, ...videoIdItem].map(item => [`${item.url}::${item.videoIdParam || ''}`, item])).values())
}

function describeParsed(parsed: ParsedData) {
  return {
    type: parsed.type,
    title: parsed.title.slice(0, 60),
    author: parsed.author.slice(0, 40),
    video: Boolean(parsed.video),
    videos: parsed.videos.length,
    images: parsed.images.length,
    livePhoto: parsed.live_photo.length,
    avatar: Boolean(parsed.avatar),
    cover: Boolean(parsed.cover),
    musicCover: Boolean(parsed.music.cover),
    music: Boolean(parsed.music.url),
    duration: parsed.duration,
    publishTime: parsed.publishTime,
  }
}

export async function fetchApi(http: AxiosInstance, config: FetchConfig, url: string, type: string, platformConf?: PlatformConf): Promise<ParsedData> {
  const cacheStore = getCacheStore(http)
  const cacheTTL = config.cacheTTL ?? 60000
  const cacheKey = `${type}::${url}`
  const cached = cacheStore.get(cacheKey)
  if (cached && cached.expire > Date.now()) {
    debugLog('INFO', '命中缓存', { cacheKey, ttlLeft: cached.expire - Date.now(), type: cached.data.type })
    return cached.data
  }
  if (cached) {
    cacheStore.delete(cacheKey)
    debugLog('DEBUG', '缓存已过期', { cacheKey })
  }

  const primaryApi = config.primaryApiUrl || 'https://api-new.ifphp.com/api/svparse'
  const apiList = buildApiList(type, primaryApi, platformConf, config.apiKey)
  if (!apiList.length) throw new Error(`平台 ${type} 未配置解析API`)
  debugLog('INFO', 'API 调用顺序', apiList.map(api => ({
    label: api.label,
    url: api.url,
    param: api.videoIdParam || 'url',
    apiKey: maskSecret(api.apiKey),
    authHeaderType: api.authHeaderType,
  })))

  const customHeaders = config.customHeaders || []
  const maxRetries = config.retryTimes ?? 3
  const retryDelay = config.retryInterval ?? 1000
  const requestStartedAt = Date.now()
  let lastError: Error | null = null
  let lastVideoId = ''

  for (const api of apiList) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptStartedAt = Date.now()
      try {
        const headers: Record<string, string> = {
          'Referer': 'https://www.baidu.com/',
          'Content-Type': 'application/x-www-form-urlencoded',
        }
        if (config.userAgent) headers['User-Agent'] = config.userAgent
        for (const header of customHeaders) {
          if (header.name && header.value) headers[header.name] = header.value
        }
        if (api.apiKey && config.authMode !== 'query') {
          if (api.authHeaderType === 'Bearer') headers['Authorization'] = `Bearer ${api.apiKey}`
          else if (api.authHeaderType === 'Custom' && api.customHeaderName) headers[api.customHeaderName] = api.apiKey
          else headers['X-API-Key'] = api.apiKey
        }
        if (api.videoIdParam && !lastVideoId) {
          lastError = new Error('未取得抖音 video_id')
          debugLog('DEBUG', `${api.label} 跳过: 缺少 video_id`)
          break
        }
        const params: Record<string, string> = api.videoIdParam ? { [api.videoIdParam]: lastVideoId } : { url }
        if (config.authMode === 'query' && api.apiKey) params.key = api.apiKey
        const axiosConfig: AxiosRequestConfig = { params, headers }
        if (config.timeout !== undefined) axiosConfig.timeout = config.timeout
        const proxyToUse = platformConf?.customProxy
        if (proxyToUse?.enabled && proxyToUse.host) {
          axiosConfig.proxy = {
            protocol: proxyToUse.protocol || 'http',
            host: proxyToUse.host,
            port: proxyToUse.port || 7890,
            auth: proxyToUse.auth?.username ? { username: proxyToUse.auth.username, password: proxyToUse.auth.password || '' } : undefined,
          }
        }
        debugLog('DEBUG', `请求 ${api.label}`, {
          attempt: attempt + 1,
          url: api.url,
          params: { ...params, ...(params.key ? { key: maskSecret(params.key) } : {}) },
        })
        const res = await http.get(api.url, axiosConfig)
        const statusField = getFirst(res.data, ['code', 'status', 'status_code', 'ret', 'retcode', 'errno', 'errcode'])
        debugLog('DEBUG', `响应 ${api.label}`, elapsedSince(attemptStartedAt), {
          httpStatus: res.status,
          code: statusField,
          bytes: isDebugEnabled() ? JSON.stringify(res.data ?? null).length : undefined,
        })
        if (!isSuccessStatus(statusField)) throw new Error(getResponseMessage(res.data, statusField))
        const parsed = parseApiResponse(res.data, config.maxDescLength, api.fieldMapping)
        if (parsed.videoId) lastVideoId = parsed.videoId
        if (!hasParseableContent(parsed)) throw new Error('解析接口返回空内容')
        if (cacheTTL > 0) cacheStore.set(cacheKey, { data: parsed, expire: Date.now() + cacheTTL })
        debugLog('INFO', `解析成功 ${api.label}`, elapsedSince(requestStartedAt), describeParsed(parsed))
        return parsed
      } catch (error) {
        let errorMsg = ''
        if (axios.isAxiosError(error) && error.response?.data) {
          const data = error.response.data
          if (typeof data === 'object' && data !== null) {
            errorMsg = String(getFirst(data, ['error', 'message', 'msg', 'errmsg', 'err_msg', 'error_msg', 'description', 'detail'], '') || '')
          } else if (typeof data === 'string') {
            errorMsg = data
          }
        }
        if (!errorMsg) errorMsg = error instanceof Error ? error.message : String(error)
        lastError = new Error(errorMsg)
        debugLog('DEBUG', `${api.label} 第 ${attempt + 1} 次失败`, elapsedSince(attemptStartedAt), {
          message: lastError.message,
          axiosCode: axios.isAxiosError(error) ? error.code : undefined,
          httpStatus: axios.isAxiosError(error) ? error.response?.status : undefined,
        })
        if (axios.isAxiosError(error)) {
          if (!error.response && attempt < maxRetries) {
            await delay(retryDelay)
            continue
          }
          const status = error.response?.status
          if (status && (status >= 500 || status === 429) && attempt < maxRetries) {
            await delay(retryDelay)
            continue
          }
        }
        break
      }
    }
    debugLog('DEBUG', `${api.label} 重试结束`, elapsedSince(requestStartedAt))
  }
  throw lastError || new Error('所有API请求全部失败')
}
