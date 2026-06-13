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

### 基础设置 (Basic Settings)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enable` | boolean | true | 是否启用视频解析插件 |
| `botName` | string | 视频解析机器人 | 合并转发消息中显示的机器人名称 |
| `showWaitingTip` | boolean | true | 解析时是否显示等待提示 |
| `debug` | boolean | false | 是否开启 Debug 模式，在控制台输出详细日志 |

### 统一消息格式 (Unified Message Format)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `unifiedMessageFormat` | string | `标题：${标题}\n作者：${作者}\n简介：${简介}\n音乐标题：${音乐标题}\n音乐作者：${音乐作者}\n音乐封面：${音乐封面}\n音乐链接：${音乐链接}\n点赞：${点赞数}\n收藏：${收藏数}\n转发：${转发数}\n播放：${播放数}\n评论：${评论数}\n图片数量：${图片数量}` | 文字消息格式，支持变量替换。空行自动隐藏。封面及媒体由独立开关控制，默认不包含在文字中 |

### 内容显示设置 (Content Display Settings)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `showImageText` | boolean | true | 是否发送文字内容 |
| `showCoverImage` | boolean | true | 是否发送封面图片 |
| `showImageFile` | boolean | true | 封面/图片是否以文件形式发送（关闭则只发链接） |
| `forceDownloadImage` | boolean | false | 强制下载封面/图片后发送 |
| `imageDownloadTimeout` | number | 60000 | 图片下载超时（毫秒） |
| `imageTempDir` | string | `./temp_images` | 临时封面/图片存储目录 |
| `maxImageSize` | number | 0 | 最大下载图片大小（MB），0 不限制 |
| `showVideoFile` | boolean | true | 视频是否以文件形式发送（关闭则只发链接） |
| `forceDownloadVideo` | boolean | false | 强制下载视频后发送 |
| `videoDownloadTimeout` | number | 120000 | 视频下载超时（毫秒） |
| `tempDir` | string | `./temp_videos` | 临时视频存储目录 |
| `maxVideoSize` | number | 0 | 最大下载视频大小（MB），0 不限制 |
| `maxDescLength` | number | 200 | 简介最大长度（字符） |
| `maxConcurrent` | number | 3 | 批量解析最大并发数 |

### 网络与 API 设置 (Network & API Settings)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `timeout` | number | 180000 | API 请求超时时间（毫秒） |
| `videoSendTimeout` | number | 60000 | 消息发送超时时间（毫秒，0 为不限制） |
| `userAgent` | string | `Mozilla/5.0 ...` | User-Agent |
| `proxy` | object | `{ enabled: false, protocol: "http", host: "127.0.0.1", port: 7890, auth: { username: "", password: "" } }` | HTTP/HTTPS 代理。`enabled` 开关（默认关闭），`protocol` 下拉选择 `http` 或 `https` |
| `customHeaders` | array | [] | 自定义请求头，每项含 `name` 和 `value` |

### API 选择与回退设置 (API Selection & Fallback)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `primaryApiUrl` | string | `https://api.bugpk.com/api/short_videos` | 主 API 地址 |
| `backupApiUrl` | string | `https://api.bugpk.com/api/svparse` | 备用主 API，仅支持部分平台 |
| `platformDedicatedFirst` | object | 各平台均为 `false` | 平台专属 API 优先开关，键：`bilibili` 等 |
| `customApis` | array | [] | 自定义平台专属 API，含 `platform`, `apiUrl`, `apiKey`, `authHeaderType`, `customHeaderName`, `fieldMapping` |
| `globalFieldMapping` | string | 预设字段映射 JSON | 全局字段映射，支持点号路径 |

### 错误与重试设置 (Error & Retry Settings)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `ignoreSendError` | boolean | true | 忽略发送失败 |
| `retryTimes` | number | 3 | 重试次数 |
| `retryInterval` | number | 1000 | 重试间隔（毫秒） |

### 发送方式设置 (Send Mode Settings)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableForward` | boolean | false | 启用合并转发（仅 OneBot 平台） |

### 缓存与去重设置 (Cache & Deduplication Settings)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `deduplicationInterval` | number | 180 | 去重间隔（秒） |
| `cacheTTL` | number | 600 | 缓存时间（秒） |

### 界面文字设置 (UI Text Settings)
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `waitingTipText` | string | 正在解析视频，请稍候... | 等待提示 |
| `unsupportedPlatformText` | string | 不支持该平台链接 | 不支持平台提示 |
| `invalidLinkText` | string | 无效的视频链接 | 无效链接提示 |
| `parseErrorPrefix` | string | ❌ 解析失败： | 错误前缀 |
| `parseErrorItemFormat` | string | `【${url}】: ${msg}` | 错误项格式 |

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
| `${音乐封面}` | 音乐封面图片地址 |
| `${音乐链接}` | 音乐原始链接 |

> 注：封面图片由独立开关控制，不会出现在文字消息中。

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
| AcFun (A站) | acfun, acfun.cn | 视频 |
| 知乎 | zhihu, zhihu.com | 视频、回答 |
| 微视 | weishi, weishi.qq.com | 短视频 |
| 虎牙 | huya, huya.com | 直播、视频 |
| YouTube (油管) | youtube, youtu.be | 视频 |
| TikTok (国际版抖音) | tiktok, tiktok.com | 短视频 |
| 好看视频 | haokan, haokan.baidu.com | 短视频 |
| 梨视频 | video.li | 短视频 |
| 美拍 | meipai, meipai.com | 短视频 |
| 全民直播 | quanmin (quanmin.tv) | 直播 |
| Twitter / X | twitter, x.com | 视频、图文 |
| Instagram | instagram, instagram.com | 图文、Reels |
| 豆包 | doubao (doubao.com/video) | 视频 |
| 豆包对话 | doubao (doubao.com/thread) | 对话分享 |
| 皮皮搞笑 | pipigx, h5.pipigx.com | 短视频 |
| 皮皮虾 | pipixia, h5.pipix.com | 短视频 |
| 最右 | zuiyou, xiaochuankeji.cn | 短视频 |
| 绿洲 (Oasis) | oasis.weibo.com | 视频、图文 |
| 视频号 (WeChat Channels) | channels.weixin.qq.com, weixin.qq.com/sph/ | 短视频 |

> 注：部分平台解析能力可能因API限制有所差异。

## 项目贡献者 (Contributors)

| 贡献者 (Contributor) | 贡献内容 (Contribution) |
|----------------------|-------------------------|
| Minecraft-1314 | 插件完整开发 |
| ShiraiKuroko003 | 修复消息格式问题 |
| cyavb | 自定义API KEY认证 |
| Keep785 | 无法关闭发送封面 |
| dzt2008 + Apricityx | 误解析修复 |
| JH-Ahua | BugPk-Api 支持 |
| shangxue | 灵感来源 |

（欢迎通过 Issues 或 PR 加入贡献者列表）

## 许可协议 (License)

本项目采用 MIT 许可证，详情参见 [LICENSE](LICENSE) 文件。

This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

## 支持我们 (Support Us)

如果这个项目对您有帮助，欢迎点亮右上角的 Star ⭐ 支持我们！

If this project is helpful to you, please feel free to star it in the upper right corner ⭐ to support us!