export interface VideoQuality {
  quality: string
  url: string
  bit_rate?: number
}

export interface ParsedData {
  type: string
  title: string
  desc: string
  author: string
  uid: string
  avatar: string
  cover: string
  video: string
  videos: VideoQuality[]
  images: string[]
  live_photo: Array<{ image: string; video: string }>
  music: { title?: string; author?: string; cover?: string; url?: string }
  like: number
  comment: number
  collect: number
  share: number
  play: number
  duration: number
  publishTime: number
  author_followers: number
  author_signature: string
  admire: number
}

export interface LinkMatch {
  type: string
  url: string
  id: string
}

export interface ApiItem {
  url: string
  label: string
  apiKey?: string
  authHeaderType?: string
  customHeaderName?: string
  fieldMapping?: Record<string, string>
}

export interface CustomPlatformConfig {
  name: string
  apiUrl: string
  apiKey: string
  authHeaderType: string
  customHeaderName: string
  fieldMapping?: Record<string, string>
  proxy?: any
}
