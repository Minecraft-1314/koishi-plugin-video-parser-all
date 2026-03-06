import { Context, Schema, h, Logger } from 'koishi';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

export const name = 'video-parser-all';

export const Config = Schema.intersect([
  Schema.object({
    enable: Schema.boolean().default(true).description('是否启用视频解析插件'),
    botName: Schema.string().default('视频解析机器人').description('机器人显示名称'),
    showWaitingTip: Schema.boolean().default(true).description('解析时显示等待提示'),
    waitingTipText: Schema.string().default('正在解析视频，请稍候...').description('等待提示文本内容'),
    sameLinkInterval: Schema.number().min(0).default(180).description('相同链接重复解析间隔（秒）'),
  }).description('基础设置'),
  Schema.object({
    unifiedMessageFormat: Schema.string().role('textarea').default(`标题：${'${标题}'}
作者：${'${作者}'}
简介：${'${简介}'}
时长：${'${视频时长}'}
点赞：${'${点赞数}'}
投币：${'${投币数}'}
收藏：${'${收藏数}'}
转发：${'${转发数}'}
播放：${'${播放数}'}
评论：${'${评论数}'}`).description('统一消息格式'),
  }).description('统一消息格式'),
  Schema.object({
    showImageText: Schema.boolean().default(true).description('显示图文内容'),
    showVideoFile: Schema.boolean().default(true).description('发送视频文件（关闭则只发链接）'),
  }).description('内容显示设置'),
  Schema.object({
    maxDescLength: Schema.number().default(200).description('简介内容最大长度（字符）'),
  }).description('内容长度限制'),
  Schema.object({
    timeout: Schema.number().min(0).default(180000).description('API请求超时时间（毫秒）'),
    videoSendTimeout: Schema.number().min(0).default(0).description('视频发送超时时间（毫秒，0为不限制）'),
    userAgent: Schema.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36').description('请求UA标识'),
  }).description('网络与API设置'),
  Schema.object({
    ignoreSendError: Schema.boolean().default(true).description('忽略发送失败错误'),
    retryTimes: Schema.number().min(0).default(3).description('API请求重试次数'),
    retryInterval: Schema.number().min(0).default(1000).description('重试间隔时间（毫秒）'),
  }).description('错误与重试设置'),
  Schema.object({
    enableForward: Schema.boolean().default(false).description('启用合并转发（仅OneBot平台）'),
    downloadVideoBeforeSend: Schema.boolean().default(false).description('发送前先下载视频'),
    maxVideoSize: Schema.number().min(0).default(0).description('最大视频大小限制（MB，0为不限制）'),
    downloadThreads: Schema.number().min(0).max(10).default(0).description('多线程下载线程数（0为不使用多线程）'),
  }).description('发送方式设置'),
  Schema.object({
    messageBufferDelay: Schema.number().min(0).default(0).description('消息缓冲延迟（毫秒）'),
  }).description('消息处理设置'),
  Schema.object({
    autoClearCacheInterval: Schema.number().min(0).default(0).description('自动清理缓存间隔（分钟，0为关闭）'),
  }).description('缓存清理设置'),
]);

type PlatformType = 'bilibili' | 'douyin' | 'kuaishou' | 'weibo' | 'toutiao' | 'pipigx' | 'pipixia' | 'zuiyou';

type ParseResultData = {
  type: 'video' | 'image' | 'live' | 'live_photo' | '图集' | 'cv';
  rawData: any;
  title: string;
  author: string;
  desc: string;
  cover: string;
  images: string[];
  video: string;
  duration: number;
  durationFormatted: string;
  stat: Record<string, any>;
  totalImageCount: number;
  live_photo?: Array<{ image: string; video: string }>;
  h_w?: string[];
  jx?: any;
  quality_urls?: Record<string, string>;
  default_quality?: string;
  download_url?: string;
  play_count?: string;
  reposts_count?: number;
  attitudes_count?: number;
  comments_count?: number;
};

type ParseResult = {
  data: ParseResultData | null;
  success: boolean;
  msg: string;
};

type ProcessResult = {
  data: {
    text: string;
    cover: string;
    images: string[];
    video: string;
    type: 'video' | 'image' | 'live' | 'live_photo' | '图集' | 'cv';
    totalImageCount: number;
    live_photo?: Array<{ image: string; video: string }>;
    h_w?: string[];
    quality_urls?: Record<string, string>;
    default_quality?: string;
    download_url?: string;
  } | null;
  success: boolean;
  msg: string;
};

type LinkBufferItem = {
  urls: string[];
  timer: NodeJS.Timeout;
  tipMsgId?: string | number;
};

