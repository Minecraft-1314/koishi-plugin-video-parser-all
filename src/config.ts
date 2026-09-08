import { Schema } from 'koishi'

export const Config = Schema.intersect([
  Schema.object({
    enable: Schema.boolean().default(true).description('是否启用视频解析插件'),
    botName: Schema.string().default('视频解析机器人').description('合并转发中显示的昵称'),
    showWaitingTip: Schema.boolean().default(true).description('显示等待提示'),
    debug: Schema.boolean().default(false).description('开启调试日志'),
    platformEnabled: Schema.object({
      bilibili: Schema.boolean().default(true).description('哔哩哔哩'),
      douyin: Schema.boolean().default(true).description('抖音'),
      kuaishou: Schema.boolean().default(true).description('快手'),
      xiaohongshu: Schema.boolean().default(true).description('小红书'),
      weibo: Schema.boolean().default(true).description('微博'),
      xigua: Schema.boolean().default(true).description('西瓜视频'),
      youtube: Schema.boolean().default(true).description('YouTube'),
      tiktok: Schema.boolean().default(true).description('TikTok'),
      acfun: Schema.boolean().default(true).description('AcFun（A站）'),
      zhihu: Schema.boolean().default(true).description('知乎'),
      weishi: Schema.boolean().default(true).description('微视'),
      huya: Schema.boolean().default(true).description('虎牙'),
      haokan: Schema.boolean().default(true).description('好看视频'),
      meipai: Schema.boolean().default(true).description('美拍'),
      twitter: Schema.boolean().default(true).description('Twitter/X'),
      instagram: Schema.boolean().default(true).description('Instagram'),
      doubao: Schema.boolean().default(true).description('豆包'),
      doubao_image: Schema.boolean().default(true).description('豆包图片'),
      oasis: Schema.boolean().default(true).description('绿洲'),
      wechat_channel: Schema.boolean().default(true).description('视频号'),
      lishi: Schema.boolean().default(true).description('梨视频'),
      quanmin: Schema.boolean().default(true).description('全民直播'),
      pipigx: Schema.boolean().default(true).description('皮皮搞笑'),
      pipixia: Schema.boolean().default(true).description('皮皮虾'),
      zuiyou: Schema.boolean().default(true).description('最右'),
      jimeng: Schema.boolean().default(true).description('即梦/剪映'),
    }).description('各平台解析开关'),
  }).description('基本设置'),

  Schema.object({
    unifiedMessageFormat: Schema.string().role('textarea').default(
      '标题：${标题}\n作者：${作者}\n简介：${简介}\n音乐标题：${音乐标题}\n音乐作者：${音乐作者}\n点赞：${点赞数}\n收藏：${收藏数}\n转发：${转发数}\n播放：${播放数}\n评论：${评论数}\n图片数量：${图片数量}'
    ).description('文字格式，支持变量：${标题} ${作者} ${简介} ${视频时长} ${点赞数} ${收藏数} ${转发数} ${播放数} ${评论数} ${发布时间} ${图片数量} ${作者ID} ${音乐标题} ${音乐作者}，空行自动隐藏'),
  }).description('消息格式'),

  Schema.object({
    showImageText: Schema.boolean().default(true).description('发送文字内容'),
    showCoverImage: Schema.boolean().default(true).description('发送封面图片'),
    showCoverFile: Schema.boolean().default(true).description('封面是否以图片形式发送（关闭则只发送链接）'),
    showCoverText: Schema.boolean().default(true).description('发送封面前显示文字提示'),
    coverText: Schema.string().default('封面：').description('封面前显示的文字'),
    showImageFileNew: Schema.boolean().default(true).description('图片是否以图片形式发送（关闭则只发送链接）'),
    showAuthorAvatar: Schema.boolean().default(true).description('发送作者头像图片'),
    showAuthorAvatarFile: Schema.boolean().default(true).description('作者头像图片是否以图片形式发送（关闭则只发送链接）'),
    showAuthorAvatarText: Schema.boolean().default(true).description('作者头像前显示文字提示（将追加到文字消息末尾）'),
    authorAvatarText: Schema.string().default('作者头像：').description('作者头像前显示的文字'),
    showMusicCover: Schema.boolean().default(true).description('发送音乐封面图片'),
    showVideoFile: Schema.boolean().default(true).description('视频是否以视频形式发送（关闭则只发送链接）'),
  }).description('媒体发送'),

  Schema.object({
    showMusicVoice: Schema.boolean().default(false).description('音乐链接以语音形式发送'),
    showMusicVoiceFile: Schema.boolean().default(true).description('音乐链接是否以语音形式发送（关闭则只发送链接）'),
  }).description('音乐语音（需 silk 和 ffmpeg）'),

  Schema.object({
    maxDescLength: Schema.number().min(0).step(1).default(200).description('简介长度上限'),
    maxConcurrent: Schema.number().min(1).step(1).default(3).description('解析最大并发数'),
  }).description('性能与限制'),

  Schema.object({
    timeout: Schema.number().min(0).step(1).default(180000).description('API 请求超时 (ms)'),
    videoSendTimeout: Schema.number().min(0).step(1).default(180000).description('消息发送超时 (ms)'),
    userAgent: Schema.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36').description('User-Agent'),
    apiKey: Schema.string().default('').description('api-new.ifphp.com API Key'),
    proxy: Schema.object({
      enabled: Schema.boolean().default(false).description('启用代理'),
      protocol: Schema.union([
        Schema.const('http').description('HTTP'),
        Schema.const('https').description('HTTPS'),
      ]).default('http').description('协议'),
      host: Schema.string().default('127.0.0.1').description('地址'),
      port: Schema.number().default(7890).description('端口'),
      auth: Schema.object({
        username: Schema.string().default('').description('用户名'),
        password: Schema.string().default('').description('密码'),
      }).description('认证'),
    }).description('HTTP/HTTPS 代理'),
    customHeaders: Schema.array(
      Schema.object({
        name: Schema.string().required().description('头名称'),
        value: Schema.string().required().description('头值'),
      })
    ).default([]).description('自定义请求头'),
  }).description('网络与请求'),

  Schema.object({
    ignoreSendError: Schema.boolean().default(true).description('忽略发送失败'),
    retryTimes: Schema.number().min(0).step(1).default(3).description('重试次数'),
    retryInterval: Schema.number().min(0).step(1).default(1000).description('重试间隔 (ms)'),
    enableForward: Schema.boolean().default(false).description('合并转发（OneBot/Satori）'),
  }).description('发送与重试'),

  Schema.object({
    deduplicationInterval: Schema.number().min(0).step(1).default(180).description('去重间隔 (s)'),
    enableDeduplication: Schema.boolean().default(true).description('启用重复解析检测与提示'),
    cacheTTL: Schema.number().min(0).step(1).default(600).description('缓存时间 (s)'),
  }).description('缓存与临时文件'),

  Schema.object({
    primaryApiUrl: Schema.string().default('https://api-new.ifphp.com/api/svparse').hidden(),
    platformDedicatedFirst: Schema.object({
      bilibili: Schema.boolean().default(false).description('哔哩哔哩'),
      douyin: Schema.boolean().default(false).description('抖音'),
      kuaishou: Schema.boolean().default(false).description('快手'),
      xiaohongshu: Schema.boolean().default(false).description('小红书'),
      weibo: Schema.boolean().default(false).description('微博'),
      xigua: Schema.boolean().default(false).description('西瓜视频'),
      youtube: Schema.boolean().default(false).description('YouTube'),
      tiktok: Schema.boolean().default(false).description('TikTok'),
      acfun: Schema.boolean().default(false).description('AcFun（A站）'),
      zhihu: Schema.boolean().default(false).description('知乎'),
      weishi: Schema.boolean().default(false).description('微视'),
      huya: Schema.boolean().default(false).description('虎牙'),
      haokan: Schema.boolean().default(false).description('好看视频'),
      meipai: Schema.boolean().default(false).description('美拍'),
      twitter: Schema.boolean().default(false).description('Twitter/X'),
      instagram: Schema.boolean().default(false).description('Instagram'),
      doubao: Schema.boolean().default(false).description('豆包'),
      oasis: Schema.boolean().default(false).description('绿洲'),
      wechat_channel: Schema.boolean().default(false).description('视频号'),
      lishi: Schema.boolean().default(false).description('梨视频'),
      quanmin: Schema.boolean().default(false).description('全民直播'),
      pipigx: Schema.boolean().default(false).description('皮皮搞笑'),
      pipixia: Schema.boolean().default(false).description('皮皮虾'),
      zuiyou: Schema.boolean().default(false).description('最右'),
      jimeng: Schema.boolean().default(false).description('即梦/剪映'),
    }).description('优先使用专属 API'),
    customApis: Schema.array(
      Schema.object({
        platform: Schema.union([
          Schema.const('bilibili').description('哔哩哔哩'),
          Schema.const('douyin').description('抖音'),
          Schema.const('kuaishou').description('快手'),
          Schema.const('xiaohongshu').description('小红书'),
          Schema.const('weibo').description('微博'),
          Schema.const('xigua').description('西瓜视频'),
          Schema.const('youtube').description('YouTube'),
          Schema.const('tiktok').description('TikTok'),
          Schema.const('acfun').description('AcFun（A站）'),
          Schema.const('zhihu').description('知乎'),
          Schema.const('weishi').description('微视'),
          Schema.const('huya').description('虎牙'),
          Schema.const('haokan').description('好看视频'),
          Schema.const('meipai').description('美拍'),
          Schema.const('twitter').description('Twitter/X'),
          Schema.const('instagram').description('Instagram'),
          Schema.const('doubao').description('豆包'),
          Schema.const('jimeng').description('即梦/剪映'),
          Schema.const('oasis').description('绿洲'),
          Schema.const('wechat_channel').description('视频号'),
        ]).description('平台'),
        apiUrl: Schema.string().description('API 地址'),
        apiKey: Schema.string().description('API Key').default(''),
        authHeaderType: Schema.union([
          Schema.const('Bearer').description('Bearer'),
          Schema.const('X-API-Key').description('X-API-Key'),
          Schema.const('Custom').description('自定义'),
        ]).default('X-API-Key').description('认证头类型'),
        customHeaderName: Schema.string().default('X-API-Key').description('自定义头名称'),
        fieldMapping: Schema.string().role('textarea').default('{}').description('字段映射 JSON'),
      })
    ).default([]).description('覆盖内置平台 API'),
    customPlatforms: Schema.array(
      Schema.object({
        name: Schema.string().required().description('平台名称'),
        exampleUrl: Schema.string().description('示例链接'),
        keywords: Schema.string().required().description('关键词（逗号分隔）'),
        apiUrl: Schema.string().required().description('解析 API'),
        apiKey: Schema.string().default('').description('API Key'),
        authHeaderType: Schema.union([
          Schema.const('Bearer').description('Bearer'),
          Schema.const('X-API-Key').description('X-API-Key'),
          Schema.const('Custom').description('自定义'),
        ]).default('X-API-Key').description('认证头类型'),
        customHeaderName: Schema.string().default('X-API-Key').description('自定义头名称'),
        fieldMapping: Schema.string().role('textarea').default('{}').description('字段映射 JSON'),
        proxy: Schema.object({
          enabled: Schema.boolean().default(false).description('启用独立代理'),
          protocol: Schema.union([
            Schema.const('http').description('HTTP'),
            Schema.const('https').description('HTTPS'),
          ]).default('http').description('协议'),
          host: Schema.string().default('127.0.0.1').description('地址'),
          port: Schema.number().default(7890).description('端口'),
          auth: Schema.object({
            username: Schema.string().default('').description('用户名'),
            password: Schema.string().default('').description('密码'),
          }).description('认证'),
        }).description('独立代理（覆盖全局代理）'),
      })
    ).default([]).description('自定义新平台'),
    globalFieldMapping: Schema.string().role('textarea').default(
      '{\n' +
      '  "title": "data.title",\n' +
      '  "desc": "data.description",\n' +
      '  "author": "data.author.name",\n' +
      '  "uid": "data.author.id",\n' +
      '  "avatar": "data.author.avatar",\n' +
      '  "cover": "data.cover_url",\n' +
      '  "video": "data.video_url",\n' +
      '  "video_backup": "data.video_qualities",\n' +
      '  "videos": "data.videos",\n' +
      '  "type": "data.type",\n' +
      '  "like": "data.statistics.likes",\n' +
      '  "comment": "data.statistics.comments",\n' +
      '  "collect": "data.statistics.favorites",\n' +
      '  "share": "data.statistics.shares",\n' +
      '  "play": "data.statistics.plays",\n' +
      '  "duration": "data.duration",\n' +
      '  "publishTime": "data.create_time",\n' +
      '  "music_title": "data.music.title",\n' +
      '  "music_author": "data.music.author",\n' +
      '  "music_cover": "data.music.cover",\n' +
      '  "music_url": "data.music.url"\n' +
      '}'
    ).description('全局字段映射 JSON'),
  }).description('API 与平台'),

  Schema.object({
    waitingTipText: Schema.string().default('正在解析视频，请稍候...').description('等待提示'),
    unsupportedPlatformText: Schema.string().default('不支持该平台链接').description('不支持提示'),
    invalidLinkText: Schema.string().default('无效的视频链接').description('无效链接提示'),
    parseErrorPrefix: Schema.string().default('❌ 解析失败：').description('错误前缀'),
    parseErrorItemFormat: Schema.string().default('【${url}】: ${msg}').description('错误格式'),
    deduplicationTipText: Schema.string().default('链接 ${url} 在最近 ${interval} 秒内已解析过，已跳过。').description('重复解析提示，支持变量 ${url} ${interval}'),
  }).description('界面文本'),
])