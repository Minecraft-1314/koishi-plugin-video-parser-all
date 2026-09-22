import axios, { type AxiosRequestConfig } from 'axios'
import { ParsedData, ApiItem } from '../types'
import { parseApiResponse } from '../parser'
import { getFirst, getErrorMessage, delay, parseFieldMapping } from '../utils'
import { debugLog } from '../logger'

export async function fetchApi(
  http: ReturnType<typeof axios.create>,
  config: {
    maxDescLength: number
    apiKey?: string
    timeout?: number
    userAgent?: string
    retryTimes?: number
    retryInterval?: number
    customHeaders?: { name: string; value: string }[]
    primaryApiUrl?: string
    platformDedicatedFirst?: Record<string, boolean>
    globalFieldMapping?: string
  },
  url: string,
  type: string,
  platformConf?: {
    apiUrl?: string | null
    dedicatedFirst?: boolean
    apiKey?: string
    authHeaderType?: string
    customHeaderName?: string
    fieldMapping?: Record<string, string>
    customProxy?: any
  }
): Promise<ParsedData> {
  const cache = (http.defaults.params ||= {})
  const cacheStore: Map<string, { data: ParsedData; expire: number }> =
    (cache as any)._videoParserCache ||= new Map()
  const cacheTTL = (cache as any)._videoParserCacheTTL || 60000
  const cacheKey = url
  const cached = cacheStore.get(cacheKey)
  if (cached && cached.expire > Date.now()) return cached.data

  const { apiUrl: dedicatedUrl, dedicatedFirst, apiKey, authHeaderType, customHeaderName, fieldMapping, customProxy } = platformConf || {}
  const primaryApi = config.primaryApiUrl || 'https://api-new.ifphp.com/api/svparse'

  const apiList: ApiItem[] = []
  if (dedicatedFirst && dedicatedUrl) {
    apiList.push({ url: dedicatedUrl, label: `专属API(${type})`, apiKey, authHeaderType: authHeaderType || 'X-API-Key', customHeaderName: customHeaderName || 'X-API-Key', fieldMapping })
    apiList.push({ url: primaryApi, label: '默认主API', fieldMapping })
  } else {
    apiList.push({ url: primaryApi, label: '默认主API', fieldMapping })
    if (dedicatedUrl) apiList.push({ url: dedicatedUrl, label: `专属API(${type})`, apiKey, authHeaderType: authHeaderType || 'X-API-Key', customHeaderName: customHeaderName || 'X-API-Key', fieldMapping })
  }

  if (type.startsWith('custom_') && apiList.length === 0 && dedicatedUrl) {
    apiList.push({ url: dedicatedUrl, label: `自定义API(${type})`, apiKey, authHeaderType: authHeaderType || 'X-API-Key', customHeaderName: customHeaderName || 'X-API-Key', fieldMapping })
  }

  const customHeaders = config.customHeaders || []
  const maxRetries = config.retryTimes ?? 3
  const retryDelay = config.retryInterval || 1000
  let lastError: Error | null = null

  for (const api of apiList) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
          if (api.authHeaderType === 'Bearer') headers['Authorization'] = `Bearer ${api.apiKey}`
          else if (api.authHeaderType === 'Custom' && api.customHeaderName) headers[api.customHeaderName] = api.apiKey
          else headers['X-API-Key'] = api.apiKey
        }
        const proxyToUse = customProxy && customProxy.enabled ? customProxy : undefined
        const axiosConfig: AxiosRequestConfig = {
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
        const res = await http.get(api.url, axiosConfig)
        if (res.data) {
          const statusField = getFirst(res.data, ['code', 'status', 'status_code', 'ret', 'retcode', 'errno', 'errcode'])
          const isSuccess = statusField === undefined || statusField === 200 || statusField === 0 || statusField === '0' || statusField === 'success' || statusField === true
          if (isSuccess) {
            const parsed = parseApiResponse(res.data, config.maxDescLength, api.fieldMapping)
            cacheStore.set(cacheKey, { data: parsed, expire: Date.now() + cacheTTL })
            return parsed
          }
        }
        const apiErrorMsg = getFirst(res.data, ['error', 'message', 'msg', 'errmsg', 'err_msg', 'error_msg', 'description', 'detail'], `API返回错误码: ${getFirst(res.data, ['code', 'status', 'status_code', 'ret', 'retcode', 'errno', 'errcode'])}`)
        throw new Error(apiErrorMsg)
      } catch (error) {
        let errorMsg = ''
        if (axios.isAxiosError(error) && error.response?.data) {
          const data = error.response.data
          if (typeof data === 'object' && data !== null) {
            errorMsg = getFirst(data, ['error', 'message', 'msg', 'errmsg', 'err_msg', 'error_msg', 'description', 'detail'], '')
          } else if (typeof data === 'string') {
            errorMsg = data
          }
        }
        if (!errorMsg) {
          errorMsg = error instanceof Error ? error.message : String(error)
        }
        lastError = new Error(errorMsg)
        debugLog('ERROR', `${api.label} attempt ${attempt + 1} failed: ${lastError.message}`)
        if (axios.isAxiosError(error)) {
          if (!error.response) {
            if (attempt < maxRetries) { await delay(retryDelay); continue }
          }
          const status = error.response?.status
          if (status && (status >= 500 || status === 429)) {
            if (attempt < maxRetries) { await delay(retryDelay); continue }
          }
        }
        break
      }
    }
    debugLog('WARN', `${api.label} all retries failed`)
  }
  throw lastError || new Error('所有API请求全部失败')
}
