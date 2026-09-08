# koishi-plugin-video-parser-all 内置链接规则说明

本文档列出了插件内置的所有平台链接匹配规则（正则表达式），用于从消息文本或卡片中提取链接。  
所有规则均**保留查询参数**（如 `?token=...`），不会截断。

---

## 1. 哔哩哔哩 (bilibili)

```regex
https?://(?:www.)?bilibili.com/video/([ab]v[0-9a-zA-Z_-]+)(?:?[^s'"“”‘’]*)?
https?://b23.tv/[^s'"“”‘’]+
https?://bilid+.cn/[^s'"“”‘’]+
https?://b23.wtf/[^s'"“”‘’]+
https?://bili2233.cn/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*bilibili.com/[^s'"“”‘’]*
https?://(?:b23.tv|b23.wtf|bilid+.cn|bili2233.cn|acg.tv|biliintl.com)/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.bilibili.com/video/BV1xx411c7mD?spm_id_from=333.999.0.0`
- `https://b23.tv/abc123`
- `https://bili2233.cn/xyz`

---

## 2. 抖音 (douyin)

```regex
https?://(?:www.)?douyin.com/video/d{10,}(?:?[^s'"“”‘’]*)?
https?://v.douyin.com/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*douyin.com/[^s'"“”‘’]*
https?://v.douyin.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.douyin.com/video/1234567890123456789?previous_page=app_code_link`
- `https://v.douyin.com/abc123/`

---

## 3. 快手 (kuaishou)

```regex
https?://(?:www.)?kuaishou.com/short-video/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://v.kuaishou.com/[^s'"“”‘’]+
https?://(?:www.)?kuaishou.com/f/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*kuaishou.com/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*gifshow.com/[^s'"“”‘’]*
https?://v.kuaishou.com/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*kwai.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.kuaishou.com/short-video/3x1234567890123456?fid=1234567890`
- `https://v.kuaishou.com/abc123`

---

## 4. 小红书 (xiaohongshu)

```regex
https?://(?:www.)?xiaohongshu.com/discovery/item/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://xhslink.com/[^s'"“”‘’]+
https?://(?:www.)?xiaohongshu.com/explore/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:www.)?xiaohongshu.com/board/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*xiaohongshu.com/[^s'"“”‘’]*
https?://(?:xhslink.com|xhslink.cn|xhsurl.cn|xhsurl.com)/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.xiaohongshu.com/explore/6a4b1fa70000000008000c02?xsec_token=ABjd431Iyv8HKyZZC3T615b40sv0dmd7p-441morS8MEQ=`
- `https://xhslink.com/abc123`

---

## 5. 微博 (weibo)

```regex
https?://weibo.com/d+/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://video.weibo.com/show?fid=[0-9a-zA-Z_/-]+
https?://t.cn/[^s'"“”‘’]+
https?://m.weibo.cn/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*weibo.com/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*weibo.cn/[^s'"“”‘’]*
https?://t.cn/[^s'"“”‘’]*
```

**示例链接**：
- `https://weibo.com/1234567890/abcdefghij?refer_flag=1001030103_`
- `https://video.weibo.com/show?fid=1034:1234567890123456`

---

## 6. 西瓜视频 (xigua)

```regex
https?://(?:www.)?ixigua.com/d{10,}(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*ixigua.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.ixigua.com/1234567890123456789?logTag=...`

---

## 7. YouTube (youtube)

```regex
https?://(?:www.)?youtube.com/watch?v=[a-zA-Z0-9_-]{11}(?:&[^s'"“”‘’]*)?
https?://youtu.be/[^s'"“”‘’]+
https?://(?:www.)?youtube.com/shorts/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*youtube.com/[^s'"“”‘’]*
https?://youtu.be/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.youtube.com/watch?v=abcdefghijk&list=...`
- `https://youtu.be/abcdefghijk`

---

## 8. TikTok (tiktok)

```regex
https?://(?:www.)?tiktok.com/@[w.]+/video/d{10,}(?:?[^s'"“”‘’]*)?
https?://vm.tiktok.com/[^s'"“”‘’]+
https?://vt.tiktok.com/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*tiktok.com/[^s'"“”‘’]*
https?://(?:vm|vt).tiktok.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.tiktok.com/@user/video/1234567890123456789?is_from_webapp=1`
- `https://vm.tiktok.com/abc123/`

