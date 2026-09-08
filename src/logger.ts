import { Logger } from 'koishi'

export const logger = new Logger('video-parser-all')
let debugEnabled = false

export function setDebugEnabled(v: boolean): void {
  debugEnabled = v
}

export function debugLog(level: string, ...args: any[]): void {
  if (!debugEnabled) return
  const safe = args.map(a => {
    try {
      return typeof a === 'object' ? JSON.stringify(a) : String(a)
    } catch {
      return '[unserializable]'
    }
  })
  logger.info(`[${new Date().toISOString()}] [${level}] ${safe.join(' ')}`)
}