const processed = new Map<string, number>();
const linkBuffer = new Map<string, LinkBufferItem>();
const logger = new Logger(name);

const PLATFORM_KEYWORDS = {
  bilibili: ['bilibili', 'b23', 'B站', 'www.bilibili.com', 'm.bilibili.com', '哔哩哔哩', 'bilibili.com/opus', 'bilibili.com/video', 'b23.tv', 't.bilibili.com', 'bilibili.com/bangumi'],
  kuaishou: ['kuaishou', '快手', 'v.kuaishou.com', 'www.kuaishou.com', 'kwimgs.com', 'kuaishou.com/app'],
  weibo: ['weibo', '微博', 'weibo.com', 'video.weibo.com', 'm.weibo.cn', 'weibo.com/tv/show', 'weibo.com/feed'],
  toutiao: ['toutiao', '今日头条', 'm.toutiao.com', 'toutiao.com', 'ixigua.com', 'toutiao.com/video', 'ixigua.com/i'],
  pipigx: ['pipigx', '皮皮搞笑', 'h5.pipigx.com', 'ippzone.com', 'pipigx.com/share'],
  pipixia: ['pipixia', '皮皮虾', 'h5.pipix.com', 'ppxsign.byteimg.com', 'pipix.com/s', 'pipix.com/home'],
  douyin: ['douyin', '抖音', 'v.douyin.com', 'douyinpic.com', 'douyinvod.com', 'douyin.com/video', 'douyin.com/note', 'www.douyin.com', 'tiktok.com'],
  zuiyou: ['zuiyou', '最右', 'xiaochuankeji.cn', 'izuiyou.com', 'izuiyou.com/topic']
};

const API_CONFIG: Record<PlatformType, string> = {
  bilibili: 'https://api.xingzhige.com/API/b_parse',
  douyin: 'https://api.xingzhige.com/API/douyin/',
  kuaishou: 'https://api.bugpk.com/api/ksjx',
  weibo: 'https://api.bugpk.com/api/weibo',
  toutiao: 'https://api.bugpk.com/api/toutiao',
  pipigx: 'https://api.bugpk.com/api/pipigx',
  pipixia: 'https://api.bugpk.com/api/pipixia',
  zuiyou: 'https://api.bugpk.com/api/zuiyou'
};

