import type { ParsedData } from './types'

export type SendKind = 'text' | 'cover' | 'avatar' | 'image' | 'musicCover' | 'video' | 'audio'

export interface ForwardMergeConfig {
  forwardMergeText: boolean
  forwardMergeImage: boolean
  forwardMergeCover: boolean
  forwardMergeAvatar: boolean
  forwardMergeMusicCover: boolean
  forwardMergeVideo: boolean
  forwardMergeMusic: boolean
}

export function buildMergeKinds(config: ForwardMergeConfig): Set<SendKind> {
  const kinds: SendKind[] = []
  if (config.forwardMergeText) kinds.push('text')
  if (config.forwardMergeImage) kinds.push('image')
  if (config.forwardMergeCover) kinds.push('cover')
  if (config.forwardMergeAvatar) kinds.push('avatar')
  if (config.forwardMergeMusicCover) kinds.push('musicCover')
  if (config.forwardMergeVideo) kinds.push('video')
  if (config.forwardMergeMusic) kinds.push('audio')
  return new Set(kinds)
}

export interface SendPlanItem {
  kind: SendKind
  label: string
  text?: string
  url?: string
  mediaType?: 'image' | 'video' | 'audio'
}

export interface SendSegment {
  merged: boolean
  items: SendPlanItem[]
}

export interface SendPlanConfig {
  showImageText: boolean
  showCoverImage: boolean
  showCoverFile: boolean
  showCoverText: boolean
  coverText: string
  showImageFileNew: boolean
  showAuthorAvatar: boolean
  showAuthorAvatarFile: boolean
  showAuthorAvatarText: boolean
  authorAvatarText: string
  showMusicCover: boolean
  showMusicCoverText: boolean
  musicCoverText: string
  showVideoFile: boolean
  showMusicVoice: boolean
  musicVoiceScope: string
  showMusicVoiceFile: boolean
  showVideo: boolean
}

export function hasPlayableVideo(parsed: ParsedData): boolean {
  if (!parsed.video) return false
  return parsed.type !== 'image' && parsed.type !== 'live_photo'
}

export function shouldSendMusic(parsed: ParsedData, config: SendPlanConfig): boolean {
  if (!config.showMusicVoice || !parsed.music?.url) return false
  if (config.musicVoiceScope === 'video') return hasPlayableVideo(parsed)
  if (config.musicVoiceScope === 'image') return !hasPlayableVideo(parsed)
  return true
}

export function groupSendPlan(plan: SendPlanItem[], mergeKinds: Set<SendKind>): SendSegment[] {
  const segments: SendSegment[] = []
  let buffer: SendPlanItem[] = []

  const flush = () => {
    if (!buffer.length) return
    segments.push({ merged: buffer.length > 1, items: buffer })
    buffer = []
  }

  for (const item of plan) {
    if (mergeKinds.has(item.kind)) {
      buffer.push(item)
      continue
    }
    flush()
    segments.push({ merged: false, items: [item] })
  }
  flush()
  return segments
}

export function buildSendPlan(parsed: ParsedData, config: SendPlanConfig, text: string): SendPlanItem[] {
  const plan: SendPlanItem[] = []
  const sentImages = new Set<string>()

  const addImage = (kind: SendKind, label: string, prefix: string, url: string, asFile: boolean) => {
    if (!url || sentImages.has(url)) return
    sentImages.add(url)
    if (asFile) plan.push({ kind, label, url, mediaType: 'image', text: prefix || undefined })
    else plan.push({ kind, label, text: `${label}链接：${url}` })
  }

  if (text && config.showImageText) plan.push({ kind: 'text', label: '文字', text })

  if (config.showAuthorAvatar && parsed.avatar) {
    const prefix = config.showAuthorAvatarText ? config.authorAvatarText || '作者头像：' : ''
    addImage('avatar', '作者头像', prefix, parsed.avatar, config.showAuthorAvatarFile)
  }

  if (config.showCoverImage && parsed.cover && parsed.type !== 'live_photo' && parsed.type !== 'image') {
    const prefix = config.showCoverText ? config.coverText || '封面：' : ''
    addImage('cover', '封面', prefix, parsed.cover, config.showCoverFile)
  }

  if (config.showMusicCover && parsed.music?.cover) {
    const prefix = config.showMusicCoverText ? config.musicCoverText || '音乐封面：' : ''
    addImage('musicCover', '音乐封面', prefix, parsed.music.cover, true)
  }

  if (parsed.type === 'live_photo' && parsed.live_photo?.length) {
    for (const livePhoto of parsed.live_photo) addImage('image', '图片', '', livePhoto.image, config.showImageFileNew)
  } else if (parsed.type === 'image') {
    const imageUrls = parsed.images?.length ? parsed.images : (parsed.live_photo?.map(livePhoto => livePhoto.image) ?? [])
    for (const imageUrl of imageUrls) addImage('image', '图片', '', imageUrl, config.showImageFileNew)
  }

  if (parsed.video && parsed.type !== 'live_photo' && config.showVideo !== false) {
    if (config.showVideoFile) plan.push({ kind: 'video', label: '视频', url: parsed.video, mediaType: 'video' })
    else plan.push({ kind: 'video', label: '视频', text: `视频链接：${parsed.video}` })
  }

  if (shouldSendMusic(parsed, config)) {
    const musicUrl = String(parsed.music.url)
    if (config.showMusicVoiceFile) plan.push({ kind: 'audio', label: '音乐', url: musicUrl, mediaType: 'audio' })
    else plan.push({ kind: 'audio', label: '音乐', text: `音乐链接：${musicUrl}` })
  }

  return plan
}