---

## 9. AcFun（A站）(acfun)

```regex
https?://(?:www.)?acfun.cn/v/acd{10,}(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*acfun.cn/[^s'"“”‘’]*
https?://(?:acfun.tv|acfun.com)/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.acfun.cn/v/ac12345678`
- `https://acfun.tv/v/ac12345678`

---

## 10. 知乎 (zhihu)

```regex
https?://(?:www.)?zhihu.com/video/d{10,}(?:?[^s'"“”‘’]*)?
https?://(?:www.|m.)?zhihu.com/question/d+/answer/d+(?:?[^s'"“”‘’]*)?
https?://zhuanlan.zhihu.com/p/d+(?:?[^s'"“”‘’]*)?
https?://(?:www.|m.)?zhihu.com/zvideo/d+(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*zhihu.com/[^s'"“”‘’]*
https?://zhi.hu/[^s'"“”‘’]+
```

**示例链接**：
- `https://www.zhihu.com/video/1234567890123456789`
- `https://www.zhihu.com/question/12345678/answer/123456789`
- `https://zhi.hu/abc123`

---

## 11. 微视 (weishi)

```regex
https?://weishi.qq.com/weishi/feed/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*weishi.qq.com/[^s'"“”‘’]*
https?://(?:www.)?weishi.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://weishi.qq.com/weishi/feed/1234567890`

---

## 12. 虎牙 (huya)

```regex
https?://(?:www.)?huya.com/video/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*huya.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.huya.com/video/12345678`

---

## 13. 好看视频 (haokan)

```regex
https?://haokan.baidu.com/v?vid=[0-9a-zA-Z_/-]+
https?://(?:[a-z0-9-]+.)*haokan.baidu.com/[^s'"“”‘’]*
https?://(?:www.)?haokan.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://haokan.baidu.com/v?vid=1234567890123456789`

---

## 14. 美拍 (meipai)

```regex
https?://(?:www.)?meipai.com/media/d{10,}(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*meipai.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.meipai.com/media/1234567890`

---

## 15. Twitter / X (twitter)

```regex
https?://twitter.com/w+/status/d{10,}(?:?[^s'"“”‘’]*)?
https?://x.com/w+/status/d{10,}(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*(?:twitter.com|x.com)/[^s'"“”‘’]*
https?://t.co/[^s'"“”‘’]+
```

**示例链接**：
- `https://twitter.com/user/status/1234567890123456789?s=20`
- `https://x.com/user/status/1234567890123456789`

---

## 16. Instagram (instagram)

```regex
https?://(?:www.)?instagram.com/p/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:www.)?instagram.com/reel/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:www.)?instagram.com/share/(?:reel|p)/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:[a-z0-9-]+.)*instagram.com/[^s'"“”‘’]*
https?://(?:instagr.am|ig.me)/[^s'"“”‘’]+
```

**示例链接**：
- `https://www.instagram.com/p/AbCdEfGhIjK/?utm_source=ig_web_copy_link`
- `https://www.instagram.com/reel/AbCdEfGhIjK/`

---

## 17. 豆包 (doubao)

```regex
https?://(?:www.)?doubao.com/video/d{10,}(?:?[^s'"“”‘’]*)?
https?://(?:www.)?doubao.com/video-sharing?[^s'"“”‘’]*
https?://(?:www.)?doubao.com/thread/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*doubao.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.doubao.com/video/1234567890123456789`
- `https://www.doubao.com/video-sharing?video_id=1234567890`

---

## 18. 豆包图片 (doubao_image)

```regex
https?://(?:www.)?doubao.com/thread/[^s'"“”‘’]+
```

**示例链接**：
- `https://www.doubao.com/thread/1234567890123456789`

---

## 19. 绿洲 (oasis)

```regex
https?://(?:www.)?oasis.weibo.com/v/[0-9a-zA-Z_/-]+(?:?[^s'"“”‘’]*)?
https?://(?:m.)?oasis.weibo.cn/[^s'"“”‘’]*
https?://(?:www.)?lvzhou.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://oasis.weibo.com/v/1234567890`
- `https://m.oasis.weibo.cn/1234567890`