const VARIABLE_MAPPING = {
  '标题': ['title', 'note_title', 'content_title', 'item.title', 'data.title', 'video.title', 'live.title', 'data.item.title', 'data.live.title', 'data.note.title', 'data.video_info.title', 'data.aweme_info.title', 'data.video_data.title', 'data.post_title', 'data.article_title', 'data.video_title', 'data.work_title', 'data.media_title', 'data.caption'],
  '作者': ['author', 'author.name', 'name', 'nickname', 'user_name', 'owner.name', 'data.author', 'item.author', 'user.name', 'live.author', 'data.user.name', 'data.author.name', 'data.note.author', 'data.user', 'data.user_info', 'data.owner_info', 'data.creator', 'data.username', 'data.author_name', 'data.user_nickname', 'data.publisher', 'data.uploader'],
  '简介': ['desc', 'description', 'content', 'note_desc', 'text', 'data.desc', 'item.description', 'live.desc', 'data.item.description', 'data.note.desc', 'data.caption', 'data.detail', 'data.intro', 'data.introduce', 'data.summary', 'data.video_desc', 'data.post_content', 'data.article_content'],
  '视频时长': ['duration', 'time', 'video_duration', 'item.duration', 'stat.duration', 'data.item.duration', 'data.video_duration', 'data.video_time', 'data.play_time', 'data.length', 'data.video_length'],
  '点赞数': ['like', 'attitudes_count', 'digg_count', 'praise', 'stat.like', 'liked_count', 'data.like', 'data.attitudes_count', 'item.attitudes_count', 'data.item.attitudes_count', 'data.like_count', 'data.likes', 'data.praise_count', 'data.digg', 'data.favorited_count', 'data.love_count', 'data.up_count', 'data.zan'],
  '投币数': ['coin', 'bi', 'stat.coin', 'stast.coin', 'data.coin', 'data.coin_num', 'data.coin_count'],
  '收藏数': ['collect', 'favorite', 'star', 'stat.collect', 'collected_count', 'stast.favorite', 'data.favorite', 'data.collect_count', 'data.collection_count', 'data.star_count', 'data.bookmark_count', 'data.fav_count', 'data.save_count'],
  '转发数': ['share', 'forward', 'repost', 'stat.share', 'reposts_count', 'shared_count', 'stast.share', 'data.reposts_count', 'data.item.reposts_count', 'data.share_count', 'data.forward_count', 'data.repost_count'],
  '播放数': ['view', 'play_count', 'play', 'stat.view', 'play_times', 'stast.view', 'data.play_count', 'item.play_count', 'data.item.play_count', 'data.view_count', 'data.views', 'data.play_num', 'data.watch_count', 'data.video_play_count'],
  '评论数': ['comment', 'comments_count', 'comment_count', 'discuss', 'stat.comment', 'stast.reply', 'data.comments_count', 'item.comments_count', 'data.item.comments_count', 'stat.reply', 'data.comment_num', 'data.reply_count', 'data.review_count'],
  'IP属地': ['ip', 'ip_info', 'ip_location', 'ip_info_str', 'data.ip_info_str', 'item.ip', 'item.ip_info', 'data.item.ip_info_str', 'data.user_ip', 'data.location', 'data.region', 'data.area', 'data.addr'],
  '发布时间': ['date', 'time', 'publish_time', 'create_time', 'ctime', 'pubdate', 'data.date', 'item.publish_time', 'live.time', 'stast.publish_time', 'stat.time', 'data.time.publish_time', 'data.live.time', 'stat.ctime', 'data.upload_time', 'data.post_time', 'data.create_date', 'data.pub_time', 'data.timestamp'],
  '粉丝数': ['fans', 'fans_count', 'follower', 'followers', 'follower_count', 'followers_count', 'data.followers_count', 'item.followers', 'author.fans', 'data.item.followers_count', 'data.user_fans', 'data.fan_num'],
  '在线人数': ['online', 'online_count', 'data.online', 'live.online', 'room.online', 'data.live.online', 'data.watching', 'data.viewer_count', 'data.audience_count'],
  '关注数': ['follow', 'follow_count', 'attention', 'data.attention', 'live.attention', 'stast.attention', 'data.live.attention', 'data.following_count', 'data.follow_num'],
  '文件大小': ['size', 'size_str', 'item.size', 'item.size_str', 'data.size', 'data.item.size_str', 'data.file_size', 'data.video_size', 'data.vid_size'],
  '直播间地址': ['room_url', 'live.room_url', 'data.room_url', 'live.url', 'data.live.room_url', 'data.room_link', 'data.live_url', 'data.stream_url'],
  '直播间ID': ['room_id', 'live.room_id', 'data.room_id', 'live.room_id', 'data.live.room_id', 'data.live_id', 'data.stream_id'],
  '直播间状态': ['status', 'live_status', 'live.status', 'data.status', 'room.status', 'data.live.status', 'data.stream_status', 'data.room_status'],
  '图片数量': ['count', 'img_count', 'image_count', 'pic_count', 'data.count', 'item.count', 'images.length', 'data.images.length', 'data.item.count', 'data.pic_num', 'data.img_num'],
  '作者ID': ['uid', 'userid', 'user_id', 'userId', 'userID', 'author_id', 'data.userId', 'item.userID', 'author.mid', 'user.mid', 'data.item.userID', 'data.author_id', 'data.user.mid', 'author.id', 'short_id', 'data.author.id', 'data.uid', 'data.mid', 'data.open_id', 'data.account_id']
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function getFileSize(url: string, userAgent: string): Promise<number> {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      headers: {
        'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      return Math.round(Number(contentLength) / 1024 / 1024 * 100) / 100;
    }
  } catch (error) {}
  return 0;
}

async function downloadVideoThread(workerData: any) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`下载线程异常退出，代码：${code}`));
    });
  });
}

if (!isMainThread) {
  const { url, start, end, filename, userAgent } = workerData;
  const filePath = path.join(process.cwd(), 'temp_videos', `${filename}_${start}_${end}.part`);
  axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 60000,
    headers: {
      'User-Agent': userAgent,
      'Range': `bytes=${start}-${end}`
    }
  }).then(response => {
    const writeStream = fs.createWriteStream(filePath);
    response.data.pipe(writeStream);
    writeStream.on('finish', () => {
      parentPort?.postMessage({ success: true, filePath, start, end });
    });
    writeStream.on('error', (error) => {
      parentPort?.postMessage({ success: false, error: error.message });
    });
  }).catch(error => {
    parentPort?.postMessage({ success: false, error: error.message });
  });
}

