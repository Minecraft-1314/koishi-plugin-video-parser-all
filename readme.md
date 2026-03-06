# koishi-plugin-video-parser-all

## 项目介绍 (Project Introduction)

### 中文
这是一个为 Koishi 机器人框架开发的**多平台视频/图集解析插件**，支持自动识别并解析抖音、快手、B站、微博、今日头条、皮皮搞笑、皮皮虾、最右等主流平台的短视频/图集链接。核心特性：
- 🚀 自动识别多平台链接，无需手动指定平台
- 🎨 自定义解析结果格式，支持丰富的变量替换
- ⚡ 内置防重复解析、接口重试、自动缓存清理等实用功能
- 📤 支持 OneBot 平台消息合并转发，优化展示体验

### English
This is a **multi-platform video/image parsing plugin** developed for the Koishi bot framework, supporting automatic recognition and parsing of short video/image links from mainstream platforms such as Douyin, Kuaishou, Bilibili, Xiaohongshu, Weibo, Toutiao, Pipi Funny, Pipi Shrimp, and Zuiyou. Core features:
- 🚀 Automatically recognizes multi-platform links without manual platform specification
- 🎨 Customizable parsing result format with rich variable substitution support
- ⚡ Built-in duplicate parsing prevention, API retry logic, and automatic cache cleanup
- 📤 Support OneBot platform message forwarding for better display experience

## 项目仓库 (Repository)
- GitHub: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all`
- Issues: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues`

## 核心指令 (Core Commands)

| 指令 (Command) | 说明 (Description) | 示例 (Example) |
|----------------|--------------------|----------------|
| `parse <url>` | 手动解析指定的视频/图集链接 | `parse https://v.douyin.com/xxxx/` |
| `clear-cache` | 清理解析缓存和临时下载的视频文件 | `clear-cache` |

## 配置项说明 (Configuration)

### 基础设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enable` | boolean | true | 是否启用视频解析插件 |
| `botName` | string | 视频解析机器人 | 合并转发消息中显示的机器人名称 |
| `showWaitingTip` | boolean | true | 解析时显示等待提示 |
| `waitingTipText` | string | 正在解析视频，请稍候... | 等待提示文本内容 |
| `sameLinkInterval` | number | 180 | 相同链接重复解析间隔（秒），防止频繁解析 |

### 统一消息格式
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `unifiedMessageFormat` | string | 详见下方变量说明 | 自定义解析结果的输出格式，支持变量替换 |

### 内容显示设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `showImageText` | boolean | true | 是否显示解析后的图文内容 |
| `showVideoFile` | boolean | true | 是否发送视频文件（关闭则只发送视频链接） |

### 内容长度限制
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxDescLength` | number | 200 | 简介内容最大长度（字符），超出部分自动截断 |

### 网络与API设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `timeout` | number | 180000 | API请求超时时间（毫秒） |
| `videoSendTimeout` | number | 0 | 视频消息发送超时时间（毫秒，0为不限制） |
| `userAgent` | string | Chrome 124 UA | API请求使用的User-Agent标识 |

### 错误与重试设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `ignoreSendError` | boolean | true | 忽略消息发送失败错误，避免插件崩溃 |
| `retryTimes` | number | 3 | API请求失败时的重试次数 |
| `retryInterval` | number | 1000 | 每次重试的间隔时间（毫秒） |

### 发送方式设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableForward` | boolean | false | 启用合并转发功能（仅OneBot平台） |
| `downloadVideoBeforeSend` | boolean | false | 发送前先下载视频到本地（再发送文件） |
| `maxVideoSize` | number | 0 | 最大视频下载大小限制（MB，0为不限制） |
| `downloadThreads` | number | 0 | 多线程下载线程数（0为单线程，最大10） |

### 消息处理设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `messageBufferDelay` | number | 0 | 消息缓冲延迟（毫秒），合并短时间内的解析请求 |

### 缓存清理设置
| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `autoClearCacheInterval` | number | 0 | 自动清理缓存间隔（分钟，0为关闭自动清理） |

## 支持的变量 (Supported Variables)
在 `unifiedMessageFormat` 中可使用以下变量进行自定义格式化：

| 变量名 | 说明 | 适用平台 |
|--------|------|----------|
| `${标题}` | 视频/图集标题 | 所有平台 |
| `${作者}` | 作者/UP主/发布者名称 | 所有平台 |
| `${简介}` | 内容简介/描述 | 部分平台 |
| `${视频时长}` | 视频时长 | 部分平台 |
| `${点赞数}` | 点赞数量 | 所有平台 |
| `${投币数}` | 投币数量 | 部分平台 |
| `${收藏数}` | 收藏数量 | 所有平台 |
| `${转发数}` | 转发/分享数量 | 所有平台 |
| `${播放数}` | 播放量 | 部分平台 |
| `${评论数}` | 评论数量 | 所有平台 |
| `${IP属地}` | 作者IP属地 | 部分平台 |
| `${发布时间}` | 发布时间（格式化） | 所有平台 |
| `${粉丝数}` | 作者粉丝数量 | 部分平台 |
| `${在线人数}` | 直播间在线人数 | 部分平台 |
| `${关注数}` | 关注数 | 部分平台 |
| `${文件大小}` | 文件大小（MB） | 部分平台 |
| `${直播间地址}` | 直播间链接 | 部分平台 |
| `${直播间ID}` | 直播间ID | 部分平台 |
| `${直播间状态}` | 直播间状态（直播中/未开播） | 部分平台 |
| `${图片数量}` | 图集图片数量 | 部分平台 |
| `${作者ID}` | 作者唯一标识ID | 部分平台 |

## 支持的平台 (Supported Platforms)
| 平台名称 | 关键词识别 | 解析能力 |
|----------|------------|----------|
| 哔哩哔哩 (B站) | bilibili、b23、B站 | 视频、番剧、直播、图集 |
| 抖音 | douyin、v.douyin.com | 短视频、图集、直播 |
| 快手 | kuaishou、v.kuaishou.com | 短视频、图集 |
| 微博 | weibo、video.weibo.com | 视频、图集 |
| 今日头条 | toutiao、ixigua.com | 短视频 |
| 皮皮搞笑 | pipigx、h5.pipigx.com | 短视频 |
| 皮皮虾 | pipixia、h5.pipix.com | 短视频 |
| 最右 | zuiyou、xiaochuankeji.cn | 短视频 |

## 项目贡献者 (Contributors)

| 贡献者 (Contributor) | 贡献内容 (Contribution) |
|----------------------|-------------------------|
| Minecraft-1314 | 插件完整开发 (Complete plugin development) |
| JH-Ahua | BugPk-Api 支持 |
| （欢迎提交 PR 加入贡献者列表） | （Welcome to submit PR to join the contributor list） |

## 许可协议 (License)

本项目采用 MIT 许可证，详情参见 [LICENSE](LICENSE) 文件。

This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

## 支持我们 (Support Us)

如果这个项目对您有帮助，欢迎点亮右上角的 Star ⭐ 支持我们，这将是对所有贡献者最大的鼓励！

If this project is helpful to you, please feel free to star it in the upper right corner ⭐ to support us, which will be the greatest encouragement to all contributors!