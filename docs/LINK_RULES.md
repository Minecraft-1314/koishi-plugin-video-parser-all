# koishi-plugin-video-parser-all 内置链接规则说明

本文档列出了插件内置的所有平台链接匹配规则（正则表达式），用于从消息文本或卡片中提取链接。
所有规则均**保留查询参数**（如 `?token=...`），不会截断。

平台清单以 `api-new.ifphp.com` 免费视频解析接口的实测结果为准，共 15 个内置平台与 1 个自定义平台机制。

---

## 1. 哔哩哔哩 (bilibili)

```regex
https?:\/\/(?:www\.)?bilibili\.com\/video\/([ab]v[0-9a-zA-Z_-]+)(?:\?[^\s'""]*)?
https?:\/\/(?:b23\.tv|b23\.wtf|bili\d+\.cn|bili2233\.cn|acg\.tv|biliintl\.com)\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*bilibili\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.bilibili.com/video/BV1xx411c7mD?spm_id_from=333.999.0.0`
- `https://b23.tv/abc123`
- `https://bili2233.cn/xyz`

---

## 2. 抖音 (douyin)

```regex
https?:\/\/(?:www\.)?douyin\.com\/video\/\d{10,}(?:\?[^\s'""]*)?
https?:\/\/v\.douyin\.com\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*douyin\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.douyin.com/video/1234567890123456789?previous_page=app_code_link`
- `https://v.douyin.com/abc123/`

**支持的作品类型**：短视频、图集、实况照片（Live Photo）。实况照片链接（如 `https://v.douyin.com/YWNDcRmKMK4/`）解析后统一按普通图片处理，发送每张实况图片，实况视频一律不发送。

---

## 3. Dola (dola)

```regex
https?:\/\/(?:www\.)?dola\.com\/thread\/[0-9a-zA-Z_-]+(?:\?[^\s'""]*)?
https?:\/\/(?:[a-z0-9-]+\.)*dola\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.dola.com/thread/xQwpNNt8dYkgWIudL`

---

## 4. 快手 (kuaishou)

```regex
https?:\/\/(?:www\.)?kuaishou\.com\/short-video\/[0-9a-zA-Z_\/-]+(?:\?[^\s'""]*)?
https?:\/\/v\.kuaishou\.com\/[^\s'""]*
https?:\/\/(?:www\.)?kuaishou\.com\/f\/[0-9a-zA-Z_\/-]+(?:\?[^\s'""]*)?
https?:\/\/(?:[a-z0-9-]+\.)*kuaishou\.com\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*gifshow\.com\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*kwai\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.kuaishou.com/short-video/3x1234567890123456?fid=1234567890`
- `https://v.kuaishou.com/abc123`

---

## 5. 今日头条 (toutiao)

```regex
https?:\/\/(?:www\.)?toutiao\.com\/video\/\d{10,}(?:\?[^\s'""]*)?
https?:\/\/(?:www\.|m\.)?toutiao\.com\/(?:i|w|group|article)\/\d+(?:\?[^\s'""]*)?
https?:\/\/(?:[a-z0-9-]+\.)*toutiao\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.toutiao.com/video/7700817915444085299/`
- `https://www.toutiao.com/i7000000000000000000/`

---

## 6. 千问 (qianwen)

```regex
https?:\/\/(?:www\.)?qianwen\.com\/(?:share\/)?chat\/[0-9a-zA-Z_-]+(?:\?[^\s'""]*)?
https?:\/\/(?:[a-z0-9-]+\.)*qianwen\.com\/[^\s'""]*
https?:\/\/(?:www\.)?tongyi\.aliyun\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.qianwen.com/share/chat/4d32e42ed27749b99745d61d11557bee`
- `https://www.tongyi.aliyun.com/...`

---

## 7. TikTok (tiktok)

```regex
https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/\d{10,}(?:\?[^\s'""]*)?
https?:\/\/(?:vm|vt)\.tiktok\.com\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*tiktok\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.tiktok.com/@user/video/1234567890123456789?is_from_webapp=1`
- `https://vm.tiktok.com/abc123/`

---

## 8. AcFun（A站）(acfun)

```regex
https?:\/\/(?:www\.)?acfun\.cn\/v\/ac\d{10,}(?:\?[^\s'""]*)?
https?:\/\/(?:[a-z0-9-]+\.)*acfun\.cn\/[^\s'""]*
https?:\/\/(?:acfun\.tv|acfun\.com)\/[^\s'""]*
```

**示例链接**：
- `https://www.acfun.cn/v/ac12345678`
- `https://acfun.tv/v/ac12345678`

---

## 9. 微视 (weishi)

