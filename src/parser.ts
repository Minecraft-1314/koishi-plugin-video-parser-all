import { ParsedData, VideoQuality } from './types'
import { getNestedValue, getFirst, safeJsonParse, normalizeUrl, parseCount, pickBestQuality } from './utils'
import { debugLog } from './logger'

export function parseApiResponse(raw: any, maxDescLen: number, fieldMapping?: Record<string, string>): ParsedData {
  debugLog('DEBUG', 'API raw response', raw)
  let data = raw?.data ?? raw ?? {}
  data = safeJsonParse(data)
  if (Array.isArray(data)) data = data[0] || {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = {}
  const extra = data.extra || {}

  const mapField = (name: string, paths: string[], fallback: () => any) => {
    if (fieldMapping && fieldMapping[name]) {
      const value = getNestedValue(raw, fieldMapping[name])
      if (value !== undefined) return value
    }
    return getFirst(raw, paths) ?? getFirst(data, paths.map(p => p.replace(/^data\./, ''))) ?? fallback()
  }

  let type = mapField('type', ['data.type', 'data.videoType', 'data.media_type', 'data.content_type', 'data.kind'], () => {
    let t = getFirst(data, ['type', 'videoType', 'media_type', 'content_type']) || ''
    if (!t) {
      if (data.images?.length > 0 && !data.url) t = 'image'
      else if (data.live_photo?.length > 0) t = 'live_photo'
      else t = 'video'
    }
    return t
  })
  if (!type) type = 'video'

  const authorObj = mapField('author', ['data.author', 'data.user', 'data.owner', 'data.uploader', 'data.creator', 'data.publisher', 'data.user_info', 'data.author_info', 'data.profile'], () => {})
  let author = '', uid = '', avatar = ''
  if (authorObj && typeof authorObj === 'object') {
    author = String(getFirst(authorObj, ['name', 'nick', 'nickname', 'screen_name', 'display_name', 'username', 'author_name', 'user_name']) || '')
    uid = String(getFirst(authorObj, ['uid', 'user_id', 'sec_uid', 'mid', 'profile_id', 'account_id', 'id', 'author_id']) || getFirst(data, ['uid', 'user_id', 'author_id', 'sec_uid', 'mid']) || '')
    avatar = String(getFirst(authorObj, ['avatar', 'profile_pic', 'avatar_url', 'head_img', 'user_avatar', 'avatar_thumb']) || getFirst(data, ['avatar', 'avatar_url']) || '')
  } else {
    author = String(mapField('author', ['data.author', 'data.auther', 'data.nickname', 'data.username', 'data.name', 'data.screen_name'], () => '') ?? '')
    uid = String(mapField('uid', ['data.uid', 'data.user_id', 'data.author_id', 'data.sec_uid', 'data.mid', 'data.account_id'], () => '') ?? '')
    avatar = String(mapField('avatar', ['data.avatar', 'data.avatar_url', 'data.head_img', 'data.profile_pic', 'data.user_avatar'], () => '') ?? '')
  }

  let title = String(mapField('title', ['data.title', 'data.subject', 'data.name', 'data.video_name', 'data.share_title', 'data.caption'], () => '') ?? '')
  let desc = String(mapField('desc', ['data.desc', 'data.description', 'data.content', 'data.text', 'data.caption', 'data.share_text', 'data.share_desc', 'data.intro', 'data.summary'], () => '') ?? '').slice(0, maxDescLen).trim()
  const coverRaw = mapField('cover', ['data.cover', 'data.cover_url', 'data.poster', 'data.thumbnail', 'data.thumb', 'data.pic_cover', 'data.video_cover', 'data.dynamic_cover', 'data.cover_img'], () => '')
  const cover = normalizeUrl(coverRaw)

  let video = ''
  let videos: VideoQuality[] = []
  const videoBackup = mapField('video_backup', ['data.video_backup', 'data.video_qualities', 'data.video_quality'], () => data.video_backup)
  if (Array.isArray(videoBackup) && videoBackup.length) {
    const bestQ = pickBestQuality(videoBackup)
    videos = bestQ
    video = bestQ[0]?.url || ''
  }
  if (!video) {
    const rawVideos = mapField('videos', ['data.videos', 'data.video_list'], () => data.videos)
    if (Array.isArray(rawVideos) && rawVideos.length) {
      const validVideos = rawVideos.filter((v: any) => v && v.url)
      if (validVideos.length) {
        video = validVideos[0].url
        videos = validVideos.map((v: any) => ({ quality: v.accept?.[0] || v.quality || 'unknown', url: v.url }))
      }
    }
  }
  if (!video && data.quality_urls && typeof data.quality_urls === 'object') {
    const entries = Object.entries(data.quality_urls)
    videos = entries.map(([label, url]) => ({ quality: label, url: String(url) }))
    if (videos.length) video = videos[0].url
  }
  if (!video) {
    const directVideo = mapField('video', [
      'data.video', 'data.video_url', 'data.play_url', 'data.play_addr', 'data.source_url', 'data.hd_url', 'data.sd_url', 'data.download_addr',
      'data.video_info.url', 'data.video_info.play_url', 'data.video_info.video_url',
      'data.play.url', 'data.play.play_url', 'data.download.url', 'data.download.play_url',
      'data.url_list[0]', 'data.url_list[0].url'
    ], () => data.url)
    if (typeof directVideo === 'string' && directVideo) {
      video = directVideo
    } else if (Array.isArray(directVideo)) {
      if (directVideo.length) {
        const first = directVideo[0]
        if (typeof first === 'string') video = first
        else if (first && first.url) video = first.url
      }
    } else if (directVideo && typeof directVideo === 'object' && directVideo.url) {
      video = String(directVideo.url)
    }
  }
  if (!video && data.url_list && Array.isArray(data.url_list)) {
    const firstUrl = data.url_list.find((u: any) => typeof u === 'string' ? u : u?.url)
    if (firstUrl) video = typeof firstUrl === 'string' ? firstUrl : firstUrl.url
  }
  if (!video && data.bitrate && Array.isArray(data.bitrate)) {
    for (const br of data.bitrate) {
      if (br && br.url) {
        video = br.url
        break
      }
    }
  }
  if (!video && data.play_info && typeof data.play_info === 'object') {
    video = getFirst(data.play_info, ['url', 'play_url', 'video_url'], '')
  }
  if (video) video = normalizeUrl(video)

  let images: string[] = []
  const directImages = mapField('images', [
    'data.images', 'data.imgurl', 'data.image_list', 'data.pics', 'data.pic_urls', 'data.photo_list', 'data.thumbnails', 'data.cover_list',
    'data.image_info', 'data.pic_list'
  ], () => data.images)
  const normalizeImage = (img: any): string => normalizeUrl(img)
  if (Array.isArray(directImages)) {
    images = directImages.map(normalizeImage).filter((url: string | null): url is string => !!url)
  } else if (Array.isArray(data.imgurl)) {
    images = data.imgurl.map(normalizeImage).filter((url: string | null): url is string => !!url)
  } else if (Array.isArray(data.image_info)) {
    images = data.image_info.map(normalizeImage).filter((url: string | null): url is string => !!url)
  } else if (Array.isArray(data.pic_list)) {
    images = data.pic_list.map(normalizeImage).filter((url: string | null): url is string => !!url)
  }

  const live_photo = Array.isArray(data.live_photo)
    ? data.live_photo
        .filter((lp: any) => lp && lp.image)
        .map((lp: any) => ({
          image: normalizeUrl(lp.image),
          video: normalizeUrl(lp.video)
        }))
    : []

  const musicCoverRaw = mapField('music_cover', ['data.music.cover', 'data.music.albumCover.url', 'data.music_info.cover', 'data.bgm.cover'], () => data.music?.cover || data.music?.albumCover?.url || '')
  const musicUrlRaw = mapField('music_url', ['data.music.url', 'data.music.playURL', 'data.music_info.url', 'data.bgm.url'], () => data.music?.url || data.music?.playURL || '')
  const music = {
    title: String(mapField('music_title', ['data.music.title', 'data.music.name', 'data.music_info.title', 'data.bgm.title'], () => data.music?.title || data.music?.name || '') ?? ''),
    author: String(mapField('music_author', ['data.music.author', 'data.music.artist', 'data.music_info.author', 'data.bgm.author'], () => data.music?.author || data.music?.artist || '') ?? ''),
    cover: normalizeUrl(musicCoverRaw),
    url: /[\s\[\]]/.test(normalizeUrl(musicUrlRaw)) ? '' : normalizeUrl(musicUrlRaw),
  }

  const statisticsObj = getFirst(data, ['statistics', 'stats', 'metrics', 'counts', 'extra'])
  const statPath = (obj: any, names: string[]) => {
    if (obj && typeof obj === 'object') {
      const found = getFirst(obj, names, undefined)
      if (found !== undefined) return found
      const nested = obj.statistics
      if (nested && typeof nested === 'object') return getFirst(nested, names, 0)
    }
    return 0
  }

  const like = parseCount(mapField('like', ['data.like', 'data.like_count', 'data.digg_count', 'data.favorite_count', 'data.upvote_count', 'data.heart_count', 'data.like_num'], () => statPath(statisticsObj, ['like_count', 'digg_count', 'favorite_count', 'upvote_count', 'heart_count', 'like_num']) ))
  const comment = parseCount(mapField('comment', ['data.comment', 'data.comment_count', 'data.reply_count', 'data.review_count', 'data.comment_num'], () => statPath(statisticsObj, ['comment_count', 'reply_count', 'review_count', 'comment_num']) ))
  const collect = parseCount(mapField('collect', ['data.collect', 'data.collect_count', 'data.save_count', 'data.bookmark_count'], () => statPath(statisticsObj, ['collect_count', 'save_count', 'bookmark_count']) ))
  const share = parseCount(mapField('share', ['data.share', 'data.share_count', 'data.repost_count', 'data.forward_count', 'data.retweet_count'], () => statPath(statisticsObj, ['share_count', 'repost_count', 'forward_count', 'retweet_count']) ))
  const play = parseCount(mapField('play', ['data.play', 'data.play_count', 'data.view_count', 'data.watch_count', 'data.click_count', 'data.read_count', 'data.pv'], () => statPath(statisticsObj, ['play_count', 'view_count', 'watch_count', 'click_count', 'read_count', 'pv']) ))

  let duration = 0
  const durationMsRaw = getFirst(data, ['duration_ms'], undefined)
    ?? getFirst(raw, ['data.duration_ms'], undefined)
    ?? extra.duration_ms
  let durationSecsRaw: any
  if (fieldMapping?.duration) {
    const mapped = getNestedValue(raw, fieldMapping.duration)
    if (mapped !== undefined && mapped !== null && mapped !== '') durationSecsRaw = mapped
  }
  if (durationSecsRaw === undefined) {
    durationSecsRaw = getFirst(raw, ['data.duration', 'data.video_length', 'data.play_duration', 'data.seconds', 'data.length'], undefined)
      ?? getFirst(data, ['duration', 'video_length', 'play_duration', 'seconds', 'length'], undefined)
  }
  if (durationSecsRaw !== undefined && durationSecsRaw !== null && durationSecsRaw !== '') {
    if (typeof durationSecsRaw === 'number') duration = Math.floor(durationSecsRaw)
    else {
      const num = parseFloat(String(durationSecsRaw).trim())
      if (!isNaN(num)) duration = Math.floor(num)
    }
  } else if (durationMsRaw !== undefined && durationMsRaw !== null && durationMsRaw !== '') {
    duration = Math.floor(Number(durationMsRaw) / 1000)
  }

  let publishTime = 0
  const timeRaw = mapField('publishTime', [
    'data.publishTime', 'data.publish_time', 'data.create_time', 'data.created_at', 'data.post_time', 'data.upload_time',
    'data.timestamp', 'data.date', 'data.datetime', 'data.pubdate', 'data.time'
  ], () => data.time)
  if (timeRaw !== undefined && timeRaw !== null) {
    if (typeof timeRaw === 'number') {
      publishTime = timeRaw
    } else {
      const str = String(timeRaw).trim()
      const parsed = Date.parse(str)
      if (!isNaN(parsed)) {
        publishTime = parsed
      } else {
        const num = parseInt(str, 10)
        if (!isNaN(num)) publishTime = num
      }
    }
    if (publishTime < 1000000000000 && publishTime > 1000000000) publishTime *= 1000
  } else if (extra.create_time) {
    publishTime = Number(extra.create_time) * 1000
  }

  const author_followers = parseCount(mapField('author_followers', ['data.author_extra.follower_count', 'extra.author_extra.follower_count', 'data.author_info.follower_count'], () => extra.author_extra?.follower_count ?? data.author_extra?.follower_count ?? 0))
  const author_signature = String(mapField('author_signature', ['data.author_extra.signature', 'extra.author_extra.signature', 'data.author_info.signature'], () => extra.author_extra?.signature ?? data.author_extra?.signature ?? '') ?? '')
  const admire = parseCount(mapField('admire', ['extra.statistics.admire_count', 'data.statistics.admire_count'], () => extra.statistics?.admire_count ?? data.statistics?.admire_count ?? 0))

  title = title.replace(/\[话题\]/g, '')
  desc = desc.replace(/\[话题\]/g, '')

  if (title && desc && title.trim() === desc.trim()) {
    desc = ''
  }

  if (title.trim().startsWith('#')) title = ''
  if (desc.trim().startsWith('#')) desc = ''

  return { type, title, desc, author, uid, avatar, cover, video, videos, images, live_photo, music, like, comment, collect, share, play, duration, publishTime, author_followers, author_signature, admire }
}
