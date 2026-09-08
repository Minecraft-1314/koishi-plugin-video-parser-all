import { VideoQuality } from './types'

export class SimpleLRUCache<V> {
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

export class ConcurrencyLimiter {
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

export function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatPublishTime(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const y = d.getFullYear()
  const mo = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const H = d.getHours().toString().padStart(2, '0')
  const i = d.getMinutes().toString().padStart(2, '0')
  return `${y}年${mo}月${day}日 ${H}:${i}`
}

export function pickBestQuality(videoBackup: any[]): VideoQuality[] {
  if (!Array.isArray(videoBackup)) return []
  return videoBackup.filter(v => v && v.url).map(v => ({
    quality: v.quality || v.label || 'unknown',
    url: v.url,
    bit_rate: Number(v.bit_rate || 0)
  })).sort((a, b) => b.bit_rate - a.bit_rate)
}

export function getNestedValue(obj: any, path: string): any {
  if (!path) return obj
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }
  return current
}

export function getFirst(obj: any, paths: string[], fallback?: any): any {
  for (const path of paths) {
    const val = getNestedValue(obj, path)
    if (val !== undefined && val !== null && val !== '') return val
  }
  return fallback
}

export function safeJsonParse(data: any): any {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
  return data
}

export function normalizeUrl(url: any): string {
  if (typeof url === 'string') {
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (/^\/\//.test(trimmed)) return 'https:' + trimmed
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed
    return 'https://' + trimmed
  }
  if (url && typeof url === 'object' && url.url) {
    return normalizeUrl(url.url)
  }
  if (Array.isArray(url) && url.length) {
    return normalizeUrl(url[0])
  }
  return ''
}

export function parseCount(val: any): number {
  if (val === undefined || val === null) return 0
  if (typeof val === 'number') return val
  const str = String(val).trim().replace(/,/g, '')
  if (!str) return 0
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

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as Record<string, unknown>).message)
  return String(error)
}

export function parseFieldMapping(mappingStr: string): Record<string, string> | undefined {
  if (!mappingStr || mappingStr.trim() === '{}' || mappingStr.trim() === '') return undefined
  try {
    const obj = JSON.parse(mappingStr)
    if (typeof obj === 'object' && !Array.isArray(obj)) return obj
    return undefined
  } catch {
    return undefined
  }
}
