# koishi-plugin-video-parser-all

## 项目介绍 (Project Introduction)

### 中文
这是一个为 Koishi 机器人框架开发的**全平台视频/图集解析插件**，使用统一API接口，支持自动识别并解析抖音、快手、B站、小红书、微博、YouTube、TikTok、剪映、AcFun、知乎、虎牙、绿洲、视频号等20+主流平台的短视频/图集/实况链接。

### English
This is a **multi-platform video/image parsing plugin** developed for the Koishi bot framework, using a unified API interface to automatically recognize and parse short video/image/live photo links from 20+ mainstream platforms such as Douyin, Kuaishou, Bilibili, Xiaohongshu, Weibo, YouTube, TikTok, Jianying, AcFun, Zhihu, Huya, Oasis, WeChat Channels and more.

## 项目仓库 (Repository)
- GitHub: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all`
- Issues: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues`

## 核心指令 (Core Commands)

| 指令 (Command) | 说明 (Description) | 示例 (Example) |
|----------------|--------------------|----------------|
| `parse <url>` | 手动解析指定的视频/图集链接 | `parse https://v.douyin.com/xxxx/` |

## 配置项说明 (Configuration)

### 基本设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enable` | boolean | true | 启用插件 |
| `botName` | string | 视频解析机器人 | 合并转发中的昵称 |
| `showWaitingTip` | boolean | true | 显示等待提示 |
| `debug` | boolean | false | Debug 日志 |
| `platformEnabled` | object | 全开 | 各平台开关 |

### 消息格式
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `unifiedMessageFormat` | string | 见预设 | 文字格式，支持变量，空行自动隐藏 |

### 媒体发送
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `showImageText` | boolean | true | 发送文字内容 |
| `showCoverImage` | boolean | true | 发送封面图片 |
| `showMusicCover` | boolean | true | 发送音乐封面 |
| `showImageFile` | boolean | true | 封面/图片是否以图片形式发送（关闭则只发送链接） |
| `showVideoFile` | boolean | true | 视频是否以视频形式发送（关闭则只发送链接） |
| `forceDownloadImage` | boolean | false | 强制下载封面/图片 |
| `forceDownloadVideo` | boolean | false | 强制下载视频 |

### 音乐语音（需 silk 和 ffmpeg）
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `showMusicVoice` | boolean | false | 音乐链接以语音发送 |
| `showMusicVoiceFile` | boolean | true | 音乐链接是否以语音形式发送（关闭则只发送链接） |
| `forceDownloadMusicVoice` | boolean | false | 强制下载音乐语音 |

