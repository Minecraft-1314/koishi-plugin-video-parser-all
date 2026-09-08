# koishi-plugin-video-parser-all

## 📌 重要公告
请务必阅读：
- [迁移说明 #12](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/12)
- [关于原版（koishi-plugin-video-parser-all）与 fork 版本（@char46/koishi-plugin-video-parser-all）的选择说明及反馈指引 #14](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/14)
- [fork 版本（@char46/koishi-plugin-video-parser-all）问题反馈专用 #13](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/13)

## 文档目录 (Documentation)

| 文档 | 说明 |
|------|------|
| [CHANGELOG-v1.6.7.md](docs/CHANGELOG-v1.6.7.md) | v1.6.7 版本更新日志 |
| [API_ADDRESSES.md](docs/API_ADDRESSES.md) | 插件 API 解析地址一览（主 API 与各平台专属接口） |
| [COMPATIBILITY.md](docs/COMPATIBILITY.md) | API 字段兼容性说明（支持的所有字段别名） |
| [LINK_RULES.md](docs/LINK_RULES.md) | 所有平台的链接匹配规则（正则表达式） |

## 项目介绍 (Project Introduction)

### 中文
这是一个为 Koishi 机器人框架开发的**全平台视频/图集解析插件**，支持自动识别并解析抖音、快手、B站、小红书、微博、西瓜视频、YouTube、TikTok、AcFun（A站）、知乎、微视、虎牙、好看视频、美拍、Twitter/X、Instagram、豆包（视频/图集）、**即梦（AI视频/图片）**、绿洲、视频号、梨视频、全民直播、皮皮搞笑、皮皮虾、最右等**20+主流平台**的短视频/图集/实况链接。

### English
This is a **cross-platform video/image parsing plugin** developed for the Koishi robot framework. It supports automatic recognition and parsing of short video/image/live links from **20+ mainstream platforms**, including Douyin, Kuaishou, Bilibili, Xiaohongshu, Weibo, Xigua Video, YouTube, TikTok, AcFun (A-site), Zhihu, Weishi, Huya, Haokan Video, Meipai, Twitter/X, Instagram, Doubao (video/image), **Jimeng (AI video/image)**, Oasis, Video Account, Pear Video, Quanmin Live, Pipi Funny, Pipi Shrimp, and Zuiyou.

## 项目仓库 (Repository)
- GitHub: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all`
- Issues: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues`

## 核心指令 (Core Commands)

| 指令 (Command) | 说明 (Description) | 示例 (Example) |
|----------------|--------------------|----------------|
| `parse <url>` | 手动解析指定的视频/图集链接 | `parse https://v.douyin.com/xxxx/` |

## 配置项说明 (Configuration)

### 基本设置 (Basic Settings)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `enable` | boolean | true | 启用插件 (Enable plugin) |
| `botName` | string | 视频解析机器人 | 合并转发中的昵称 (Nickname in forward messages) |
| `showWaitingTip` | boolean | true | 显示等待提示 (Show waiting tip) |
| `debug` | boolean | false | Debug 日志 (Debug logging) |
| `platformEnabled` | object | 全开 (All enabled) | 各平台开关 (Platform switches) |

### 消息格式 (Message Format)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `unifiedMessageFormat` | string | 见预设 (See preset) | 文字格式，支持变量：${标题} ${作者} ${简介} ${视频时长} ${点赞数} ${收藏数} ${转发数} ${播放数} ${评论数} ${发布时间} ${图片数量} ${作者ID} ${音乐标题} ${音乐作者}，空行自动隐藏 (Text format, supports variables: ${标题} ${作者} ${简介} ${视频时长} ${点赞数} ${收藏数} ${转发数} ${播放数} ${评论数} ${发布时间} ${图片数量} ${作者ID} ${音乐标题} ${音乐作者}, auto-hide empty lines) |

### 媒体发送 (Media Sending)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `showImageText` | boolean | true | 发送文字内容 (Send text content) |
| `showCoverImage` | boolean | true | 发送封面图片 (Send cover image) |
| `showCoverFile` | boolean | true | 封面是否以图片形式发送（关闭则只发送链接）(Send cover as image, otherwise link only) |
| `showCoverText` | boolean | true | 发送封面前显示文字提示 (Show text hint before cover image) |
| `coverText` | string | 封面： | 封面前显示的文字 (Text displayed before cover) |
| `showImageFileNew` | boolean | true | 图片是否以图片形式发送（关闭则只发送链接）(Send images as image, otherwise link only) |
| `showAuthorAvatar` | boolean | true | 发送作者头像图片 (Send author avatar image) |
| `showAuthorAvatarFile` | boolean | true | 作者头像图片是否以图片形式发送（关闭则只发送链接）(Send author avatar as image, otherwise link only) |
| `showAuthorAvatarText` | boolean | true | 作者头像前显示文字提示（将追加到文字消息末尾）(Show text hint before author avatar, appended to the text message) |
| `authorAvatarText` | string | 作者头像： | 作者头像前显示的文字 (Text displayed before author avatar) |
| `showMusicCover` | boolean | true | 发送音乐封面图片 (Send music cover image) |
| `showVideoFile` | boolean | true | 视频是否以视频形式发送（关闭则只发送链接）(Send video as file, otherwise link only) |

### 音乐语音 (Music Voice)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `showMusicVoice` | boolean | false | 音乐链接以语音发送 (Send music as voice) |
| `showMusicVoiceFile` | boolean | true | 音乐链接是否以语音形式发送（关闭则只发送链接）(Send as voice file, otherwise link only) |

### 性能与限制 (Performance & Limits)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `maxDescLength` | number | 200 | 简介长度上限 (Max description length) |
| `maxConcurrent` | number | 3 | 解析最大并发数 (Max concurrent parsing) |

### 网络与请求 (Network & Request)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `timeout` | number | 180000 | API 超时 (ms) (API timeout) |
| `videoSendTimeout` | number | 180000 | 发送超时 (ms) (Send timeout) |
| `userAgent` | string | 见预设 | User-Agent |
| `apiKey` | string | 空 | api-new.ifphp.com API Key |
| `proxy` | object | ... | HTTP/HTTPS 代理 (Proxy) |
| `customHeaders` | array | [] | 自定义请求头 (Custom headers) |

### 发送与重试 (Send & Retry)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `ignoreSendError` | boolean | true | 忽略发送失败 (Ignore send errors) |
| `retryTimes` | number | 3 | 重试次数 (Retry times) |
| `retryInterval` | number | 1000 | 重试间隔 (ms) (Retry interval) |
| `enableForward` | boolean | false | 合并转发（OneBot/Satori）(Enable forward message) |

### 缓存与去重 (Cache & Deduplication)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `enableDeduplication` | boolean | true | 启用重复解析检测与提示 (Enable duplicate detection) |
| `deduplicationInterval` | number | 180 | 去重间隔 (s) (Deduplication interval) |
| `cacheTTL` | number | 600 | 缓存时间 (s) (Cache TTL) |

### API 与平台 (API & Platforms)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `primaryApiUrl` | string | `https://api-new.ifphp.com/api/svparse` | 主解析 API 地址（聚合接口）(Main aggregation API URL) |
| `platformDedicatedFirst` | object | 全关 (All off) | 优先专属 API (Prioritize dedicated APIs) |
| `customApis` | array | [] | 覆盖内置平台 API (Override built-in APIs) |
| `customPlatforms` | array | [] | 自定义新平台 (Custom platforms) |
| `globalFieldMapping` | string | 预设 (Preset) | 全局字段映射 JSON (Global field mapping JSON) |

### 界面文本 (UI Text)
| 配置项 (Config) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------|-------------|-------------------|---------------------|
| `waitingTipText` | string | 正在解析... | 等待提示 (Waiting tip) |
| `unsupportedPlatformText` | string | 不支持该平台 | 不支持提示 (Unsupported platform tip) |
| `invalidLinkText` | string | 无效链接 | 无效链接提示 (Invalid link tip) |
| `parseErrorPrefix` | string | ❌ 解析失败： | 错误前缀 (Error prefix) |
| `parseErrorItemFormat` | string | ... | 错误格式 (Error format) |
| `deduplicationTipText` | string | 链接 ${url} 在最近 ${interval} 秒内已解析过，已跳过。 | 重复解析提示 (Duplication tip) |

## 支持的变量 (Supported Variables)

> 在 `unifiedMessageFormat` 中可使用以下变量，空行自动隐藏。  
> The following variables can be used in `unifiedMessageFormat`, empty lines are auto-hidden.

| 变量 (Variable) | 说明 (Description) |
|----------------|--------------------|
| `${标题}` | 视频/图集标题 (Title) |
| `${作者}` | 作者名称 (Author name) |
| `${简介}` | 内容简介 (Description) |
| `${视频时长}` | 视频时长（时:分:秒）(Duration, hh:mm:ss) |
| `${点赞数}` | 点赞数量 (Like count) |
| `${收藏数}` | 收藏数量 (Favorite count) |
| `${转发数}` | 转发/分享数量 (Share count) |
| `${播放数}` | 播放量 (Play count) |
| `${评论数}` | 评论数量 (Comment count) |
| `${发布时间}` | 发布时间（格式化）(Publish time, formatted) |
| `${图片数量}` | 图集/实况图片数量 (Image count) |
| `${作者ID}` | 作者唯一标识ID (Author ID) |
| `${音乐标题}` | 音乐标题 (Music title) |
| `${音乐作者}` | 音乐作者 (Music author) |

## 支持的平台 (Supported Platforms)

> 以下为插件内置链接匹配规则，可根据用户发送的链接自动识别。所有匹配规则同时支持 HTTP 和 HTTPS 协议，并兼容多级路径（如短链后带 `/` 子路径）。  
> The following are the built-in link matching rules, which can automatically identify links sent by users. All rules support both HTTP and HTTPS, and are compatible with multi-level paths (e.g., short links followed by `/` subpaths).

| 平台名称 (Platform) | 关键词识别（匹配的域名/路径模式）(Keyword/Domain Patterns) | 解析能力 (Supported Content) |
|---------------------|--------------------------------------------------------------|------------------------------|
| 哔哩哔哩 (B站) Bilibili | `bilibili.com/video/`, `b23.tv`, `bili*.cn`, `b23.wtf`, `bili2233.cn` | 视频 (Video) |
| 抖音 Douyin | `douyin.com/video/`, `v.douyin.com` | 短视频、图集、实况 (Short video, Image, Live photo) |
| 快手 Kuaishou | `kuaishou.com/short-video/`, `v.kuaishou.com`, `kuaishou.com/f/` | 短视频、图集 (Short video, Image) |
| 小红书 Xiaohongshu | `xiaohongshu.com/discovery/item/`, `xhslink.com`, `xiaohongshu.com/explore/`, `xiaohongshu.com/board/` | 图文、视频 (Image, Video) |
| 微博 Weibo | `weibo.com/数字/`, `video.weibo.com/show`, `t.cn`, `m.weibo.cn` | 视频、图集 (Video, Image) |
| 西瓜视频 Xigua | `ixigua.com` | 短视频 (Short video) |
| YouTube | `youtube.com/watch`, `youtu.be`, `youtube.com/shorts/` | 视频 (Video) |
| TikTok | `tiktok.com/@/video/`, `vm.tiktok.com`, `vt.tiktok.com` | 短视频 (Short video) |
| AcFun（A站） | `acfun.cn/v/ac` | 视频 (Video) |
| 知乎 Zhihu | `zhihu.com/video/`, `zhihu.com/question/xxx/answer/xxx`, `zhuanlan.zhihu.com/p/`, `zhihu.com/zvideo/` | 视频、回答中的视频 (Video, answer video) |
| 微视 Weishi | `weishi.qq.com/weishi/feed/` | 短视频 (Short video) |
| 虎牙 Huya | `huya.com/video/` | 直播回放、视频 (Live replay, Video) |
| 好看视频 Haokan | `haokan.baidu.com/v?vid=` | 短视频 (Short video) |
| 美拍 Meipai | `meipai.com/media/` | 短视频 (Short video) |
| Twitter / X | `twitter.com/用户名/status/`, `x.com/用户名/status/` | 视频、图文 (Video, Image) |
| Instagram | `instagram.com/p/`, `instagram.com/reel/`, `instagram.com/share/` | 图文、Reels (Image, Reels) |
| 豆包（视频）Doubao Video | `doubao.com/video/`, `doubao.com/video-sharing` | 视频 (Video) |
| 豆包（图集）Doubao Image | `doubao.com/thread/` | 图文 (Image) |
| **即梦 (Jimeng)** | `jimeng.jianying.com`, `jimeng.cn`, `dreamina.jianying.com`, `dreamina.capcut.com` | AI视频、AI图片 (AI video, AI image) |
| 绿洲 Oasis | `oasis.weibo.com/v/` | 视频、图文 (Video, Image) |
| 视频号 WeChat Channels | `channels.weixin.qq.com`, `weixin.qq.com/sph/` | 短视频 (Short video) |
| 梨视频 Lishi | `pearvideo.com/video_`, `video.li` | 短视频 (Short video) |
| 全民直播 Quanmin | `quanmin.tv`, `quanmintv.cn` | 直播 (Live) |
| 皮皮搞笑 Pipigx | `h5.pipigx.com/pp/post/`, `ippzone.com` | 短视频 (Short video) |
| 皮皮虾 Pipixia | `pipix.com`, `pipixia.com` | 短视频 (Short video) |
| 最右 Zuiyou | `share.xiaochuankeji.cn/hybrid/share/post`, `izuiyou.com` | 短视频 (Short video) |
| 🔧 自定义平台 Custom | 通过 `customPlatforms` 配置添加 (Add via `customPlatforms`) | 取决于提供的 API (Depends on API) |

## 项目贡献者 (Contributors)

| 贡献者 (Contributor) | 贡献内容 (Contribution) |
|----------------------|-------------------------|
| Minecraft-1314 | 插件完整开发 (Complete plugin development) |
| ShiraiKuroko003 | 修复消息格式设置问题并且PR-1.2.5版本已修复 (Fixed message format issue, PR-1.2.5) |
| cyavb | 提交功能建议-给自定义API添加KEY认证-已采纳 (Suggested custom API key auth - adopted) |
| Keep785 | 提交Bug-无法正常关闭发送封面-已修复<br>提交Bug-解析问题-已修复 (Reported bug - cannot disable cover sending - fixed<br>Reported bug - parsing issue - fixed) |
| dzt2008 + Apricityx | 提交Bug-会对非支持视频平台URL进行误解析-已修复 (Reported incorrect parsing of unsupported URLs - fixed) |
| linyves | 提交Bug-小红书图集重复发送封面-已修复<br>提交Bug-话题显示异常 #**[话题]#-已修复<br>提交建议-Live Photo 全部按普通图片处理-已采纳<br>提交Bug-解析后会把作者头像一起发送-已修复 (Reported bug - duplicate cover for Xiaohongshu image posts - fixed<br>Reported bug - abnormal topic display #**[topic]# - fixed<br>Suggestion - treat Live Photos as normal images - adopted<br>Reported bug - author avatar sent together after parsing - fixed) |
| JH-Ahua |  API 支持 (API support) |
| shangxue | 灵感来源 (Inspiration) |

（欢迎通过 Issues 或 PR 加入贡献者列表）  
(Welcome to join the contributor list via Issues or PR)

## 许可协议 (License)

本项目采用 MIT 许可证，详情参见 [LICENSE](LICENSE) 文件。  
This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

## 支持我们 (Support Us)

如果这个项目对您有帮助，欢迎点亮右上角的 Star ⭐ 支持我们！  
If this project is helpful to you, please feel free to star it in the upper right corner ⭐ to support us!