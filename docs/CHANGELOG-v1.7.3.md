# koishi-plugin-video-parser-all v1.7.3

## 更新日志

### 新增

- **新增 `authMode` 认证方式选择**：支持 Header（默认）和 Query 两种 API Key 传递方式。
  - `header`（默认）：通过 `X-API-Key` 请求头传递，推荐服务端使用，地址干净且不暴露 Key。
  - `query`：通过 URL 参数 `?key=xxx` 传递，适合快速验证或无法自定义请求头的客户端。
  - 可配合 `authHeaderType` 进一步切换为 `Bearer` 或自定义头名。

### 修复

- **修复作者头像文字未单独发送**：非转发路径下，"作者头像："现在像"封面："一样作为独立消息发送，不再拼接进主文本。

### 改进

- **清理 `platformDedicatedFirst` 配置**：移除无专属 API 的平台（小红书、微博、YouTube、TikTok、AcFun、知乎、微视、虎牙、好看视频、美拍、Twitter/X、Instagram、绿洲、梨视频、全民直播、皮皮虾、最右），只保留 7 个有专属 API 的平台（bilibili、douyin、kuaishou、wechat_channel、doubao、pipigx、jimeng），避免用户看到无法生效的开关。
- **API 文档更新**：`docs/API_ADDRESSES.md` 新增认证方式章节，详细说明 Header/Query 两种传 Key 方式的使用场景和配置方法。