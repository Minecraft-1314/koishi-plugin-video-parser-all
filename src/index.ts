import { Schema, h, Context, Session } from 'koishi';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { isMainThread, Worker, workerData, parentPort } from 'worker_threads';

const currentFilePath = path.join(process.cwd(), 'src', 'index.ts');

export const name = 'video-parser-all';

export const Config = Schema.object({
  enable: Schema.boolean().default(true).description('【基础设置】启用插件'),
  showWaitingTip: Schema.boolean().default(true).description('【基础设置】解析时显示等待提示'),
  waitingTipText: Schema.string().default('正在解析视频，请稍候...').description('【基础设置】解析等待时发送的提示文本'),
  sameLinkInterval: Schema.number().default(180).min(0).description('【基础设置】重复解析间隔：相同链接的最小解析间隔，防止重复解析（秒）'),
  imageParseFormat: Schema.string().role('textarea').default('${标题}\n${UP主}').description('【格式设置】解析结果格式：解析结果的文本格式\n支持变量：${标题} ${UP主} ${简介} ${tab}(制表符) ${~~~}(换行)'),
  returnContent: Schema.object({
    showImageText: Schema.boolean().default(true).description('【返回内容】显示文本与封面：是否显示解析后的文本和封面图'),
    showVideoUrl: Schema.boolean().default(false).description('【返回内容】显示无水印链接：是否显示无水印视频的直链'),
    showVideoFile: Schema.boolean().default(true).description('【返回内容】发送视频文件：是否发送视频文件（关闭则仅显示链接）'),
  }).description('【返回内容设置】控制解析结果的返回内容'),
  maxDescLength: Schema.number().default(200).description('【内容限制】简介最大长度：内容简介的最大字符长度，超出部分会被截断'),
  timeout: Schema.number().default(180000).min(0).description('【网络设置】API请求超时：API请求的超时时间（毫秒），0表示不限制'),
  ignoreSendError: Schema.boolean().default(true).description('【容错设置】忽略发送错误：忽略消息发送失败的错误，避免插件崩溃'),
  enableForward: Schema.boolean().default(false).description('【展示设置】启用合并转发：启用OneBot平台的合并转发功能，优化多内容展示'),
  downloadVideoBeforeSend: Schema.boolean().default(false).description('【展示设置】发送前下载视频：发送前先下载视频到本地，再发送文件（仅OneBot）'),
  messageBufferDelay: Schema.number().default(0).min(0).description('【性能设置】消息缓冲延迟：消息缓冲延迟，合并短时间内的多个解析请求（秒）'),
  retryTimes: Schema.number().default(0).min(0).description('【容错设置】接口重试次数：API解析失败时的重试次数，0表示不重试'),
  retryInterval: Schema.number().default(0).min(0).description('【容错设置】重试间隔：每次重试的间隔时间（毫秒）'),
  videoSendTimeout: Schema.number().default(0).min(0).description('【网络设置】视频发送超时：视频消息发送的超时时间（毫秒），0表示不限制'),
  autoClearCacheInterval: Schema.number().default(60).min(0).description('【缓存设置】自动清理缓存间隔：自动清理解析缓存和临时视频文件的间隔（分钟），0表示不自动清理'),
});

if (!isMainThread) {
  const { url, filePath } = workerData;
  (async () => {
    try {
      if (url.endsWith('.m4a') || url.endsWith('.mp3')) {
        parentPort?.postMessage({ success: false, error: '不支持音频' });
        return;
      }

      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      await pipeline(response.data, fs.createWriteStream(filePath));
      parentPort?.postMessage({ success: true, filePath });
    } catch (error) {
      parentPort?.postMessage({ success: false, error: error.message });
    }
  })();
}

const processed = new Map<string, number>();
const linkBuffer = new Map<string, { urls: string[], timer: NodeJS.Timeout, tipMsgId?: string | number }>();

