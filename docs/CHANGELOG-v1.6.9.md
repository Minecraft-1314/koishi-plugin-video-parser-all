# koishi-plugin-video-parser-all v1.6.9

## 更新日志

### 修复

- **修复同一链接重复解析问题（全平台）**：每个平台都有宽泛的 catch-all 正则规则，用户发送的 URL 会被特定规则和 catch-all 规则分别匹配，导致同一内容被解析两次、发送两次结果。现通过 `dedupeKey()` 对所有主要平台提取内容唯一标识作为统一去重键：bilibili 提取 BV/AV 号、抖音提取视频 ID、快手提取视频 ID、小红书提取 item ID、微博提取帖子 ID、YouTube 提取视频 ID、TikTok 提取视频 ID、Twitter/X 提取推文 ID、Instagram 提取帖子 ID、AcFun 提取 ac ID、知乎提取视频/问答 ID、西瓜提取文章 ID、好看/美拍提取视频 ID。无法提取 ID 的平台通过去除查询参数去重。
- **修复发送失败无通知问题**：所有发送操作（合并转发、逐条发送、降级发送）失败时均被 `.catch(() => {})` 静默吞掉，用户完全无感知。现替换为 `sendSafe()` 辅助函数，发送失败时向用户推送「发送失败：{上下文」通知消息。