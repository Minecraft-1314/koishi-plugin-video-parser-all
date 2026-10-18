import { Logger } from 'koishi'

export const logger = new Logger('video-parser-all')

const MAX_LOG_LENGTH = 2000

let debugEnabled = false

export function setDebugEnabled(value: boolean): void {
  debugEnabled = value
}

export function isDebugEnabled(): boolean {
  return debugEnabled
}

export function maskSecret(value: unknown): string {
  const text = typeof value === 'string' ? value : ''
  if (!text) return '(empty)'
  if (text.length <= 10) return '***'
  return `${text.slice(0, 6)}***${text.slice(-4)}`
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    const text = JSON.stringify(value)
    return text === undefined ? String(value) : text
  } catch {
    return '[unserializable]'
  }
}

function write(level: string, line: string): void {
  const text = `[${new Date().toISOString()}] [${level}] ${line}`
  if (level === 'ERROR') logger.error(text)
  else if (level === 'WARN') logger.warn(text)
  else logger.info(text)
}

export function debugLog(level: string, ...args: any[]): void {
  const isProblem = level === 'WARN' || level === 'ERROR'
  if (!debugEnabled && !isProblem) return
  let line = args.map(stringify).join(' ')
  if (line.length > MAX_LOG_LENGTH) {
    let cut = MAX_LOG_LENGTH
    const code = line.charCodeAt(cut - 1)
    if (code >= 0xd800 && code <= 0xdbff) cut -= 1
    line = `${line.slice(0, cut)}...(len=${line.length})`
  }
  write(level, line)
}

export function elapsedSince(startedAt: number): string {
  return `+${Date.now() - startedAt}ms`
}

export function describeContent(content: any): string {
  if (content === null || content === undefined) return 'empty'
  if (typeof content === 'string') return content.length > 120 ? `text(${content.length}):${content.slice(0, 120)}` : `text(${content.length}):${content}`
  if (Array.isArray(content)) return content.map(describeContent).join(' + ')
  if (typeof content === 'object') {
    if (content.type) {
      const attrs = content.attrs || {}
      const brief: Record<string, any> = {}
      for (const key of ['src', 'url', 'file', 'id', 'type', 'forward', 'content']) {
        if (attrs[key] !== undefined) brief[key] = typeof attrs[key] === 'string' ? String(attrs[key]).slice(0, 120) : attrs[key]
      }
      return `${content.type}${Object.keys(brief).length ? JSON.stringify(brief) : ''}`
    }
    return stringify(content).slice(0, 200)
  }
  return String(content)
}