const PLATFORM_KEYWORDS = {
  bilibili: ['bilibili', 'b23', 'B站', 'www.bilibili.com', 'm.bilibili.com'],
  kuaishou: ['kuaishou', '快手', 'v.kuishou.com', 'www.kuishou.com', 'kwimgs.com'],
  xiaohongshu: ['xiaohongshu', '小红书', 'xhslink.com', 'xiaohongshu.com', 'xhscdn.com'],
  weibo: ['weibo', '微博', 'weibo.com', 'video.weibo.com', 'svproxy.168299.xyz'],
  toutiao: ['toutiao', '今日头条', 'm.toutiao.com', 'toutiao.com', 'ixigua.com'],
  pipigx: ['pipigx', '皮皮搞笑', 'h5.pipigx.com', 'ippzone.com'],
  pipixia: ['pipixia', '皮皮虾', 'h5.pipix.com', 'ppxsign.byteimg.com'],
  douyin: ['douyin', '抖音', 'v.douyin.com', 'douyinpic.com', 'douyinvod.com']
};

const API_CONFIG = {
  universal: 'https://api.bugpk.com/api/short_videos',
  platform: {
    bilibili: ['https://api.bugpk.com/api/bilibili'],
    kuaishou: [
      'https://api.bugpk.com/api/ksjx',
      'https://api.bugpk.com/api/kuaishou',
      'https://api.bugpk.com/api/ksimg'
    ],
    xiaohongshu: [
      'https://api.bugpk.com/api/xhsjx',
      'https://api.bugpk.com/api/xhsimg',
      'https://api.bugpk.com/api/xhslive'
    ],
    weibo: [
      'https://api.bugpk.com/api/weibo',
      'https://api.bugpk.com/api/weibo_v'
    ],
    toutiao: ['https://api.bugpk.com/api/toutiao'],
    pipigx: ['https://api.bugpk.com/api/pipigx'],
    pipixia: ['https://api.bugpk.com/api/pipixia'],
    douyin: [
      'https://api.bugpk.com/api/douyin',
      'https://api.bugpk.com/api/dyjx',
      'https://api.bugpk.com/api/dylive'
    ]
  }
};

function extractUrl(content: string): string[] {
  const urlMatches = content.match(/https?:\/\/[^\s]+/gi) || [];
  return urlMatches.filter(url => {
    const lower = url.toLowerCase();
    return Object.values(PLATFORM_KEYWORDS).some(group => group.some(keyword => lower.includes(keyword)));
  });
}

function getPlatformType(url: string): string | null {
  const lower = url.toLowerCase();
  if (PLATFORM_KEYWORDS.kuaishou.some(k => lower.includes(k))) return 'kuaishou';
  if (PLATFORM_KEYWORDS.bilibili.some(k => lower.includes(k))) return 'bilibili';
  if (PLATFORM_KEYWORDS.xiaohongshu.some(k => lower.includes(k))) return 'xiaohongshu';
  if (PLATFORM_KEYWORDS.weibo.some(k => lower.includes(k))) return 'weibo';
  if (PLATFORM_KEYWORDS.toutiao.some(k => lower.includes(k))) return 'toutiao';
  if (PLATFORM_KEYWORDS.pipigx.some(k => lower.includes(k))) return 'pipigx';
  if (PLATFORM_KEYWORDS.pipixia.some(k => lower.includes(k))) return 'pipixia';
  if (PLATFORM_KEYWORDS.douyin.some(k => lower.includes(k))) return 'douyin';
  return null;
}

async function shortUrl(url: string): Promise<string> {
  try {
    const res = await axios.get('https://api.oick.cn/dwz/api.php', { params: { url }, timeout: 5000 });
    if (res.data.code === 200) return res.data.short_url;
  } catch (error) {
  }
  return url;
}

async function downloadVideoWithThreads(url: string, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = path.join(process.cwd(), 'temp_videos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${filename}.mp4`) as string;

    const worker = new Worker(currentFilePath, { workerData: { url, filePath } });
    worker.on('message', (result: { success: boolean, filePath?: string, error?: string }) => {
      if (result.success && result.filePath) {
        resolve(result.filePath);
      } else {
        reject(new Error(result.error || '下载失败'));
      }
    });
    worker.on('error', reject);
    worker.on('exit', (code: number) => {
      if (code !== 0) reject(new Error('视频下载线程异常'));
    });
  });
}

