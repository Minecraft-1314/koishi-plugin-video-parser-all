import { Context, Schema, h, Logger } from 'koishi';
import axios, { AxiosInstance } from 'axios';

export const name = 'video-parser-all';

export const Config = Schema.intersect([
  Schema.object({
    enable: Schema.boolean().default(true).description('是否启用视频解析插件'),
    botName: Schema.string().default('视频解析机器人').description('合并转发消息中显示的机器人名称'),
    showWaitingTip: Schema.boolean().default(true).description('解析时显示等待提示'),
    debug: Schema.boolean().default(false).description('开启调试模式，在控制台输出详细日志'),
  }).description('基础设置'),

  Schema.object({
    unifiedMessageFormat: Schema.string().role('textarea').default(
      `\${标题}\n\${作者}\n\${简介}\n点赞：\${点赞数}\n收藏：\${收藏数}\n转发：\${转发数}\n播放：\${播放数}\n评论：\${评论数}`
    ).description('统一消息格式，可用变量：${标题} ${作者} ${简介} ${点赞数} ${收藏数} ${转发数} ${播放数} ${评论数} ${视频时长} ${发布时间} ${图片数量} ${作者ID} ${封面}'),
  }).description('消息格式设置'),

  Schema.object({
    showImageText: Schema.boolean().default(true).description('是否发送解析后的文字内容'),
    showVideoFile: Schema.boolean().default(true).description('是否发送视频文件（关闭则只发送视频链接）'),
    maxDescLength: Schema.number().default(200).description('简介内容最大长度（字符），超出自动截断'),
  }).description('内容显示设置'),

  Schema.object({
    timeout: Schema.number().min(0).default(180000).description('API 请求超时（毫秒）'),
    videoSendTimeout: Schema.number().min(0).default(60000).description('视频消息发送超时（毫秒，0 为不限制）'),
    userAgent: Schema.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36').description('API 请求 UA'),
  }).description('网络与 API 设置'),

  Schema.object({
    ignoreSendError: Schema.boolean().default(true).description('忽略消息发送失败，避免插件崩溃'),
    retryTimes: Schema.number().min(0).default(3).description('API 请求重试次数'),
    retryInterval: Schema.number().min(0).default(1000).description('重试间隔（毫秒）'),
  }).description('错误与重试设置'),

  Schema.object({
    enableForward: Schema.boolean().default(false).description('启用合并转发（仅 OneBot 平台）'),
  }).description('发送方式设置'),

  Schema.object({
    waitingTipText: Schema.string().default('正在解析视频，请稍候...').description('解析等待提示'),
    unsupportedPlatformText: Schema.string().default('不支持该平台链接').description('不支持的平台提示'),
    invalidLinkText: Schema.string().default('无效的视频链接').description('无效链接提示（parse 指令）'),
    parseErrorPrefix: Schema.string().default('❌ 解析失败：').description('解析失败消息前缀'),
    parseErrorItemFormat: Schema.string().default('【${url}】: ${msg}').description('每条解析失败格式，可用 ${url} ${msg}'),
  }).description('界面文字设置'),
]);

interface VideoQuality {
  quality: string;
  url: string;
  bit_rate?: number;
}

interface ParsedData {
  type: string;
  title: string;
  desc: string;
  author: string;
  uid: string;
  avatar: string;
  cover: string;
  video: string;
  videos: VideoQuality[];
  images: string[];
  live_photo: Array<{ image: string; video: string }>;
  music: { title?: string; author?: string; cover?: string; url?: string };
  like: number;
  comment: number;
  collect: number;
  share: number;
  play: number;
  duration: number;
  publishTime: number;
}

const logger = new Logger(name);

let debugEnabled = false;

