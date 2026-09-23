# koishi-plugin-video-parser-all v1.7.4

## 更新日志

### 修复

- **修复卡片链接提取带尾部 JSON 垃圾**：从平台分享卡片（QQ XML/JSON）中提取链接时，URL 尾部会残留 `","showLittleTail":"","gamePoints":"","gamePointsUrl":"","shareOrigin":0` 等 JSON 字段内容，导致发给解析 API 的 URL 无效，返回「请求失败」错误。现已重写 `cleanUrl` 函数，通过正则截断 + `URL` 解析双重清理，确保所有平台的卡片链接均能正确提取。