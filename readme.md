# koishi-plugin-video-parser-all

## 项目介绍 (Project Introduction)

### 中文
这是一个为 Koishi 机器人框架开发的**视频解析插件**，支持自动识别并解析抖音、快手、B站、小红书、微博、今日头条、皮皮搞笑、皮皮虾、最右等主流平台的短视频链接。核心特性：
- 🚀 自动识别多平台视频，无需手动指定平台
- 🎨 自定义解析结果格式、返回内容类型（封面/链接/视频）
- ⚡ 内置防重复解析、接口重试、自动缓存清理等实用功能
- 📤 支持 OneBot 平台消息合并转发，优化展示体验
- 🔌 内置多套解析 API，自动降级容错，提升解析成功率

### English
This is a **video parsing plugin** developed for the Koishi bot framework, supporting automatic recognition and parsing of short video links from mainstream platforms such as Douyin, Kuaishou, Bilibili, Xiaohongshu, Weibo, Toutiao, Pipi Funny, Pipi Shrimp, and Zuiyou. Core features:
- 🚀 Automatically recognizes videos from multiple platforms, no need to manually specify the platform.
- 🎨 Customize the parsing result format and return content type (cover/link/video)
- ⚡ Built-in duplicate prevention, retry logic, auto cache cleanup
- 📤 Support OneBot message forwarding for better display experience
- 🔌 Multiple built-in parsing APIs with automatic failover

## 项目仓库 (Repository)
- GitHub: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all`
- Issues: `https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues`

## 核心指令 (Core Commands)

| 指令 (Command) | 说明 (Description) | 示例 (Example) |
|----------------|--------------------|----------------|
| `parse <url>` | 手动解析指定的视频链接 | `parse https://v.douyin.com/xxxx/` |
| `clear-cache` | 清理解析缓存和临时下载文件 | `clear-cache` |

## 配置项说明 (Configuration)

| 配置项 (Config Item) | 类型 (Type) | 默认值 (Default) | 说明 (Description) |
|----------------------|-------------|------------------|--------------------|
| `enable` | boolean | true | 是否启用插件 |
| `showWaitingTip` | boolean | true | 解析时是否显示等待提示 |
| `waitingTipText` | string | 正在解析视频，请稍候... | 等待提示文本 |
| `sameLinkInterval` | number | 180 | 相同链接解析间隔（秒） |
| `imageParseFormat` | string | `${标题}\n${UP主}` | 解析结果文本格式 |
| `returnContent.showImageText` | boolean | true | 是否显示文本与封面 |
| `returnContent.showVideoUrl` | boolean | false | 是否显示无水印链接 |
| `returnContent.showVideoFile` | boolean | true | 是否发送视频文件 |
| `maxDescLength` | number | 200 | 简介最大长度 |
| `timeout` | number | 180000 | API 请求超时时间（毫秒） |
| `ignoreSendError` | boolean | true | 忽略消息发送错误，避免插件崩溃 |
| `enableForward` | boolean | false | 启用OneBot平台合并转发功能 |
| `downloadVideoBeforeSend` | boolean | false | 发送前下载视频到本地（仅OneBot） |
| `messageBufferDelay` | number | 0 | 消息缓冲延迟（秒） |
| `retryTimes` | number | 0 | 接口重试次数 |
| `retryInterval` | number | 0 | 重试间隔（毫秒） |
| `videoSendTimeout` | number | 0 | 视频发送超时时间（毫秒） |
| `autoClearCacheInterval` | number | 60 | 自动清理缓存间隔（分钟） |

## 项目贡献者 (Contributors)

| 贡献者 (Contributor) | 贡献内容 (Contribution) |
|----------------------|-------------------------|
| Minecraft-1314 | 插件完整开发 (Complete plugin development) |
| JH-Ahua | BugPk-Api 支持 |
| 素颜API | 素颜API 支持 |
| （欢迎提交 PR 加入贡献者列表） | （Welcome to submit PR to join the contributor list） |

## 许可协议 (License)

本项目采用 MIT 许可证，详情参见 [LICENSE](LICENSE) 文件。

This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

## 支持我们 (Support Us)

如果这个项目对您有帮助，欢迎点亮右上角的 Star ⭐ 支持我们，这将是对所有贡献者最大的鼓励！

If this project is helpful to you, please feel free to star it in the upper right corner ⭐ to support us, which will be the greatest encouragement to all contributors!