interface ParseResult {
  type: string;
  title: string;
  author: string;
  desc: string;
  cover: string;
  images: string[];
  video: string;
}

function parseData(data: any, maxDescLength: number, platform: string): ParseResult {
  const type = data.type || 'video';
  const title = data.title || data.desc || '无标题';
  
  let author = '';
  if (data.author?.name) author = data.author.name;
  else if (data.author) author = data.author;
  else if (data.auther) author = data.auther;
  else if (data.user?.name) author = data.user.name;
  else author = '未知作者';

  const desc = (data.desc || data.description || title).slice(0, maxDescLength);
  const cover = data.cover || data.imgurl || data.pic || '';
  
  let images: string[] = [];
  if (data.images) images = data.images;
  else if (data.imgurl && Array.isArray(data.imgurl)) images = data.imgurl;

  let video = '';
  if (platform === 'douyin') {
    if (typeof data.url === 'string' && data.url.trim() && data.url.startsWith('http')) {
      video = data.url;
    } else if (Array.isArray(data.video_backup) && data.video_backup.length > 0) {
      video = data.video_backup[0]?.url || '';
    }
    if (video && (video.endsWith('.m4a') || video.endsWith('.mp3'))) video = '';
  } else if (platform === 'bilibili') {
    if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
      const hdVideo = data.videos.find((v: any) => v.title.includes('1080') || (v.url && v.url.includes('192')) || v.index === 1);
      video = hdVideo?.url || data.videos[0]?.url || '';
    } else if (data.url) {
      video = data.url;
    }
  } else {
    video = data.url || data.videos?.[0]?.url || data.video_backup?.[0]?.url || '';
  }

  if (video.endsWith('.m4a') || video.endsWith('.mp3')) video = '';

  return { type, title, author, desc, cover, images, video };
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
      } catch (error) {
      }
    });
  }
  return true;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function apply(ctx: Context, config: any) {
  if (!isMainThread) return;

  clearAllCache();

  const http = axios.create({
    timeout: config.timeout,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });

  async function parse(url: string): Promise<{ data: ParseResult | null, msg: string }> {
    const platform = getPlatformType(url);
    if (!platform) return { data: null, msg: '不支持该平台链接' };

    if (platform !== 'toutiao') {
      for (let retry = 0; retry <= config.retryTimes; retry++) {
        try {
          const res = await http.get(API_CONFIG.universal, { params: { url } });
          if ((res.data.code === 200 || res.data.code === 0) && res.data.data) {
            const parseResult = parseData(res.data.data, config.maxDescLength, platform);
            return { data: parseResult, msg: '解析成功' };
          } else if (res.data.code === 201) {
            break;
          }
        } catch (error) {
          if (retry === config.retryTimes) break;
          await delay(config.retryInterval);
        }
      }
    }

    const platformApis = API_CONFIG.platform[platform] || [];
    for (let apiIndex = 0; apiIndex < platformApis.length; apiIndex++) {
      const apiUrl = platformApis[apiIndex];
      for (let retry = 0; retry <= config.retryTimes; retry++) {
        try {
          const res = await http.get(apiUrl, { params: { url } });
          if ((res.data.code === 200 || res.data.code === 0) && (res.data.data || (platform === 'kuaishou' && res.data.images))) {
            let parseResult: ParseResult | null = null;
            if (platform === 'kuaishou' && res.data.images && !res.data.data) {
              parseResult = parseData({
                title: '快手图集',
                author: '未知作者',
                images: res.data.images,
                type: 'image'
              }, config.maxDescLength, platform);
            } else {
              parseResult = parseData(res.data.data || res.data, config.maxDescLength, platform);
            }
            return { data: parseResult, msg: '解析成功' };
          } else if (retry < config.retryTimes) {
            await delay(config.retryInterval);
            continue;
          } else {
            break;
          }
        } catch (error) {
          if (retry === config.retryTimes) break;
          await delay(config.retryInterval);
        }
      }
    }

    return { data: null, msg: '所有接口解析失败，请稍后重试' };
  }

  async function processSingleUrl(session: Session, url: string): Promise<{ data: any, msg: string }> {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const now = Date.now();

    if (processed.get(hash) && now - processed.get(hash) < config.sameLinkInterval * 1000) {
      return { data: null, msg: '请勿重复解析' };
    }
    processed.set(hash, now);

    const result = await parse(url);
    if (!result.data) return { data: null, msg: result.msg };

    const parseData = result.data;
    let text = config.imageParseFormat
      .replace(/\${标题}/g, parseData.title)
      .replace(/\${UP主}/g, parseData.author)
      .replace(/\${简介}/g, parseData.desc)
      .replace(/\${tab}/g, '\t')
      .replace(/\${~~~}/g, '\n');

    return {
      data: {
        text,
        cover: parseData.cover,
        images: parseData.images,
        video: parseData.video,
        type: parseData.type
      },
      msg: 'ok'
    };
  }

  async function sendTimeout(session: Session, content: any) {
    if (config.videoSendTimeout <= 0) {
      return session.send(content).catch(() => null);
    }
    return Promise.race([
      session.send(content),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), config.videoSendTimeout))
    ]).catch(() => null);
  }

  async function flush(session: Session, manualUrls?: string[]) {
    const key = `${session.platform}:${session.userId}:${session.channelId}`;
    const buffer = linkBuffer.get(key);
    const urls = manualUrls || buffer?.urls || [];

    if (buffer) {
      clearTimeout(buffer.timer);
      linkBuffer.delete(key);
    }

    const items: any[] = [];
    const errs: string[] = [];
    for (const url of urls) {
      const result = await processSingleUrl(session, url);
      if (result.data) {
        items.push(result.data);
      } else {
        errs.push(`【${url.slice(0, 22)}...】：${result.msg}`);
      }
    }

    const forwardMessages: any[] = [];
    const botName = '视频解析机器人';

    if (errs.length) {
      const errorMsg = `⚠️ 部分解析失败\n${errs.join('\n')}`;
      if (config.enableForward && session.platform === 'onebot') {
        forwardMessages.push(h('message', [
          h('author', { id: session.selfId, name: botName }),
          errorMsg
        ]));
      } else {
        await sendTimeout(session, errorMsg);
        await delay(600);
      }
    }

    if (items.length === 0) {
      const failMsg = `❌ 全部解析失败\n${errs.join('\n')}`;
      if (config.enableForward && session.platform === 'onebot') {
        forwardMessages.push(h('message', [
          h('author', { id: session.selfId, name: botName }),
          failMsg
        ]));
      } else {
        await sendTimeout(session, failMsg);
      }
      return;
    }

    for (const item of items) {
      if (config.enableForward && session.platform === 'onebot') {
        forwardMessages.push(h('message', [
          h('author', { id: session.selfId, name: botName }),
          item.text
        ]));

        if (item.cover) {
          forwardMessages.push(h('message', [
            h('author', { id: session.selfId, name: botName }),
            h.image(item.cover)
          ]));
        }

        if (item.video && config.returnContent.showVideoFile) {
          let videoElem = h.video(item.video);
          if (config.downloadVideoBeforeSend) {
            try {
              const filename = crypto.createHash('md5').update(item.video).digest('hex');
              const filePath = await downloadVideoWithThreads(item.video, filename);
              videoElem = h.file(filePath as string);
            } catch (error) {
              videoElem = h.video(item.video);
            }
          }
          forwardMessages.push(h('message', [
            h('author', { id: session.selfId, name: botName }),
            videoElem
          ]));
        }

        if (item.video && config.returnContent.showVideoUrl) {
          const shortLink = await shortUrl(item.video);
          forwardMessages.push(h('message', [
            h('author', { id: session.selfId, name: botName }),
            `🔗 无水印：${shortLink}`
          ]));
        }

        if (item.type === 'image' && item.images?.length) {
          item.images.forEach(imgUrl => {
            forwardMessages.push(h('message', [
              h('author', { id: session.selfId, name: botName }),
              h.image(imgUrl)
            ]));
          });
        }
      } else {
        await sendTimeout(session, item.text);
        await delay(300);

        if (item.type === 'image' && item.images?.length) {
          const imgMsg = h('message', ...item.images.map(url => h.image(url)));
          await sendTimeout(session, imgMsg);
        } else {
          if (item.cover) {
            await sendTimeout(session, h.image(item.cover));
            await delay(300);
          }

          if (item.video && config.returnContent.showVideoFile) {
            let videoElem = h.video(item.video);
            if (config.downloadVideoBeforeSend) {
              try {
                const filename = crypto.createHash('md5').update(item.video).digest('hex');
                const filePath = await downloadVideoWithThreads(item.video, filename);
                videoElem = h.file(filePath as string);
              } catch (error) {
                videoElem = h.video(item.video);
              }
            }
            await sendTimeout(session, videoElem);
          }

          if (item.video && config.returnContent.showVideoUrl) {
            await delay(300);
            const shortLink = await shortUrl(item.video);
            await sendTimeout(session, `🔗 无水印：${shortLink}`);
          }
        }

        await delay(1000);
      }
    }

    if (config.enableForward && session.platform === 'onebot' && forwardMessages.length) {
      const forwardMsg = h('message', { forward: true }, forwardMessages);
      await sendTimeout(session, forwardMsg);
    }
  }

  ctx.on('message', async (session: Session) => {
    if (!config.enable) return;

    const urls = extractUrl(session.content.trim());
    if (!urls.length) return;

    const key = `${session.platform}:${session.userId}:${session.channelId}`;

    if (linkBuffer.has(key)) {
      const buffer = linkBuffer.get(key)!;
      const newUrls = urls.filter(url => !buffer.urls.includes(url));
      if (newUrls.length) {
        buffer.urls.push(...newUrls);
        clearTimeout(buffer.timer);
        buffer.timer = setTimeout(() => flush(session, undefined), config.messageBufferDelay * 1000);
      }
      return;
    }

    let tipMsgId: string | number | undefined;
    if (config.showWaitingTip) {
      const msg = await sendTimeout(session, config.waitingTipText);
      tipMsgId = msg?.messageId || msg?.id || msg;
    }

    linkBuffer.set(key, {
      urls,
      timer: setTimeout(() => flush(session, undefined), config.messageBufferDelay * 1000),
      tipMsgId
    });
  });

  ctx.command('parse <url>', '手动解析视频链接')
    .action(async ({ session }: { session: Session }, url?: string) => {
      if (!url) return '请输入视频链接';
      const urls = extractUrl(url);
      if (!urls.length) return '不支持该链接';
      await flush(session, urls);
    });

  ctx.command('clear-cache', '清空解析缓存与临时文件')
    .action(() => {
      clearAllCache();
      return '✅ 解析缓存已清空';
    });

  setInterval(() => {
    const now = Date.now();
    processed.forEach((timestamp, hash) => {
      if (now - timestamp > 86400000) processed.delete(hash);
    });
  }, 3600000);

  setInterval(() => {
    const tempDir = path.join(process.cwd(), 'temp_videos');
    if (!fs.existsSync(tempDir)) return;

    const now = Date.now();
    fs.readdirSync(tempDir).forEach(file => {
      try {
        const stat = fs.statSync(path.join(tempDir, file));
        if (now - stat.mtimeMs > 3600000) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      } catch (error) {
      }
    });
  }, 1800000);

  if (config.autoClearCacheInterval > 0) {
    setInterval(() => {
      clearAllCache();
      ctx.logger.info('自动清理缓存完成');
    }, config.autoClearCacheInterval * 60000);
  }

  process.on('exit', clearAllCache);

  ctx.logger.info('视频解析插件已加载');
}