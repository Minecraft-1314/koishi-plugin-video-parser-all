# koishi-plugin-video-parser-all

> 默认中文文档：[English version](README.en.md)

## 📌 重要公告（必读）

- [迁移说明 #12](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/12)
- [关于原版（`Minecraft-1314/koishi-plugin-video-parser-all`）与 fork 版本（`@char46/koishi-plugin-video-parser-all`）的选择说明及反馈指引 #14](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/14)
- [fork 版本（`@char46/koishi-plugin-video-parser-all`）问题反馈专用 #13](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/13)

## 文档目录

| 文档 | 说明 |
|------|------|
| [CHANGELOG-v1.7.2.md](docs/CHANGELOG-v1.7.2.md) | v1.7.2 版本更新日志 |
| [API_ADDRESSES.md](docs/API_ADDRESSES.md) | 插件 API 解析地址一览（主 API 与各平台专属接口） |
| [COMPATIBILITY.md](docs/COMPATIBILITY.md) | API 字段兼容性说明（支持的所有字段别名） |
| [LINK_RULES.md](docs/LINK_RULES.md) | 所有平台的链接匹配规则（正则表达式） |

## 项目介绍

这是一个为 Koishi 机器人框架开发的**全平台视频/图集解析插件**，支持自动识别并解析抖音、快手、B站、小红书、微博、西瓜视频、YouTube、TikTok、AcFun（A站）、知乎、微视、虎牙、好看视频、美拍、Twitter/X、Instagram、豆包（视频/图集）、**即梦（AI视频/图片）**、绿洲、视频号、梨视频、全民直播、皮皮搞笑、皮皮虾、最右等**20+主流平台**的短视频/图集/实况链接。

## 项目仓库

- GitHub：https://github.com/Minecraft-1314/koishi-plugin-video-parser-all
- Issues：https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues

## 快速开始

```bash
# 1. 进入 Koishi 控制台或项目工作区
# 2. 安装插件
# 3. 启用后发送视频/图集链接，插件会自动解析
```

## 核心指令

| 指令 | 说明 | 示例 |
|------|------|------|
| `parse <url>` | 手动解析指定的视频/图集链接 | `parse https://v.douyin.com/xxxx/` |

## 配置项说明

### 基本设置

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `enable` | boolean | `true` | 启用插件 |
| `botName` | string | `视频解析机器人` | 合并转发中的昵称 |
| `showWaitingTip` | boolean | `true` | 显示等待提示 |
| `debug` | boolean | `false` | 开启调试日志 |
| `platformEnabled` | object | 全开 | 各平台解析开关 |

### 消息格式

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `unifiedMessageFormat` | string | 见预设 | 文字格式，支持变量：`${标题}` `${作者}` `${简介}` `${视频时长}` `${点赞数}` `${收藏数}` `${转发数}` `${播放数}` `${评论数}` `${发布时间}` `${图片数量}` `${作者ID}` `${音乐标题}` `${音乐作者}`，空行自动隐藏 |

### 媒体发送

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `showImageText` | boolean | `true` | 发送文字内容 |
| `showCoverImage` | boolean | `true` | 发送封面图片 |
| `showCoverFile` | boolean | `true` | 封面是否以图片形式发送（关闭则只发送链接） |
| `showCoverText` | boolean | `true` | 发送封面前显示文字提示 |
| `coverText` | string | `封面：` | 封面前显示的文字 |
| `showImageFileNew` | boolean | `true` | 图片是否以图片形式发送（关闭则只发送链接） |
| `showAuthorAvatar` | boolean | `true` | 发送作者头像图片 |
| `showAuthorAvatarFile` | boolean | `true` | 作者头像图片是否以图片形式发送（关闭则只发送链接） |
| `showAuthorAvatarText` | boolean | `true` | 作者头像前显示文字提示（将追加到文字消息末尾） |
| `authorAvatarText` | string | `作者头像：` | 作者头像前显示的文字 |
| `showMusicCover` | boolean | `true` | 发送音乐封面图片 |
| `showVideoFile` | boolean | `true` | 视频是否以视频形式发送（关闭则只发送链接） |

### 音乐语音

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `showMusicVoice` | boolean | `false` | 音乐链接以语音发送 |
| `showMusicVoiceFile` | boolean | `true` | 音乐链接是否以语音形式发送（关闭则只发送链接） |

### 性能与限制

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `maxDescLength` | number | `200` | 简介长度上限 |
| `maxConcurrent` | number | `3` | 解析最大并发数 |

### 网络与请求

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `timeout` | number | `180000` | API 请求超时（ms） |
| `videoSendTimeout` | number | `180000` | 消息发送超时（ms） |
| `userAgent` | string | 见预设 | User-Agent |
| `apiKey` | string | 空 | `api-new.ifphp.com` API Key |
| `authMode` | string | `header` | API Key 传递方式：`header`（`X-API-Key` 头）或 `query`（URL 参数 `?key=xxx`） |
| `proxy` | object | 见说明 | HTTP/HTTPS 代理 |
| `customHeaders` | array | `[]` | 自定义请求头 |

> `proxy` 结构：`enabled`、`protocol`、`host`、`port`、`auth.username`、`auth.password`。

### 发送与重试

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `ignoreSendError` | boolean | `true` | 忽略发送失败 |
| `retryTimes` | number | `3` | 重试次数 |
| `retryInterval` | number | `1000` | 重试间隔（ms） |
| `enableForward` | boolean | `false` | 合并转发（OneBot/Satori） |

### 缓存与去重

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `enableDeduplication` | boolean | `true` | 启用重复解析检测与提示 |
| `deduplicationInterval` | number | `180` | 去重间隔（s） |
| `cacheTTL` | number | `600` | 缓存时间（s） |

### API 与平台

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `primaryApiUrl` | string | `https://api-new.ifphp.com/api/svparse` | 主解析 API 地址（聚合接口） |
| `platformDedicatedFirst` | object | 全关 | 优先使用专属 API（仅 `bilibili`、`douyin`、`kuaishou`、`wechat_channel`、`doubao`、`pipigx`、`jimeng`） |
| `customApis` | array | `[]` | 覆盖内置平台 API |
| `customPlatforms` | array | `[]` | 自定义新平台 |
| `globalFieldMapping` | string | 预设 | 全局字段映射 JSON |

> 专属 API 包括：`bilibili`、`douyin`、`kuaishou`、`wechat_channel`、`doubao`、`pipigx`、`jimeng`。

### 界面文本

| 配置项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `waitingTipText` | string | `正在解析视频，请稍候...` | 等待提示 |
| `unsupportedPlatformText` | string | `不支持该平台链接` | 不支持提示 |
| `invalidLinkText` | string | `无效的视频链接` | 无效链接提示 |
| `parseErrorPrefix` | string | `❌ 解析失败：` | 错误前缀 |
| `parseErrorItemFormat` | string | `【${url}】: ${msg}` | 错误格式 |
| `deduplicationTipText` | string | `链接 ${url} 在最近 ${interval} 秒内已解析过，已跳过。` | 重复解析提示，支持变量 `${url}` `${interval}` |

## 支持的变量

可在 `unifiedMessageFormat` 中使用以下变量，空行自动隐藏。

| 变量 | 说明 |
|------|------|
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
| `${作者ID}` | 作者唯一标识 ID |
| `${音乐标题}` | 音乐标题 |
| `${音乐作者}` | 音乐作者 |

## 支持的平台

以下为插件内置链接匹配规则，可根据用户发送的链接自动识别。所有匹配规则同时支持 HTTP 和 HTTPS 协议，并兼容多级路径（如短链后带 `/` 子路径）。

| 平台 | 关键词识别（域名/路径模式） | 解析能力 |
|------|------|------|
| 哔哩哔哩（B站） | `bilibili.com/video/`、`b23.tv`、`bili*.cn`、`b23.wtf`、`b2233.cn` | 视频 |
| 抖音 | `douyin.com/video/`、`v.douyin.com` | 短视频、图集、实况 |
| 快手 | `kuaishou.com/short-video/`、`v.kuaishou.com`、`kuaishou.com/f/` | 短视频、图集 |
| 小红书 | `xiaohongshu.com/discovery/item/`、`xhslink.com`、`xiaohongshu.com/explore/`、`xiaohongshu.com/board/` | 图文、视频 |
| 微博 | `weibo.com/数字/`、`video.weibo.com/show`、`t.cn`、`m.weibo.cn` | 视频、图集 |
| 西瓜视频 | `ixigua.com` | 短视频 |
| YouTube | `youtube.com/watch`、`youtu.be`、`youtube.com/shorts/` | 视频 |
| TikTok | `tiktok.com/@/video/`、`vm.tiktok.com`、`vt.tiktok.com` | 短视频 |
| AcFun（A站） | `acfun.cn/v/ac` | 视频 |
| 知乎 | `zhihu.com/video/`、`zhihu.com/question/xxx/answer/xxx`、`zhuanlan.zhihu.com/p/`、`zhihu.com/zvideo/` | 视频、回答中的视频 |
| 微视 | `weishi.qq.com/weishi/feed/` | 短视频 |
| 虎牙 | `huya.com/video/` | 直播回放、视频 |
| 好看视频 | `haokan.baidu.com/v?vid=` | 短视频 |
| 美拍 | `meipai.com/media/` | 短视频 |
| Twitter / X | `twitter.com/用户名/status/`、`x.com/用户名/status/` | 视频、图文 |
| Instagram | `instagram.com/p/`、`instagram.com/reel/`、`instagram.com/share/` | 图文、Reels |
| 豆包（视频） | `doubao.com/video/`、`doubao.com/video-sharing` | 视频 |
| 豆包（图集） | `doubao.com/thread/` | 图文 |
| 即梦 | `jimeng.jianying.com`、`jimeng.cn`、`dreamina.jianying.com`、`dreamina.capcut.com` | AI视频、AI图片 |
| 绿洲 | `oasis.weibo.com/v/` | 视频、图文 |
| 视频号 | `channels.weixin.qq.com`、`weixin.qq.com/sph/` | 短视频 |
| 梨视频 | `pearvideo.com/video_`、`video.li` | 短视频 |
| 全民直播 | `quanmin.tv`、`quanmintv.cn` | 直播 |
| 皮皮搞笑 | `h5.pipigx.com/pp/post/`、`ippzone.com` | 短视频 |
| 皮皮虾 | `pipix.com`、`pipixia.com` | 短视频 |
| 最右 | `share.xiaochuankeji.cn/hybrid/share/post`、`izuiyou.com` | 短视频 |
| 自定义平台 | 通过 `customPlatforms` 配置添加 | 取决于提供的 API |

## 项目贡献者

| 贡献者 | 贡献内容 |
|------|------|
| Minecraft-1314 | 插件完整开发 |
| ShiraiKuroko003 | 修复消息格式设置问题并且 PR-1.2.5 版本已修复 |
| cyavb | 提交功能建议-给自定义 API 添加 KEY 认证-已采纳 |
| Keep785 | 提交 Bug-无法正常关闭发送封面-已修复；提交 Bug-解析问题-已修复 |
| dzt2008 + Apricityx | 提交 Bug-会对非支持视频平台 URL 进行误解析-已修复 |
| linyves | 提交 Bug-小红书图集重复发送封面-已修复；提交 Bug-话题显示异常-已修复；提交建议-Live Photo 全部按普通图片处理-已采纳；提交 Bug-解析后会把作者头像一起发送-已修复 |
| GSRealms | 提交 Bug-视频重复解析-已修复 |
| JH-Ahua | API 支持 |
| shangxue | 灵感来源 |

> 欢迎通过 Issues 或 PR 加入贡献者列表。

## 许可协议

本项目采用 MIT 许可证，详情参见 [LICENSE](LICENSE) 文件。

## 支持我们

如果这个项目对您有帮助，欢迎点亮右上角的 Star 支持我们！