### 性能与限制
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxDescLength` | number | 200 | 简介长度上限 |
| `maxConcurrent` | number | 3 | 解析最大并发数 |
| `downloadConcurrency` | number | 3 | 下载线程数 |
| `mediaDownloadTimeout` | number | 120000 | 统一下载超时 (ms) |
| `maxMediaSize` | number | 0 | 最大下载文件大小 (MB)，0 为不限制 |
| `downloadEngine` | string | internal | 下载引擎（internal / aria2 / downloads） |
| `aria2Host` | string | 127.0.0.1 | aria2 RPC 地址 |
| `aria2Port` | number | 6800 | aria2 RPC 端口 |
| `aria2Secret` | string |  | aria2 RPC 密钥 |
| `resumeDownload` | boolean | true | 启用断点续传（仅 aria2） |

### 网络与请求
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `timeout` | number | 180000 | API 超时 (ms) |
| `videoSendTimeout` | number | 180000 | 发送超时 (ms) |
| `userAgent` | string | 见预设 | User-Agent |
| `proxy` | object | ... | HTTP/HTTPS 代理 |
| `customHeaders` | array | [] | 自定义请求头 |

### 发送与重试
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `ignoreSendError` | boolean | true | 忽略发送失败 |
| `retryTimes` | number | 3 | 重试次数 |
| `retryInterval` | number | 1000 | 重试间隔 (ms) |
| `enableForward` | boolean | false | 合并转发（OneBot/Satori） |

### 缓存与临时文件
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `deduplicationInterval` | number | 180 | 去重间隔 (s) |
| `cacheTTL` | number | 600 | 缓存时间 (s) |
| `cacheDir` | string | ./temp_cache | 统一临时目录 |

### API 与平台
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `platformDedicatedFirst` | object | 全关 | 优先专属 API |
| `customApis` | array | [] | 覆盖内置平台 API |
| `customPlatforms` | array | [] | 自定义新平台 |
| `globalFieldMapping` | string | 预设 | 全局字段映射 JSON |

### 界面文本
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `waitingTipText` | string | 正在解析... | 等待提示 |
| `unsupportedPlatformText` | string | 不支持该平台 | 不支持提示 |
| `invalidLinkText` | string | 无效链接 | 无效链接提示 |
| `parseErrorPrefix` | string | ❌ 解析失败： | 错误前缀 |
| `parseErrorItemFormat` | string | ... | 错误格式 |

## 支持的变量 (Supported Variables)
在 `unifiedMessageFormat` 中可使用以下变量，空行自动隐藏：

| 变量名 | 说明 |
|--------|------|
| `${标题}` | 视频/图集标题 |
| `${作者}` | 作者名称 |
| `${简介}` | 内容简介 |
| `${视频时长}` | 视频时长（时:分:秒） |
| `${点赞数}` | 点赞数量 |
| `${收藏数}` | 收藏数量 |
| `${转发数}` | 转发/分享数量 |
| `${播放数}` | 播放量 |
| `${评论数}` | 评论数量 |
| `${发布时间}` | 发布时间（格式化） |
| `${图片数量}` | 图集/实况图片数量 |
| `${作者ID}` | 作者唯一标识ID |
| `${视频链接}` | 视频原始链接 |
| `${音乐标题}` | 音乐标题 |
| `${音乐作者}` | 音乐作者 |

## 依赖说明 (Dependencies)
### 音乐语音（可选）
若启用 `showMusicVoice`，请安装：
- `koishi-plugin-silk`：silk 编解码
- `koishi-plugin-ffmpeg`：音频重采样
### aria2 下载引擎（可选）
若启用 `downloadEngine: 'aria2'`，请安装并启动 aria2 服务，并安装 npm 包 `aria2`：
- 安装 aria2 服务端：https://github.com/aria2/aria2
- 安装 npm 客户端：`npm install aria2`
- 启动 RPC：`aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all`
未满足条件时自动降级为内置下载，不影响正常使用。
### downloads 服务（可选）
若启用 `downloadEngine: 'downloads'`，请安装可选依赖 `koishi-plugin-downloads`，失败时回退到内置下载。

## 支持的平台 (Supported Platforms)
| 平台名称 | 关键词识别 | 解析能力 |
|----------|------------|----------|
| 哔哩哔哩 (B站) | bilibili, b23.tv, bilibili.com | 视频 |
| 抖音 | douyin, v.douyin.com | 短视频、图集、实况 |
| 快手 | kuaishou, v.kuaishou.com | 短视频、图集 |
| 小红书 | xiaohongshu, xhslink.com | 图文、视频 |
| 微博 | weibo, video.weibo.com | 视频、图集 |
| 剪映 / 即梦 | jianying, jimeng.jianying.com | 视频模板 |
| 今日头条 / 西瓜视频 | toutiao, ixigua.com | 短视频 |
| AcFun（A站） | acfun, acfun.cn | 视频 |
| 知乎 | zhihu, zhihu.com | 视频、回答 |
| 微视 | weishi, weishi.qq.com | 短视频 |
| 虎牙 | huya, huya.com | 直播、视频 |
| YouTube（油管） | youtube, youtu.be | 视频 |
| TikTok（国际版抖音） | tiktok, tiktok.com | 短视频 |
| 好看视频 | haokan, haokan.baidu.com | 短视频 |
| 美拍 | meipai, meipai.com | 短视频 |
| Twitter / X | twitter, x.com | 视频、图文 |
| Instagram | instagram, instagram.com | 图文、Reels |
| 豆包 | doubao (doubao.com/video) | 视频 |
| 皮皮搞笑 | pipigx, h5.pipigx.com | 短视频 |
| 皮皮虾 | pipixia, h5.pipix.com | 短视频 |
| 最右 | zuiyou, xiaochuankeji.cn | 短视频 |
| 梨视频 | video.li, pearvideo.com | 短视频 |
| 全民直播 | quanmin (quanmin.tv) | 直播 |
| 绿洲 (Oasis) | oasis.weibo.com | 视频、图文 |
| 视频号 (WeChat Channels) | channels.weixin.qq.com, weixin.qq.com/sph/ | 短视频 |
| 🔧 自定义平台 | 通过 `customPlatforms` 添加 | 取决于 API |

## 项目贡献者 (Contributors)

| 贡献者 (Contributor) | 贡献内容 (Contribution) |
|----------------------|-------------------------|
| Minecraft-1314 | 插件完整开发 (Complete plugin development) |
| ShiraiKuroko003 | 修复消息格式设置问题并且PR-1.2.5版本已修复 |
| cyavb | 提交功能建议-给自定义API添加KEY认证-已修复 |
| Keep785 | 提交Bug-无法正常关闭发送封面-已修复<br>提交Bug-解析问题-已修复 |
| dzt2008 + Apricityx | 提交Bug-会对非支持视频平台URL进行误解析-已修复 |
| JH-Ahua | BugPk-Api 支持 |
| shangxue | 灵感来源 |

（欢迎通过 Issues 或 PR 加入贡献者列表）

## 许可协议 (License)

本项目采用 MIT 许可证，详情参见 [LICENSE](LICENSE) 文件。

This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

## 支持我们 (Support Us)

如果这个项目对您有帮助，欢迎点亮右上角的 Star ⭐ 支持我们！

If this project is helpful to you, please feel free to star it in the upper right corner ⭐ to support us!