async function downloadVideo(url: string, filename: string, userAgent: string, maxSize: number, threads: number): Promise<{ filePath: string; success: boolean }> {
  const dir = path.join(process.cwd(), 'temp_videos');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${filename}.mp4`);
  
  try {
    if (url.endsWith('.m4a') || url.endsWith('.mp3')) {
      return { filePath: '', success: false };
    }
    
    const fileSize = await getFileSize(url, userAgent);
    if (maxSize > 0 && fileSize > maxSize) {
      return { filePath: '', success: false };
    }
    
    if (threads <= 0 || fileSize === 0) {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const writeStream = fs.createWriteStream(filePath);
      await pipeline(response.data, writeStream);
      return { filePath, success: true };
    }
    
    const totalSize = fileSize * 1024 * 1024;
    const chunkSize = Math.ceil(totalSize / threads);
    const promises: Promise<any>[] = [];
    
    for (let i = 0; i < threads; i++) {
      const start = i * chunkSize;
      const end = i === threads - 1 ? totalSize - 1 : start + chunkSize - 1;
      promises.push(downloadVideoThread({
        url,
        start,
        end,
        filename,
        userAgent
      }));
    }
    
    const results = await Promise.all(promises);
    const writeStream = fs.createWriteStream(filePath);
    
    for (const result of results) {
      if (!result.success) throw new Error(result.error);
      const readStream = fs.createReadStream(result.filePath);
      await pipeline(readStream, writeStream, { end: false });
      fs.unlinkSync(result.filePath);
    }
    
    writeStream.end();
    return { filePath, success: true };
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    const partFiles = fs.readdirSync(dir).filter(file => file.startsWith(`${filename}_`) && file.endsWith('.part'));
    partFiles.forEach(file => {
      try {
        fs.unlinkSync(path.join(dir, file));
      } catch (e) {}
    });
    
    logger.error(`视频下载失败: ${getErrorMessage(error)}`);
    return { filePath: '', success: false };
  }
}

function extractUrl(content: string): string[] {
  let urlMatches = content.match(/https?:\/\/[^\s\"\'\>]+/gi) as string[] || [];
  return urlMatches.filter(url => {
    const lower = url.toLowerCase();
    return Object.values(PLATFORM_KEYWORDS).some(group => group.some(keyword => lower.includes(keyword)));
  });
}

function hasPlatformKeyword(content: string): boolean {
  const lower = content.toLowerCase();
  return Object.values(PLATFORM_KEYWORDS).some(group => group.some(keyword => lower.includes(keyword)));
}

function getPlatformType(url: string): PlatformType | null {
  const lower = url.toLowerCase();
  if (PLATFORM_KEYWORDS.bilibili.some(k => lower.includes(k))) return 'bilibili';
  if (PLATFORM_KEYWORDS.kuaishou.some(k => lower.includes(k))) return 'kuaishou';
  if (PLATFORM_KEYWORDS.weibo.some(k => lower.includes(k))) return 'weibo';
  if (PLATFORM_KEYWORDS.toutiao.some(k => lower.includes(k))) return 'toutiao';
  if (PLATFORM_KEYWORDS.pipigx.some(k => lower.includes(k))) return 'pipigx';
  if (PLATFORM_KEYWORDS.pipixia.some(k => lower.includes(k))) return 'pipixia';
  if (PLATFORM_KEYWORDS.douyin.some(k => lower.includes(k))) return 'douyin';
  if (PLATFORM_KEYWORDS.zuiyou.some(k => lower.includes(k))) return 'zuiyou';
  return null;
}

function cleanUrl(url: string): string {
  try {
    url = url.replace(/&amp;/g, '&');
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('douyin.com') || urlObj.hostname.includes('v.douyin.com')) {
      urlObj.searchParams.delete('source');
      urlObj.searchParams.delete('share_type');
      return urlObj.origin + urlObj.pathname;
    }
    return url;
  } catch (e) {
    return url.replace(/&amp;/g, '&').replace(/\?.*/, '');
  }
}

async function resolveShortUrl(url: string): Promise<string> {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.baidu.com/',
      },
      validateStatus: status => true
    });
    const finalUrl = res.request.res?.responseUrl || url;
    return cleanUrl(finalUrl);
  } catch (e) {
    return cleanUrl(url);
  }
}

function formatDuration(input: number | string): string {
  if (!input || input === 0 || input === '0' || input === '00:00') return '00:00:00';
  if (typeof input === 'string') {
    if (input.includes(':')) {
      const parts = input.split(':');
      if (parts.length === 2) return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
      return '00:00:00';
    }
    input = Number(input);
  }
  const seconds = Math.floor(Number(input));
  if (isNaN(seconds) || seconds <= 0 || seconds > 315360000) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatPublishTime(value: any): string {
  if (!value) return '';
  const str = String(value).trim();
  if (value === 'ctime') return '';
  if (/^\d{10}$/.test(str)) {
    value = Number(str) * 1000;
  }
  if (/^\d{10,}$/.test(str) && Number(str) > 1e12) {
    if (Number(str) > 1e15) {
      value = Number(str) / 1000;
    }
  }
  try {
    const d = new Date(/^\d+$/.test(str) ? Number(str) : str);
    if (isNaN(d.getTime())) return str;
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const d_ = d.getDate().toString().padStart(2, '0');
    const H = d.getHours().toString().padStart(2, '0');
    const i = d.getMinutes().toString().padStart(2, '0');
    const parts: string[] = [];
    if (y > 2000) parts.push(`${y}年`);
    if (m) parts.push(`${m}月`);
    if (d_) parts.push(`${d_}日`);
    if (H && i) parts.push(`${H}:${i}`);
    return parts.join(' ').trim();
  } catch {
    return str;
  }
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object' || !path) return undefined;
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }
  return value;
}

function findValueInObject(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object' || !keys || keys.length === 0) return undefined;
  for (const key of keys) {
    if (key.includes('.')) {
      const value = getNestedValue(obj, key);
      if (value !== undefined && value !== null && value !== '' && value !== 0) return value;
    } else {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '' && obj[key] !== 0) return obj[key];
      const lowerKey = key.toLowerCase();
      for (const objKey of Object.keys(obj)) {
        if (objKey.toLowerCase() === lowerKey) {
          const val = obj[objKey];
          if (val !== undefined && val !== null && val !== '' && val !== 0) return val;
        }
      }
    }
  }
  return undefined;
}

function parseData(rawResponse: any, maxDescLength: number): ParseResultData {
  const root = rawResponse || {};
  const data = root.data || root;
  const stat: Record<string, any> = {};
  let totalImageCount = 0;

  if (root.msg === 'live' && data.live) {
    const liveData = data.live;
    stat['标题'] = liveData.title || '';
    stat['直播间地址'] = liveData.room_url || '';
    stat['直播间ID'] = liveData.room_id || '';
    stat['直播间状态'] = liveData.status === 1 ? '直播中' : (liveData.status === 0 ? '未开播' : '未知');
    stat['在线人数'] = liveData.online || '';
    stat['关注数'] = liveData.attention || '';
    stat['发布时间'] = formatPublishTime(liveData.time);
    stat['简介'] = liveData.desc || '';
  }

  Object.entries(VARIABLE_MAPPING).forEach(([varName, keys]) => {
    if (stat[varName] !== undefined) return;
    
    let value = findValueInObject(data, keys) || findValueInObject(root, keys);
    if (varName === '图片数量' && value === undefined) {
      let imgCount = 0;
      const imgSources = [
        data.images, data.pics, data.pic_urls, data.image_list, data.imgurl,
        root.images, root.pics, root.pic_urls, root.image_list, root.imgurl,
        data.item?.images
      ];
      for (const source of imgSources) {
        if (Array.isArray(source) && source.length > 0) {
          imgCount = source.filter(i => i && typeof i === 'string').length;
          break;
        }
      }
      totalImageCount = imgCount;
      const cover = data.cover || data.video?.fm || data.imgurl || data.pic || data.thumbnail || data.cover_url ||
                     data.item?.cover || root.cover || data.live?.cover || data.live?.keyframe || '';
      if (cover && imgCount > 0) {
        imgCount = imgSources.find(source => Array.isArray(source))?.filter(i =>
          i && typeof i === 'string' && i !== cover
        ).length || 0;
      }
      value = totalImageCount;
    }
    if (value !== undefined && value !== null && value !== '' && value !== 0) {
      stat[varName] = value;
    }
  });

  let type = 'video';
  if (data.jx?.type) type = data.jx.type;
  else if (data.type) type = data.type;
  else if (root.msg === 'cv') type = 'cv';
  else if (root.msg === 'live') type = 'live';
  else if ((data.images && data.images.length > 1) || (root.images && root.images.length > 1) ||
           (data.imgurl && data.imgurl.length > 1) || (root.imgurl && root.imgurl.length > 1)) type = '图集';

  const title = stat['标题'] || data.title || '无标题';
  let author = '';
  if (data.author && typeof data.author === 'object') {
    author = data.author.name || '';
  } else {
    author = data.author || '';
  }
  author = author || stat['作者'] || '未知作者';
  const rawDesc = data.desc || data.content || stat['简介'] || '暂无简介';
  const desc = rawDesc.slice(0, maxDescLength);
  
  const cover = data.cover || data.live?.cover || data.live?.keyframe || '';
  const images = Array.isArray(data.images) ? data.images : [];
  
  const video = data.url || data.video_backup || (data.live?.url && Array.isArray(data.live.url) ? data.live.url[0] : '') || '';
  
  const durationValue = data.duration || 0;
  const duration = typeof durationValue === 'number' ? durationValue : parseInt(durationValue) || 0;
  const durationFormatted = formatDuration(durationValue);
  
  const pubTime = formatPublishTime(data.create_time || data.publish_time || data.live?.time);
  if (pubTime) stat['发布时间'] = pubTime;
  if (durationFormatted !== '00:00:00') stat['视频时长'] = durationFormatted;
  if (stat['图片数量'] === 0) delete stat['图片数量'];

  const live_photo = data.live_photo || [];
  const h_w = data.item?.h_w || [];
  const quality_urls = data.quality_urls || {};
  const default_quality = data.default_quality || '';
  const download_url = video;
  const play_count = stat['播放数'] || '';
  const reposts_count = Number(stat['转发数']) || 0;
  const attitudes_count = Number(stat['点赞数']) || 0;
  const comments_count = Number(stat['评论数']) || 0;

  return {
    type: type as any,
    rawData: rawResponse,
    title: String(title),
    author: String(author),
    desc: String(desc),
    cover: String(cover),
    images,
    video: String(video),
    duration,
    durationFormatted,
    stat,
    totalImageCount,
    live_photo,
    h_w,
    jx: data.jx || null,
    quality_urls,
    default_quality,
    download_url,
    play_count,
    reposts_count,
    attitudes_count,
    comments_count
  };
}

function generateFormattedText(parseData: ParseResultData, config: any): string {
  let format = config.unifiedMessageFormat || '';
  if (!format) {
    format = `标题：${'${标题}'}
作者：${'${作者}'}
简介：${'${简介}'}
时长：${'${视频时长}'}
点赞：${'${点赞数}'}
投币：${'${投币数}'}
收藏：${'${收藏数}'}
转发：${'${转发数}'}
播放：${'${播放数}'}
评论：${'${评论数}'}`;
  }
  
  let result = format;
  const varMatches: string[] = result.match(/\$\{([^}]+)\}/g) || [];
  
  varMatches.forEach((varMatch: string) => {
    const varName = varMatch.replace(/\$\{|\}/g, '');
    const value = parseData.stat[varName];
    if (value === undefined || value === null || value === '') {
      const lines = result.split('\n');
      result = lines.filter((line: string) => !line.includes(varMatch)).join('\n');
    } else {
      result = result.replace(varMatch, String(value));
    }
  });
  
  return result.trim() || `标题：${parseData.title}
作者：${parseData.author}
简介：${parseData.desc}`;
}

function clearAllCache(): boolean {
  processed.clear();
  linkBuffer.forEach(buf => clearTimeout(buf.timer));
  linkBuffer.clear();
  const tempDir = path.join(process.cwd(), 'temp_videos');
  if (fs.existsSync(tempDir)) {
    fs.readdirSync(tempDir).forEach(file => {
      try {
        fs.unlinkSync(path.join(tempDir, file));
      } catch (error) {}
    });
  }
  return true;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function buildForwardNode(session: any, content: any, botName: string) {
  let messageContent: any[];
  if (Array.isArray(content)) {
    messageContent = content;
  } else if (content && typeof content === 'object' && content.type) {
    messageContent = [content];
  } else {
    messageContent = [h.text(String(content))];
  }
  return h('node', {
    user: {
      nickname: botName.substring(0, 15),
      user_id: session.selfId
    }
  }, messageContent);
}

export function apply(ctx: Context, config: any) {
  clearAllCache();
  
  const http: AxiosInstance = axios.create({
    timeout: config.timeout,
    headers: {
      'User-Agent': config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.baidu.com/',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  async function parseWithRetry(url: string, platform: PlatformType, retryTimes: number): Promise<any> {
    let lastError: any = null;
    for (let i = 0; i <= retryTimes; i++) {
      try {
        const params = { url };
        const res = await http.get(API_CONFIG[platform], {
          params,
          timeout: config.timeout
        });
        return res.data;
      } catch (error) {
        lastError = error;
        if (i < retryTimes) {
          await delay(config.retryInterval * (i + 1));
        }
      }
    }
    throw lastError;
  }

  async function parse(url: string): Promise<ParseResult> {
    let realUrl = await resolveShortUrl(url);
    realUrl = cleanUrl(realUrl);
    
    const platform = getPlatformType(realUrl);
    if (!platform) {
      logger.error(`不支持的平台链接: ${url}`);
      return { data: null, success: false, msg: '不支持该平台链接' };
    }
    
    const apiUrl = API_CONFIG[platform];
    if (!apiUrl) {
      logger.error(`该平台暂未配置解析接口: ${platform}`);
      return { data: null, success: false, msg: '该平台暂未配置解析接口' };
    }
    
    try {
      const resData = await parseWithRetry(realUrl, platform, config.retryTimes);
      if (!resData || Object.keys(resData).length === 0) {
        logger.error(`API返回空数据: ${url}`);
        return { data: null, success: false, msg: '解析失败，API返回空数据' };
      }
      
      const isSuccess = resData.code === 0 || resData.code === 200 || resData.code === 1 ||
                       (resData.msg && (resData.msg.includes('解析成功') || resData.msg.includes('success') || resData.msg.includes('请求成功') || resData.msg === 'video' || resData.msg === 'cv' || resData.msg === 'live')) ||
                       !!resData.data || !!resData.result || !!resData.video || !!resData.images || !!resData.imgurl;
      
      if (!isSuccess) {
        const apiErrorMsg = resData.msg || resData.error || '解析失败';
        logger.error(`API返回错误: ${url} - ${apiErrorMsg}`);
        return { data: null, success: false, msg: `解析失败: ${apiErrorMsg}` };
      }
      
      try {
        const parseResult = parseData(resData, config.maxDescLength);
        
        const isAllDefault = 
          parseResult.title === '无标题' && 
          parseResult.author === '未知作者' && 
          parseResult.desc === '暂无简介';
        
        if (isAllDefault) {
          // 【关键修改1】控制台日志改为更精准的提示
          logger.warn(`解析结果均为默认值（可能暂不支持该链接）: ${url}`);
          return { 
            data: null, 
            success: false, 
            msg: '解析失败: 暂不支持解析该链接' 
          };
        }
        
        logger.info(`解析成功: ${url}`);
        return {
          data: parseResult,
          success: true,
          msg: '解析成功'
        };
      } catch (parseError) {
        const errorMsg = getErrorMessage(parseError);
        logger.error(`解析数据失败: ${url} - ${errorMsg}`);
        return { data: null, success: false, msg: `解析数据失败: ${errorMsg}` };
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      let msg = '未知错误';
      if (errorMsg.includes('timeout')) {
        msg = '请求超时';
      } else if (errorMsg.includes('Network') || errorMsg.includes('network') || errorMsg.includes('404') || errorMsg.includes('500')) {
        msg = '网络请求失败';
      }
      logger.error(`解析请求失败: ${url} - ${errorMsg}`);
      return { data: null, success: false, msg };
    }
  }

  async function processSingleUrl(session: any, url: string): Promise<ProcessResult> {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const now = Date.now();
    
    if (processed.get(hash) && now - processed.get(hash)! < config.sameLinkInterval * 1000) {
      logger.warn(`相同链接重复解析: ${url}`);
      return { data: null, success: false, msg: '请勿重复解析相同链接' };
    }
    
    processed.set(hash, now);
    const result = await parse(url);
    
    if (!result.success) return { data: null, success: false, msg: result.msg };
    
    const parseData = result.data!;
    const text = generateFormattedText(parseData, config);
    
    return {
      data: {
        text,
        cover: parseData.cover,
        images: parseData.images,
        video: parseData.video,
        type: parseData.type as any,
        totalImageCount: parseData.totalImageCount,
        live_photo: parseData.live_photo,
        h_w: parseData.h_w,
        quality_urls: parseData.quality_urls,
        default_quality: parseData.default_quality,
        download_url: parseData.download_url
      },
      success: true,
      msg: '处理成功'
    };
  }

  async function sendTimeout(session: any, content: any) {
    if (config.videoSendTimeout <= 0) {
      return session.send(content).catch((err: Error) => {
        const errorMsg = getErrorMessage(err);
        logger.error(`发送消息失败: ${errorMsg}`);
        if (!config.ignoreSendError) return null;
        return null;
      });
    }
    return Promise.race([
      session.send(content),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), config.videoSendTimeout))
    ]).catch((err: Error) => {
      const errorMsg = getErrorMessage(err);
      logger.error(`发送消息超时: ${errorMsg}`);
      if (!config.ignoreSendError) return null;
      return null;
    });
  }

  async function flush(session: any, manualUrls?: string[]) {
    const key = `${session.platform}:${session.userId}:${session.channelId}`;
    const buffer = linkBuffer.get(key);
    const urls = manualUrls || buffer?.urls || [];
    
    if (buffer) {
      clearTimeout(buffer.timer);
      linkBuffer.delete(key);
    }
    
    const items: any[] = [];
    const errors: any[] = [];
    
    for (const url of urls) {
      const result = await processSingleUrl(session, url);
      if (result.success) {
        items.push(result.data);
      } else {
        errors.push({ url, msg: result.msg });
      }
    }
    
    if (errors.length > 0) {
      const errorLines = errors.map(err => `【${err.url.slice(0, 50)}${err.url.length > 50 ? '...' : ''}】: ${err.msg}`);
      const errorMsg = `❌ 解析失败：\n${errorLines.join('\n')}`;
      await sendTimeout(session, errorMsg);
      await delay(500);
    }
    
    // 已删除⚠ 未解析到有效内容提示
    if (items.length === 0) {
      return;
    }
    
    const enableForward = config.enableForward && session.platform === 'onebot';
    const forwardMessages: any[] = [];
    const botName = config.botName || '视频解析机器人';
    
    for (const item of items) {
      try {
        if (enableForward) {
          if (item.text) forwardMessages.push(buildForwardNode(session, item.text, botName));
          if (item.cover && item.type !== '图集') {
            forwardMessages.push(buildForwardNode(session, h.image(item.cover), botName));
          }
          if (item.video && config.showVideoFile) {
            try {
              if (config.downloadVideoBeforeSend) {
                const filename = crypto.createHash('md5').update(item.video).digest('hex');
                const dl = await downloadVideo(item.video, filename, config.userAgent, config.maxVideoSize, config.downloadThreads);
                if (dl.success) {
                  forwardMessages.push(buildForwardNode(session, h.file(dl.filePath), botName));
                } else {
                  forwardMessages.push(buildForwardNode(session, h.video(item.video), botName));
                }
              } else {
                forwardMessages.push(buildForwardNode(session, h.video(item.video), botName));
              }
            } catch (e) {
              forwardMessages.push(buildForwardNode(session, h.video(item.video), botName));
            }
          }
          if ((item.type === '图集' || item.type === 'image') && item.images?.length) {
            forwardMessages.push(buildForwardNode(session, `📸 图集内容（共${item.totalImageCount}张）`, botName));
            for (const img of item.images) {
              forwardMessages.push(buildForwardNode(session, h.image(img), botName));
            }
          }
        } else {
          if (item.text) {
            await sendTimeout(session, item.text);
            await delay(300);
          }
          if (item.cover && item.type !== '图集') {
            await sendTimeout(session, h.image(item.cover));
            await delay(300);
          }
          if (item.video && config.showVideoFile) {
            try {
              await sendTimeout(session, h.video(item.video));
            } catch (e) {
              await sendTimeout(session, h.video(item.video));
            }
            await delay(500);
          }
          if ((item.type === '图集' || item.type === 'image') && item.images?.length) {
            await sendTimeout(session, `📸 图集内容（共${item.totalImageCount}张）`);
            await delay(300);
            for (const img of item.images) {
              await sendTimeout(session, h.image(img));
              await delay(200);
            }
          }
        }
      } catch (e) {
        logger.error(`处理消息发送失败: ${getErrorMessage(e)}`);
      }
    }
    
    if (enableForward && forwardMessages.length) {
      try {
        await sendTimeout(session, h('message', { forward: true }, forwardMessages.slice(0, 100)));
      } catch (e) {
        for (const node of forwardMessages) {
          await sendTimeout(session, node.data.content);
          await delay(300);
        }
      }
    }
  }

  ctx.on('message', async (session) => {
    if (!config.enable) return;
    
    const content = session.content?.trim() || '';
    const urls = extractUrl(content);
    if (!urls.length) return;
    
    if (config.showWaitingTip) await sendTimeout(session, config.waitingTipText);
    await flush(session, urls);
  });

  ctx.command('parse <url>', '手动解析视频').action(async ({ session }, url) => {
    const us = extractUrl(url);
    if (!us.length) {
      await sendTimeout(session, '无效的视频链接');
      return;
    }
    await flush(session, us);
  });

  ctx.command('clear-cache', '清空缓存').action(async ({ session }) => {
    clearAllCache();
    await sendTimeout(session, '✅ 缓存已清空');
  });

  setInterval(() => {
    const now = Date.now();
    processed.forEach((t, h) => now - t > 86400000 && processed.delete(h));
  }, 3600000);

  if (config.autoClearCacheInterval > 0) {
    setInterval(() => {
      clearAllCache();
      logger.info('自动清理缓存完成');
    }, config.autoClearCacheInterval * 60 * 1000);
  }

  logger.info('视频解析插件已启动');
}