```regex
https?:\/\/weishi\.qq\.com\/weishi\/feed\/[0-9a-zA-Z_\/-]+(?:\?[^\s'""]*)?
https?:\/\/(?:[a-z0-9-]+\.)*weishi\.qq\.com\/[^\s'""]*
https?:\/\/(?:www\.)?weishi\.com\/[^\s'""]*
```

**示例链接**：
- `https://weishi.qq.com/weishi/feed/1234567890`

---

## 10. 好看视频 (haokan)

```regex
https?:\/\/haokan\.baidu\.com\/v\?vid=[0-9a-zA-Z_\/-]+
https?:\/\/(?:[a-z0-9-]+\.)*haokan\.baidu\.com\/[^\s'""]*
https?:\/\/(?:www\.)?haokan\.com\/[^\s'""]*
```

**示例链接**：
- `https://haokan.baidu.com/v?vid=1234567890123456789`

---

## 11. 豆包 (doubao)

```regex
https?:\/\/(?:www\.)?doubao\.com\/video\/\d{10,}(?:\?[^\s'""]*)?
https?:\/\/(?:www\.)?doubao\.com\/video-sharing\?[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*doubao\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.doubao.com/video/1234567890123456789`
- `https://www.doubao.com/video-sharing?video_id=1234567890`

---

## 12. 豆包图片 (doubao_image)

```regex
https?:\/\/(?:www\.)?doubao\.com\/thread\/[^\s'""]+
```

**示例链接**：
- `https://www.doubao.com/thread/1234567890123456789`

---

## 13. 微信视频号 (wechat_channel)

```regex
https?:\/\/channels\.weixin\.qq\.com\/[^\s'""]+
https?:\/\/weixin\.qq\.com\/sph\/[^\s'""]+
https?:\/\/(?:[a-z0-9-]+\.)*channels\.weixin\.qq\.com\/[^\s'""]*
```

**示例链接**：
- `https://channels.weixin.qq.com/1234567890`
- `https://weixin.qq.com/sph/abc123`

---

## 14. 梨视频 (lishi)

```regex
https?:\/\/(?:www\.)?pearvideo\.com\/video_\d+(?:\?[^\s'""]*)?
https?:\/\/video\.li\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*pearvideo\.com\/[^\s'""]*
```

**示例链接**：
- `https://www.pearvideo.com/video_1234567`
- `https://video.li/abc123`

> 新站短视频解析聚合返回的平台标识为 `lishipin`，插件内部仍沿用 `lishi`。

---

## 15. 即梦/剪映 (jimeng)

```regex
https?:\/\/(?:www\.)?jimeng\.jianying\.com\/[^\s'""]*
https?:\/\/(?:www\.)?jimeng\.cn\/[^\s'""]*
https?:\/\/(?:www\.)?dreamina\.jianying\.com\/[^\s'""]*
https?:\/\/(?:www\.)?dreamina\.capcut\.com\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*jimeng\.jianying\.com\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*jimeng\.cn\/[^\s'""]*
https?:\/\/(?:[a-z0-9-]+\.)*dreamina\.capcut\.com\/[^\s'""]*
```

**示例链接**：
- `https://jimeng.jianying.com/abc123`
- `https://dreamina.capcut.com/abc123`

---

## 16. 自定义平台规则

自定义平台使用**关键词匹配**方式，根据配置的 `keywords`（逗号分隔）生成正则表达式，类型为 `custom_${name}`：

```regex
https?:\/\/[^\/\s"'“”‘’]*(关键词1|关键词2|...)[^\s"'“”‘’]*
```

**说明**：
- 关键词是指链接域名或路径中的特征字符串，例如 `example.com`。
- 插件会在完整 URL 中查找关键词，若包含则匹配。
- 生成的规则同样保留查询参数。

**示例**：
配置 `keywords = "example.com,example.cn"`，则正则大致为：

```regex
https?:\/\/[^\/\s"'“”‘’]*(example.com|example.cn)[^\s"'“”‘’]*
```

---

## 注意事项

- 所有规则均不区分大小写（`gi` 标志）。
- 短链接规则使用 `[^\s'""]+` 或 `[^\s'""]*` 确保完整捕获带查询参数的 URL。
- 如果链接包含转义字符（如 `\/`），插件会先统一替换为正斜杠再匹配。
- 提取到的 URL 会经过清洗（移除首尾标点、HTML 实体等），确保有效。
- 同一作品的重复链接会按平台提取作品 id 去重（如 B站 BV 号、抖音视频 id、今日头条视频 id、千问会话 id 等），其余按去查询参数后的 URL 去重。

---

> 本文档随插件版本更新而更新，请以最新版本为准。