function debugLog(level: string, ...args: any[]) {
  if (!debugEnabled) return;
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`;
  logger.info(message);
}

const PLATFORM_KEYWORDS: Record<string, string[]> = {
  bilibili: ['bilibili', 'b23', 'www.bilibili.com', 'm.bilibili.com', 'b23.tv', 't.bilibili.com', 'bilibili.com/video', 'bilibili.com/opus', 'bilibili.com/bangumi'],
  kuaishou: ['kuaishou', 'v.kuaishou.com', 'www.kuaishou.com', 'kwimgs.com'],
  weibo: ['weibo', 'weibo.com', 'video.weibo.com', 'm.weibo.cn', 'weibo.com/tv/show', 'weibo.com/feed'],
  toutiao: ['toutiao', 'm.toutiao.com', 'toutiao.com', 'ixigua.com', 'toutiao.com/video'],
  pipigx: ['pipigx', 'h5.pipigx.com', 'ippzone.com'],
  pipixia: ['pipixia', 'pipix', 'h5.pipix.com', 'ppxsign.byteimg.com', 'pipix.com'],
  douyin: ['douyin', 'v.douyin.com', 'douyinpic.com', 'douyinvod.com', 'douyin.com/video', 'douyin.com/note', 'www.douyin.com'],
  zuiyou: ['zuiyou', 'xiaochuankeji.cn', 'izuiyou.com'],
  xiaohongshu: ['xiaohongshu', 'xhslink.com', 'www.xiaohongshu.com'],
  jianying: ['jianying', 'jimeng.jianying.com', 'lv.ulikecam.com'],
  acfun: ['acfun', 'acfun.cn', 'www.acfun.cn'],
  zhihu: ['zhihu', 'zhihu.com', 'www.zhihu.com'],
  weishi: ['weishi', 'weishi.qq.com'],
  huya: ['huya', 'huya.com', 'www.huya.com'],
  youtube: ['youtube', 'youtube.com', 'youtu.be', 'www.youtube.com'],
  tiktok: ['tiktok', 'tiktok.com', 'www.tiktok.com'],
  xigua: ['xigua', 'ixigua.com'],
  haokan: ['haokan', 'haokan.baidu.com'],
  li: ['video.li'],
  meipai: ['meipai', 'meipai.com'],
  quanmin: ['quanmin', 'quanmin.tv'],
  twitter: ['twitter', 'x.com'],
  instagram: ['instagram', 'instagram.com'],
  doubao: ['doubao', 'doubao.com'],
  jimeng: ['jimeng', 'jimeng.ai'],
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function extractUrl(content: string): string[] {
  const urlMatches = content.match(/https?:\/\/[^\s\"\'\>]+/gi) || [];
  return urlMatches.filter(url => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname === 'multimedia.nt.qq.com.cn') return false;
      return Object.values(PLATFORM_KEYWORDS).some(group =>
        group.some(keyword =>
          hostname.includes(keyword) || (!keyword.includes('.') && url.toLowerCase().includes(keyword))
        )
      );
    } catch {
      const lower = url.toLowerCase();
      return Object.values(PLATFORM_KEYWORDS).some(group => group.some(keyword => lower.includes(keyword)));
    }
  });
}

function getPlatformType(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === 'multimedia.nt.qq.com.cn') return null;
    for (const [platform, keywords] of Object.entries(PLATFORM_KEYWORDS)) {
      if (keywords.some(k =>
        hostname.includes(k) || (!k.includes('.') && url.toLowerCase().includes(k))
      )) return platform;
    }
  } catch {}
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatPublishTime(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const y = d.getFullYear(), mo = (d.getMonth() + 1).toString().padStart(2, '0'), day = d.getDate().toString().padStart(2, '0'), H = d.getHours().toString().padStart(2, '0'), i = d.getMinutes().toString().padStart(2, '0');
  return `${y}年${mo}月${day}日 ${H}:${i}`;
}

function pickBestQuality(videoBackup: any[]): VideoQuality[] {
  if (!Array.isArray(videoBackup)) return [];
  return videoBackup
    .map(v => ({ quality: v.quality || v.label, url: v.url, bit_rate: v.bit_rate || 0 }))
    .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0));
}

function parseApiResponse(raw: any, maxDescLen: number): ParsedData {
  debugLog('DEBUG', '原始API返回数据:', raw);
  const data = raw?.data || {};
  const extra = data.extra || {};

  let type = data.type || '';
  if (!type) {
    if (data.images?.length > 0 && !data.url) type = 'image';
    else if (data.live_photo?.length > 0) type = 'live_photo';
    else if (raw.msg === 'live' || data.live) type = 'live';
    else type = 'video';
  }

  const authorObj = data.author;
  let author = '', uid = '', avatar = '';
  if (typeof authorObj === 'object' && authorObj) {
    author = authorObj.name || authorObj.author || '';
    uid = String(authorObj.id || data.uid || '');
    avatar = authorObj.avatar || data.avatar || '';
  } else {
    author = data.author || data.auther || '';
    uid = String(data.uid || '');
    avatar = data.avatar || '';
  }

  const title = data.title || '';
  const desc = (data.desc || data.description || '').slice(0, maxDescLen);
  const cover = data.cover || '';

  let video = '';
  let videos: VideoQuality[] = [];
  if (data.video_backup?.length) {
    const bestQ = pickBestQuality(data.video_backup);
    videos = bestQ;
    video = bestQ[0]?.url || data.url || '';
  } else if (data.videos?.length) {
    video = data.videos[0]?.url || '';
    videos = data.videos.map((v: any) => ({ quality: v.accept?.[0] || 'unknown', url: v.url }));
  } else {
    video = data.url || '';
  }

  const images: string[] = Array.isArray(data.images) ? data.images : [];
  const live_photo = Array.isArray(data.live_photo) ? data.live_photo : [];

  const music = {
    title: data.music?.title || data.music?.name || '',
    author: data.music?.author || data.music?.artist || '',
    cover: data.music?.cover || '',
    url: data.music?.url || ''
  };

  const stats = extra.statistics || {};
  const like = Number(data.like || stats.digg_count || 0);
  const comment = Number(stats.comment_count || 0);
  const collect = Number(stats.collect_count || 0);
  const share = Number(stats.share_count || 0);
  const play = Number(stats.play_count || 0);

  let duration = 0;
  if (data.duration) {
    duration = typeof data.duration === 'string' ? parseInt(data.duration) : data.duration;
    if (duration > 1000000) duration = Math.floor(duration / 1000);
  } else if (extra.duration_ms) {
    duration = Math.floor(extra.duration_ms / 1000);
  }

  let publishTime = 0;
  if (data.time) {
    publishTime = typeof data.time === 'number' ? data.time : parseInt(data.time);
    if (publishTime < 1000000000000) publishTime *= 1000;
  } else if (extra.create_time) {
    publishTime = extra.create_time * 1000;
  }

  return {
    type, title, desc, author, uid, avatar, cover,
    video, videos, images, live_photo, music,
    like, comment, collect, share, play,
    duration, publishTime
  };
}

function generateFormattedText(p: ParsedData, format: string): string {
  const imageCount = p.images.length || p.live_photo.length;
  const vars: Record<string, string> = {
    '标题': p.title,
    '作者': p.author,
    '简介': p.desc,
    '视频时长': p.duration > 0 ? formatDuration(p.duration) : '',
    '点赞数': String(p.like),
    '收藏数': String(p.collect),
    '转发数': String(p.share),
    '播放数': String(p.play),
    '评论数': String(p.comment),
    '发布时间': p.publishTime ? formatPublishTime(p.publishTime) : '',
    '图片数量': String(imageCount),
    '作者ID': p.uid,
    '封面': p.cover,
  };

  const lines = format.split('\n');
  const resultLines: string[] = [];

  for (const line of lines) {
    const varMatches = line.match(/\$\{([^}]+)\}/g);
    if (varMatches) {
      let allEmpty = true;
      for (const match of varMatches) {
        const varName = match.replace(/\$\{|\}/g, '');
        const val = vars[varName];
        if (val !== undefined && val !== '') {
          allEmpty = false;
          break;
        }
      }
      if (allEmpty) continue;
    }
    let newLine = line;
    for (const [key, value] of Object.entries(vars)) {
      newLine = newLine.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
    resultLines.push(newLine);
  }

  return resultLines.join('\n').trim();
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function buildForwardNode(session: any, content: any, botName: string) {
  let messageContent: any[];
  if (Array.isArray(content)) messageContent = content;
  else if (content && typeof content === 'object' && content.type) messageContent = [content];
  else messageContent = [h.text(String(content))];
  return h('node', { user: { nickname: botName.substring(0, 15), user_id: session.selfId } }, messageContent);
}

export function apply(ctx: Context, config: any) {
  debugEnabled = config.debug || false;
  debugLog('INFO', '插件初始化开始');

  const texts = {
    waitingTipText: config.waitingTipText || '正在解析视频，请稍候...',
    unsupportedPlatformText: config.unsupportedPlatformText || '不支持该平台链接',
    invalidLinkText: config.invalidLinkText || '无效的视频链接',
    parseErrorPrefix: config.parseErrorPrefix || '❌ 解析失败：',
    parseErrorItemFormat: config.parseErrorItemFormat || '【${url}】: ${msg}',
  };

  const http: AxiosInstance = axios.create({
    timeout: config.timeout,
    headers: {
      'User-Agent': config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.baidu.com/',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  async function fetchApi(url: string): Promise<ParsedData> {
    debugLog('INFO', `调用API解析: ${url}`);
    for (let i = 0; i <= config.retryTimes; i++) {
      try {
        const res = await http.get('https://api.bugpk.com/api/short_videos', {
          params: { url },
          timeout: config.timeout
        });
        debugLog('DEBUG', `API响应: ${JSON.stringify(res.data)}`);
        if (res.data && (res.data.code === 200 || res.data.code === 0)) {
          return parseApiResponse(res.data, config.maxDescLength);
        }
        throw new Error(res.data?.msg || '解析失败');
      } catch (error) {
        debugLog('ERROR', `第${i+1}次请求失败: ${getErrorMessage(error)}`);
        if (i < config.retryTimes) await delay(config.retryInterval * (i + 1));
      }
    }
    throw new Error('API请求全部失败');
  }

  async function parseUrl(url: string): Promise<{ success: true; data: ParsedData } | { success: false; msg: string }> {
    const realUrl = await resolveShortUrl(url);
    const platform = getPlatformType(realUrl);
    if (!platform) {
      return { success: false, msg: texts.unsupportedPlatformText };
    }

    for (const candidate of [url, realUrl]) {
      try {
        const info = await fetchApi(candidate);
        return { success: true, data: info };
      } catch (error) {
        debugLog('ERROR', `候选链接解析失败: ${candidate}`);
      }
    }
    return { success: false, msg: '解析失败' };
  }

  async function processSingleUrl(url: string): Promise<
    { success: true; data: { text: string; parsed: ParsedData } } | 
    { success: false; msg: string }
  > {
    const result = await parseUrl(url);
    if (!result.success) return result;
    const text = generateFormattedText(result.data, config.unifiedMessageFormat);
    return { success: true, data: { text, parsed: result.data } };
  }

  async function sendWithTimeout(session: any, content: any): Promise<any> {
    if (config.videoSendTimeout <= 0) {
      try { return await session.send(content); } catch (err) {
        if (!config.ignoreSendError) throw err;
        return null;
      }
    }
    try {
      return await Promise.race([
        session.send(content),
        new Promise((_, reject) => setTimeout(() => reject(new Error('发送超时')), config.videoSendTimeout))
      ]);
    } catch (err) {
      if (!config.ignoreSendError) throw err;
      return null;
    }
  }

  async function flush(session: any, urls: string[]) {
    const items: { text: string; parsed: ParsedData }[] = [];
    const errors: string[] = [];

    for (const url of urls) {
      const res = await processSingleUrl(url);
      if (res.success) {
        items.push(res.data);
      } else {
        const item = texts.parseErrorItemFormat
          .replace(/\$\{url\}/g, url.length > 50 ? url.slice(0,50)+'...' : url)
          .replace(/\$\{msg\}/g, res.msg);
        errors.push(item);
      }
    }

    if (errors.length) {
      await sendWithTimeout(session, `${texts.parseErrorPrefix}\n${errors.join('\n')}`).catch(() => {});
      await delay(500);
    }
    if (!items.length) return;

    const enableForward = config.enableForward && session.platform === 'onebot';
    const botName = config.botName || '视频解析机器人';
    const forwardMessages: any[] = [];

    for (const item of items) {
      const p = item.parsed;
      const text = item.text;

      if (text && config.showImageText) {
        if (enableForward) forwardMessages.push(buildForwardNode(session, text, botName));
        else { await sendWithTimeout(session, text); await delay(300); }
      }

      if (p.cover && p.type !== 'live_photo') {
        if (enableForward) forwardMessages.push(buildForwardNode(session, h.image(p.cover), botName));
        else { await sendWithTimeout(session, h.image(p.cover)).catch(() => {}); await delay(300); }
      }

      if (p.video && config.showVideoFile && (p.type === 'video' || p.type === 'live')) {
        const videoMsg = h.video(p.video);
        if (enableForward) {
          forwardMessages.push(buildForwardNode(session, videoMsg, botName));
        } else {
          try { await sendWithTimeout(session, videoMsg); } catch {}
          await delay(500);
        }
      }

      if (p.type === 'image' || p.type === 'live_photo') {
        const imageUrls = p.images?.length ? p.images : [];
        if (enableForward) {
          for (const url of imageUrls) {
            forwardMessages.push(buildForwardNode(session, h.image(url), botName));
          }
        } else {
          for (const url of imageUrls) {
            try { await sendWithTimeout(session, h.image(url)); await delay(200); } catch {}
          }
        }
      }
    }

    if (enableForward && forwardMessages.length) {
      try {
        await sendWithTimeout(session, h('message', { forward: true }, forwardMessages.slice(0, 100)));
      } catch {
        for (const node of forwardMessages) {
          try { await sendWithTimeout(session, node.data.content); await delay(300); } catch {}
        }
      }
    }
  }

  ctx.on('message', async (session) => {
    if (!config.enable) return;
    const content = session.content?.trim() || '';
    const urls = extractUrl(content);
    if (!urls.length) return;

    if (config.showWaitingTip) {
      try { await sendWithTimeout(session, texts.waitingTipText); } catch {}
    }
    await flush(session, urls);
  });

  ctx.command('parse <url>', '手动解析视频').action(async ({ session }, url) => {
    const us = extractUrl(url);
    if (!us.length) {
      await sendWithTimeout(session, texts.invalidLinkText);
      return;
    }
    await flush(session, us);
  });

  debugLog('INFO', '插件初始化完成');
}