---

## 20. 微信视频号 (wechat_channel)

```regex
https?://channels.weixin.qq.com/[^s'"“”‘’]+
https?://weixin.qq.com/sph/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*channels.weixin.qq.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://channels.weixin.qq.com/1234567890`
- `https://weixin.qq.com/sph/abc123`

---

## 21. 梨视频 (lishi)

```regex
https?://(?:www.)?pearvideo.com/video_d+(?:?[^s'"“”‘’]*)?
https?://video.li/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*pearvideo.com/[^s'"“”‘’]*
https?://video.li/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.pearvideo.com/video_1234567`
- `https://video.li/abc123`

---

## 22. 全民直播 (quanmin)

```regex
https?://(?:www.)?quanmin.tv/[^s'"“”‘’]+
https?://(?:www.)?quanmintv.cn/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*quanmin.tv/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*quanmintv.cn/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.quanmin.tv/123456789`

---

## 23. 皮皮搞笑 (pipigx)

```regex
https?://h5.pipigx.com/pp/post/d+(?:?[^s'"“”‘’]*)?
https?://(?:www.)?ippzone.com/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*pipigx.com/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*ippzone.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://h5.pipigx.com/pp/post/1234567890`
- `https://www.ippzone.com/abc123`

---

## 24. 皮皮虾 (pipixia)

```regex
https?://(?:h5|www).pipix.com/[^s'"“”‘’]+
https?://(?:www.)?pipixia.com/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*pipix.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://www.pipix.com/abc123`
- `https://h5.pipix.com/abc123`

---

## 25. 最右 (zuiyou)

```regex
https?://share.xiaochuankeji.cn/hybrid/share/post?pid=d+
https?://(?:h5|www).izuiyou.com/[^s'"“”‘’]+
https?://(?:[a-z0-9-]+.)*izuiyou.com/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*ixiaochuan.cn/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*zuiyou.tv/[^s'"“”‘’]*
```

**示例链接**：
- `https://share.xiaochuankeji.cn/hybrid/share/post?pid=12345678`
- `https://www.izuiyou.com/abc123`

---

## 26. 即梦/剪映 (jimeng)

```regex
https?://(?:www.)?jimeng.jianying.com/[^s'"“”‘’]*
https?://(?:www.)?jimeng.cn/[^s'"“”‘’]*
https?://(?:www.)?dreamina.jianying.com/[^s'"“”‘’]*
https?://(?:www.)?dreamina.capcut.com/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*jimeng.jianying.com/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*jimeng.cn/[^s'"“”‘’]*
https?://(?:[a-z0-9-]+.)*dreamina.capcut.com/[^s'"“”‘’]*
```

**示例链接**：
- `https://jimeng.jianying.com/abc123`
- `https://dreamina.capcut.com/abc123`

---

## 27. 自定义平台规则

自定义平台使用**关键词匹配**方式，根据配置的 `keywords`（逗号分隔）生成正则表达式：

```regex
https?://[^/s"'“”‘’]*(关键词1|关键词2|...)[^s"'“”‘’]*
```

**说明**：
- 关键词是指链接域名或路径中的特征字符串，例如 `example.com`。
- 插件会在完整 URL 中查找关键词，若包含则匹配。
- 生成的规则同样保留查询参数。

**示例**：  
配置 `keywords = "example.com,example.cn"`，则正则大致为：

```regex
https?://[^/s"'“”‘’]*(example.com|example.cn)[^s"'“”‘’]*
```

---

## 注意事项

- 所有规则均不区分大小写（`gi` 标志）。
- 短链接规则使用 `[^s'"“”‘’]+` 或 `[^s'"“”‘’]*` 确保完整捕获带查询参数的 URL。
- 如果链接包含转义字符（如 `\/`），插件会先统一替换为正斜杠再匹配。
- 提取到的 URL 会经过清洗（移除首尾标点、HTML 实体等），确保有效。

---

> 本文档随插件版本更新而更新，请以最新版本为准。