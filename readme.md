# koishi-plugin-video-parser-all

## 项目介绍 (Project Introduction)

### 中文
这是一个为 Koishi 机器人框架开发的**全平台视频/图集解析插件**，使用统一API接口，支持自动识别并解析抖音、快手、B站、小红书、微博、YouTube、TikTok、剪映、AcFun、知乎、虎牙等20+主流平台的短视频/图集链接。核心特性：
- 🌐 统一API解析，覆盖20+热门平台，无需繁琐配置
- 🤖 自动识别链接来源，即丢即用
- 🎨 完全自定义的解析结果格式，支持多项变量替换，变量无值自动隐藏行
- 🐛 内置Debug调试模式，可详细记录所有操作与API交互日志
- 📤 支持OneBot平台消息合并转发
- 💬 所有提示文案均可自定义，适配多语言场景

### English
This is a **multi-platform video/image parsing plugin** developed for the Koishi bot framework, using a unified API interface to automatically recognize and parse short video/image links from 20+ mainstream platforms such as Douyin, Kuaishou, Bilibili, Xiaohongshu, Weibo, YouTube, TikTok, Jianying, AcFun, Zhihu, Huya and more. Core features:
- 🌐 Unified API parsing, covering 20+ popular platforms without complex configuration
- 🤖 Auto-detection of link sources, just drop & go
- 🎨 Fully customizable parsing result format with variable substitutions, empty variables hide the line automatically
- 🐛 Built-in Debug mode, recording detailed operations and API interaction logs
- 📤 Supports message merging and forwarding on the OneBot platform
- 💬 All prompt texts are customizable for multilingual scenarios

## 项目仓库 (Repository)
- GitHub: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all`
- Issues: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues`

## 核心指令 (Core Commands)

| 指令 (Command) | 说明 (Description) | 示例 (Example) |
|----------------|--------------------|----------------|
| `parse <url>` | 手动解析指定的视频/图集链接 | `parse https://v.douyin.com/xxxx/` |

## 配置项说明 (Configuration)

### 基础设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enable` | boolean | true | 是否启用视频解析插件 |
| `botName` | string | 视频解析机器人 | 合并转发消息中显示的机器人名称 |
| `showWaitingTip` | boolean | true | 解析时是否显示等待提示 |
| `debug` | boolean | false | 是否开启 Debug 模式，在控制台输出详细日志 |

### 统一消息格式
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `unifiedMessageFormat` | string | `\${标题}\n\${作者}\n\${简介}\n点赞：\${点赞数}\n收藏：\${收藏数}\n转发：\${转发数}\n播放：\${播放数}\n评论：\${评论数}` | 自定义解析结果的输出格式，支持变量替换。某行所有变量为空时自动隐藏该行 |

### 内容显示设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `showImageText` | boolean | true | 是否发送解析后的文字内容 |
| `showVideoFile` | boolean | true | 是否发送视频文件（关闭则只发送视频链接） |
| `maxDescLength` | number | 200 | 简介内容最大长度（字符），超出自动截断 |

### 网络与 API 设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `timeout` | number | 180000 | API 请求超时时间（毫秒） |
| `videoSendTimeout` | number | 60000 | 视频消息发送超时时间（毫秒，0 为不限制） |
| `userAgent` | string | Chrome 124 UA | API 请求使用的 User-Agent |

### 错误与重试设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `ignoreSendError` | boolean | true | 是否忽略消息发送失败，避免插件崩溃 |
| `retryTimes` | number | 3 | API 请求失败时的重试次数 |
| `retryInterval` | number | 1000 | 重试间隔时间（毫秒） |

### 发送方式设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableForward` | boolean | false | 是否启用合并转发（仅 OneBot 平台） |

### 界面文字设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `waitingTipText` | string | 正在解析视频，请稍候... | 解析等待提示文字 |
| `unsupportedPlatformText` | string | 不支持该平台链接 | 不支持的平台提示 |
| `invalidLinkText` | string | 无效的视频链接 | 无效链接提示（parse 指令） |
| `parseErrorPrefix` | string | ❌ 解析失败： | 解析失败消息前缀 |
| `parseErrorItemFormat` | string | 【${url}】: ${msg} | 每条解析失败格式，可用 `${url}` `${msg}` |

## 支持的变量 (Supported Variables)
在 `unifiedMessageFormat` 中可使用以下变量进行自定义格式化，某行所有变量均为空时该行不显示：

| 变量名 | 说明 | 适用平台 |
|--------|------|----------|
| `${标题}` | 视频/图集标题 | 所有平台 |
| `${作者}` | 作者/发布者名称 | 所有平台 |
| `${简介}` | 内容简介/描述 | 所有平台 |
| `${视频时长}` | 视频时长（时:分:秒） | 视频 |
| `${点赞数}` | 点赞数量 | 所有平台 |
| `${收藏数}` | 收藏数量 | 所有平台 |
| `${转发数}` | 转发/分享数量 | 所有平台 |
| `${播放数}` | 播放量 | 部分平台 |
| `${评论数}` | 评论数量 | 所有平台 |
| `${发布时间}` | 发布时间（格式化） | 所有平台 |
| `${图片数量}` | 图集图片数量（live_photo 或 images 的数量） | 图集 |
| `${作者ID}` | 作者唯一标识ID | 部分平台 |
| `${封面}` | 封面图片地址 | 所有平台 |

> 注：部分变量可能因平台API返回数据不同而显示为空，空值行会自动隐藏。

## 支持的平台 (Supported Platforms)
| 平台名称 | 关键词识别 | 解析能力 |
|----------|------------|----------|
| 哔哩哔哩 (B站) | bilibili, b23.tv, bilibili.com | 视频（不含番剧/直播/图文） |
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
| 豆包 | doubao (doubao.com) | 视频 |
| 皮皮搞笑 | pipigx, h5.pipigx.com | 短视频 |
| 皮皮虾 | pipixia, h5.pipix.com | 短视频 |
| 最右 | zuiyou, xiaochuankeji.cn | 短视频 |

> 注：部分平台解析能力可能因API限制有所差异，具体以实际解析结果为准。

## 项目贡献者 (Contributors)

| 贡献者 (Contributor) | 贡献内容 (Contribution) |
|----------------------|-------------------------|
| Minecraft-1314 | 插件完整开发 (Complete plugin development) |
| JH-Ahua | BugPk-Api 支持 |
| shangxue | 灵感来源 |

（欢迎通过 Issues 或 PR 加入贡献者列表）

## 许可协议 (License)

本项目采用 MIT 许可证，详情参见 [LICENSE](LICENSE) 文件。

This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

## 支持我们 (Support Us)

如果这个项目对您有帮助，欢迎点亮右上角的 Star ⭐ 支持我们，这将是对所有贡献者最大的鼓励！

If this project is helpful to you, please feel free to star it in the upper right corner ⭐ to support us, which will be the greatest encouragement to all contributors!