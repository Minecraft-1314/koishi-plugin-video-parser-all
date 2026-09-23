# koishi-plugin-video-parser-all

> Default language: [中文版](README.md)

## Important Announcements

Please read first:
- [Migration note #12](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/12)
- [Guide for choosing between the original repo (`Minecraft-1314/koishi-plugin-video-parser-all`) and the fork (`@char46/koishi-plugin-video-parser-all`) #14](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/14)
- [Dedicated issue tracker for the fork (`@char46/koishi-plugin-video-parser-all`) #13](https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues/13)

## Documentation

| Document | Description |
|------|------|
| [CHANGELOG-v1.7.4.md](docs/CHANGELOG-v1.7.4.md) | v1.7.4 changelog |
| [API_ADDRESSES.md](docs/API_ADDRESSES.md) | API parsing addresses for the main gateway and platform-specific endpoints |
| [COMPATIBILITY.md](docs/COMPATIBILITY.md) | API field compatibility notes, including all supported field aliases |
| [LINK_RULES.md](docs/LINK_RULES.md) | Link matching rules for all supported platforms (regex) |

## Introduction

This is a **cross-platform video/image parsing plugin** developed for the Koishi framework. It supports automatic recognition and parsing of short video/image/live links from **20+ mainstream platforms**, including Douyin, Kuaishou, Bilibili, Xiaohongshu, Weibo, Xigua Video, YouTube, TikTok, AcFun, Zhihu, Weishi, Huya, Haokan Video, Meipai, Twitter/X, Instagram, Doubao (video/image), **Jimeng (AI video/image)**, Oasis, Video Account, Pear Video, Quanmin Live, Pipi Funny, Pipi Shrimp, and Zuiyou.

## Repository

- GitHub: https://github.com/Minecraft-1314/koishi-plugin-video-parser-all
- Issues: https://github.com/Minecraft-1314/koishi-plugin-video-parser-all/issues

## Quick Start

```bash
# 1. Open your Koishi project or console workspace
# 2. Install the plugin
# 3. Enable it and send a video or image album link; parsing will start automatically
```

## Commands

| Command | Description | Example |
|------|------|------|
| `parse <url>` | Manually parse a video or image album link | `parse https://v.douyin.com/xxxx/` |

## Configuration

### General

| Config | Type | Default | Description |
|------|------|------|------|
| `enable` | boolean | `true` | Enable the plugin |
| `botName` | string | `视频解析机器人` | Nickname used in forwarded messages |
| `showWaitingTip` | boolean | `true` | Show a waiting tip |
| `debug` | boolean | `false` | Enable debug logging |
| `platformEnabled` | object | All enabled | Enable or disable platforms |

### Message Format

| Config | Type | Default | Description |
|------|------|------|------|
| `unifiedMessageFormat` | string | preset | Text template with variables: `${标题}` `${作者}` `${简介}` `${视频时长}` `${点赞数}` `${收藏数}` `${转发数}` `${播放数}` `${评论数}` `${发布时间}` `${图片数量}` `${作者ID}` `${音乐标题}` `${音乐作者}`; empty lines are hidden automatically |

### Media Sending

| Config | Type | Default | Description |
|------|------|------|------|
| `showImageText` | boolean | `true` | Send text content |
| `showCoverImage` | boolean | `true` | Send the cover image |
| `showCoverFile` | boolean | `true` | Send the cover as an image; disable to send the link only |
| `showCoverText` | boolean | `true` | Show a text hint before the cover image |
| `coverText` | string | `封面：` | Text shown before the cover image |
| `showImageFileNew` | boolean | `true` | Send images as images; disable to send links only |
| `showAuthorAvatar` | boolean | `true` | Send the author avatar image |
| `showAuthorAvatarFile` | boolean | `true` | Send the avatar as an image; disable to send the link only |
| `showAuthorAvatarText` | boolean | `true` | Show a text hint before the author avatar; appended to the text message |
| `authorAvatarText` | string | `作者头像：` | Text shown before the author avatar |
| `showMusicCover` | boolean | `true` | Send the music cover image |
| `showVideoFile` | boolean | `true` | Send videos as video files; disable to send links only |

### Music Voice

| Config | Type | Default | Description |
|------|------|------|------|
| `showMusicVoice` | boolean | `false` | Send music links as voice messages |
| `showMusicVoiceFile` | boolean | `true` | Send music as a voice file; disable to send the link only |

### Performance and Limits

| Config | Type | Default | Description |
|------|------|------|------|
| `maxDescLength` | number | `200` | Maximum description length |
| `maxConcurrent` | number | `3` | Maximum concurrent parsing tasks |

### Network and Requests

| Config | Type | Default | Description |
|------|------|------|------|
| `timeout` | number | `180000` | API request timeout (ms) |
| `videoSendTimeout` | number | `180000` | Message send timeout (ms) |
| `userAgent` | string | preset | User-Agent |
| `apiKey` | string | empty | API key for `api-new.ifphp.com` |
| `authMode` | string | `header` | API key delivery mode: `header` (`X-API-Key` header) or `query` (`?key=xxx`) |
| `proxy` | object | see notes | HTTP/HTTPS proxy |
| `customHeaders` | array | `[]` | Custom request headers |

> `proxy` fields: `enabled`, `protocol`, `host`, `port`, `auth.username`, `auth.password`.

### Sending and Retry

| Config | Type | Default | Description |
|------|------|------|------|
| `ignoreSendError` | boolean | `true` | Ignore send errors |
| `retryTimes` | number | `3` | Retry count |
| `retryInterval` | number | `1000` | Retry interval (ms) |
| `enableForward` | boolean | `false` | Enable merged forwarding (OneBot/Satori) |

### Cache and Deduplication

| Config | Type | Default | Description |
|------|------|------|------|
| `enableDeduplication` | boolean | `true` | Enable duplicate parsing detection and hints |
| `deduplicationInterval` | number | `180` | Deduplication interval (s) |
| `cacheTTL` | number | `600` | Cache TTL (s) |

### API and Platforms

| Config | Type | Default | Description |
|------|------|------|------|
| `primaryApiUrl` | string | `https://api-new.ifphp.com/api/svparse` | Main aggregation API URL |
| `platformDedicatedFirst` | object | all disabled | Prefer dedicated APIs for `bilibili`, `douyin`, `kuaishou`, `wechat_channel`, `doubao`, `pipigx`, and `jimeng` |
| `customApis` | array | `[]` | Override built-in platform APIs |
| `customPlatforms` | array | `[]` | Add custom platforms |
| `globalFieldMapping` | string | preset | Global field mapping JSON |

> Dedicated APIs are available for: `bilibili`, `douyin`, `kuaishou`, `wechat_channel`, `doubao`, `pipigx`, `jimeng`.

### UI Text

| Config | Type | Default | Description |
|------|------|------|------|
| `waitingTipText` | string | `正在解析视频，请稍候...` | Waiting tip |
| `unsupportedPlatformText` | string | `不支持该平台链接` | Unsupported platform tip |
| `invalidLinkText` | string | `无效的视频链接` | Invalid link tip |
| `parseErrorPrefix` | string | `❌ 解析失败：` | Error prefix |
| `parseErrorItemFormat` | string | `【${url}】: ${msg}` | Error format |
| `deduplicationTipText` | string | `链接 ${url} 在最近 ${interval} 秒内已解析过，已跳过。` | Duplicate parsing hint; supports `${url}` and `${interval}` |

## Supported Variables

You can use the following variables in `unifiedMessageFormat`. Empty lines are hidden automatically.

| Variable | Description |
|------|------|
| `${标题}` | Title |
| `${作者}` | Author name |
| `${简介}` | Description |
| `${视频时长}` | Duration (hh:mm:ss) |
| `${点赞数}` | Like count |
| `${收藏数}` | Favorite count |
| `${转发数}` | Share count |
| `${播放数}` | Play count |
| `${评论数}` | Comment count |
| `${发布时间}` | Publish time, formatted |
| `${图片数量}` | Image or live photo count |
| `${作者ID}` | Author ID |
| `${音乐标题}` | Music title |
| `${音乐作者}` | Music author |

## Supported Platforms

The plugin can automatically identify links from these platforms. All patterns support HTTP and HTTPS and tolerate trailing path segments after short links.

| Platform | Keywords and domain/path patterns | Supported content |
|------|------|------|
| Bilibili | `bilibili.com/video/`, `b23.tv`, `bili*.cn`, `b23.wtf`, `b2233.cn` | Video |
| Douyin | `douyin.com/video/`, `v.douyin.com` | Short video, image, live photo |
| Kuaishou | `kuaishou.com/short-video/`, `v.kuaishou.com`, `kuaishou.com/f/` | Short video, image |
| Xiaohongshu | `xiaohongshu.com/discovery/item/`, `xhslink.com`, `xiaohongshu.com/explore/`, `xiaohongshu.com/board/` | Image, video |
| Weibo | `weibo.com/<id>/`, `video.weibo.com/show`, `t.cn`, `m.weibo.cn` | Video, image |
| Xigua | `ixigua.com` | Short video |
| YouTube | `youtube.com/watch`, `youtu.be`, `youtube.com/shorts/` | Video |
| TikTok | `tiktok.com/@/video/`, `vm.tiktok.com`, `vt.tiktok.com` | Short video |
| AcFun | `acfun.cn/v/ac` | Video |
| Zhihu | `zhihu.com/video/`, `zhihu.com/question/xxx/answer/xxx`, `zhuanlan.zhihu.com/p/`, `zhihu.com/zvideo/` | Video, answer video |
| Weishi | `weishi.qq.com/weishi/feed/` | Short video |
| Huya | `huya.com/video/` | Live replay, video |
| Haokan | `haokan.baidu.com/v?vid=` | Short video |
| Meipai | `meipai.com/media/` | Short video |
| Twitter / X | `twitter.com/<username>/status/`, `x.com/<username>/status/` | Video, image |
| Instagram | `instagram.com/p/`, `instagram.com/reel/`, `instagram.com/share/` | Image, Reels |
| Doubao Video | `doubao.com/video/`, `doubao.com/video-sharing` | Video |
| Doubao Image | `doubao.com/thread/` | Image |
| Jimeng | `jimeng.jianying.com`, `jimeng.cn`, `dreamina.jianying.com`, `dreamina.capcut.com` | AI video, AI image |
| Oasis | `oasis.weibo.com/v/` | Video, image |
| WeChat Channels | `channels.weixin.qq.com`, `weixin.qq.com/sph/` | Short video |
| Pear Video | `pearvideo.com/video_`, `video.li` | Short video |
| Quanmin Live | `quanmin.tv`, `quanmintv.cn` | Live |
| Pipigx | `h5.pipigx.com/pp/post/`, `ippzone.com` | Short video |
| Pipixia | `pipix.com`, `pipixia.com` | Short video |
| Zuiyou | `share.xiaochuankeji.cn/hybrid/share/post`, `izuiyou.com` | Short video |
| Custom | Add via `customPlatforms` | Depends on the provided API |

## Contributors

| Contributor | Contribution |
|------|------|
| Minecraft-1314 | Complete plugin development |
| ShiraiKuroko003 | Fixed message format settings issue; PR 1.2.5 includes the fix |
| cyavb | Suggested custom API key auth; adopted |
| Keep785 | Reported cover toggle bug; fixed |
| Keep785 | Reported parsing issue; fixed |
| dzt2008 + Apricityx | Reported false parsing for unsupported video URLs; fixed |
| linyves | Reported repeated Xiaohongshu cover sends; fixed |
| linyves | Reported topic display issue; fixed |
| linyves | Suggested treating Live Photo as normal images; adopted |
| linyves | Reported author avatar being sent after parsing; fixed |
| GSRealms | Reported duplicate video parsing; fixed |
| JH-Ahua | API support |
| shangxue | Inspiration |

> Contributions via Issues and PRs are welcome.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.

## Support

If this project helps you, please give it a Star on GitHub.
