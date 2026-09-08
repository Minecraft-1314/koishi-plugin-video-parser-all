# koishi-plugin-video-parser-all API 兼容性说明

本文档描述插件在解析第三方 API 返回数据时支持的字段别名、数据结构及默认提取逻辑。  
如您的自定义 API 返回格式与默认不同，可通过 `fieldMapping` 配置覆盖，或参考本文档调整返回结构。

---

## 1. 顶层响应字段

插件会从 HTTP 响应 JSON 的顶层字段中识别状态码、错误信息和数据对象。

### 1.1 状态码字段（优先级从高到低）
- `code`
- `status`
- `status_code`
- `ret`
- `retcode`
- `errno`
- `errcode`

**成功值判断**：  
以下任一值均视为成功：
- `200`
- `0`
- `"0"`
- `"success"`
- `true`

> 注意：部分 API 使用 `code: 1` 表示成功，默认逻辑不识别，建议通过 `fieldMapping` 或调整 API 返回处理。

### 1.2 错误信息字段（优先级从高到低）
- `error`
- `message`
- `msg`
- `errmsg`
- `err_msg`
- `error_msg`
- `description`
- `detail`

失败时，插件会提取第一个存在的字段作为错误提示发送给用户。

### 1.3 数据对象
- 默认从 `data` 字段提取解析数据。
- 若 `data` 为字符串（JSON 字符串），插件会自动 `JSON.parse`。
- 若 `data` 为数组，插件会取第一个元素作为数据对象。
- 若 `data` 不存在或为其他类型，则回退到顶层字段直接提取。

---

## 2. 作品类型识别

插件通过以下字段判断作品类型（`type`）：
- `type`
- `videoType`
- `media_type`
- `content_type`
- `kind`

若未明确指定，则根据数据特征推断：
- 有图片列表且无视频直链 → `image`
- 有 `live_photo` 数组 → `live_photo`
- 否则 → `video`

---

## 3. 核心数据字段别名

### 3.1 标题（Title）
- `title`
- `subject`
- `name`
- `video_name`
- `share_title`
- `caption`

### 3.2 描述/简介（Description）
- `desc`
- `description`
- `content`
- `text`
- `caption`
- `share_text`
- `share_desc`
- `intro`
- `summary`

> 插件会自动截取前 `maxDescLength` 个字符（默认 200）。

### 3.3 作者信息（Author）
**作者对象字段**：  
- `author`
- `user`
- `owner`
- `uploader`
- `creator`
- `publisher`
- `user_info`
- `author_info`
- `profile`

**作者 ID 字段**（对象内或数据顶层）：
- `uid`
- `user_id`
- `sec_uid`
- `mid`
- `profile_id`
- `account_id`
- `id`
- `author_id`

**作者昵称字段**：
- `name`
- `nick`
- `nickname`
- `screen_name`
- `display_name`
- `username`
- `author_name`
- `user_name`

**作者头像字段**：
- `avatar`
- `profile_pic`
- `avatar_url`
- `head_img`
- `user_avatar`
- `avatar_thumb`

### 3.4 封面图（Cover）
- `cover`
- `cover_url`
- `poster`
- `thumbnail`
- `thumb`
- `pic_cover`
- `video_cover`
- `dynamic_cover`
- `cover_img`

### 3.5 视频直链（Video URL）
**直接字段**：
- `video`
- `video_url`
- `play_url`
- `play_addr`
- `source_url`
- `hd_url`
- `sd_url`
- `download_addr`

**嵌套结构支持**：
- `video_info.url` / `video_info.play_url` / `video_info.video_url`
- `play.url` / `play.play_url`
- `download.url` / `download.play_url`
- `url_list`（数组，取第一个字符串或对象的 `url` 属性）
- `bitrate`（数组，取第一个含 `url` 的对象）
- `play_info.url` / `play_info.play_url` / `play_info.video_url`

**视频备选列表（清晰度）**：
- `video_backup` / `video_qualities` / `video_quality`
- `videos` / `video_list`
- `quality_urls`（对象，键为清晰度，值为 URL）

> 插件会优先使用高码率的备选视频（若存在）。

### 3.6 图片列表（Images）
- `images`
- `imgurl`
- `image_list`
- `pics`
- `pic_urls`
- `photo_list`
- `thumbnails`
- `cover_list`
- `image_info`
- `pic_list`

> 数组元素可以是字符串 URL 或包含 `url` 属性的对象。

### 3.7 动图/实况照片（Live Photo）
- `live_photo`（数组，元素对象含 `image` 和可选 `video` 字段）

### 3.8 音乐信息（Music）
**音乐对象字段**：
- `music`
- `music_info`
- `bgm`

**音乐内部字段别名**：
- 标题：`title` / `name`
- 作者：`author` / `artist`
- 封面：`cover` / `albumCover.url`
- 音乐 URL：`url` / `playURL`

### 3.9 统计信息（Statistics）
**统计对象字段**：
- `statistics`
- `stats`
- `metrics`
- `counts`
- `extra`

**点赞数别名**：
- `like_count`
- `digg_count`
- `favorite_count`
- `upvote_count`
- `heart_count`
- `like_num`

**评论数别名**：
- `comment_count`
- `reply_count`
- `review_count`
- `comment_num`

**收藏数别名**：
- `collect_count`
- `save_count`
- `bookmark_count`

**分享/转发数别名**：
- `share_count`
- `repost_count`
- `forward_count`
- `retweet_count`

**播放/浏览数别名**：
- `play_count`
- `view_count`
- `watch_count`
- `click_count`
- `read_count`
- `pv`

> 也支持在 `data` 顶层直接使用上述别名（如 `data.like_count`）。

### 3.10 时长（Duration）
- `duration`
- `video_length`
- `play_duration`
- `seconds`
- `length`
- `duration_ms`（毫秒，自动除以 1000）

### 3.11 发布时间（Publish Time）
- `publishTime`
- `publish_time`
- `create_time`
- `created_at`
- `post_time`
- `upload_time`
- `timestamp`
- `date`
- `datetime`
- `pubdate`
- `time`

> 支持 Unix 时间戳（秒/毫秒）和日期字符串，自动转换为毫秒。

### 3.12 作者扩展信息（可选）
**粉丝数**：
- `author_extra.follower_count`
- `author_info.follower_count`
- `extra.author_extra.follower_count`

**签名**：
- `author_extra.signature`
- `author_info.signature`
- `extra.author_extra.signature`

---

## 4. URL 规范化处理

- 所有 URL 字段会自动补全协议头（若缺少 `http://` 或 `https://`，默认添加 `https:`）。
- 支持相对协议 `//`，自动补全为 `https:`。
- 图片和视频 URL 均适用。

---

## 5. 自定义字段映射（fieldMapping）

如果您的 API 返回结构与上述默认别名不匹配，可以通过插件配置中的 `globalFieldMapping` 或平台级 `fieldMapping` 指定自定义路径。

**支持映射的字段名**：
- `title`
- `desc`
- `author`
- `uid`
- `avatar`
- `cover`
- `video`
- `video_backup`
- `videos`
- `type`
- `like`
- `comment`
- `collect`
- `share`
- `play`
- `duration`
- `publishTime`
- `music_title`
- `music_author`
- `music_cover`
- `music_url`
- `author_followers`
- `author_signature`
- `admire`

**示例**：
假设 API 返回如下：
```json
{
  "code": 0,
  "result": {
    "post": {
      "title": "示例视频",
      "authorInfo": {
        "name": "作者名",
        "id": "123"
      },
      "videoUrl": "https://example.com/video.mp4"
    }
  }
}
```

则 `fieldMapping` 可配置为：
```json
{
  "title": "result.post.title",
  "author": "result.post.authorInfo",
  "video": "result.post.videoUrl"
}
```

> 映射路径以整个响应对象为根，使用点号分隔嵌套字段。

---

## 6. 兼容性优先级

插件字段提取优先级如下：
1. 用户自定义的 `fieldMapping`（如果配置了对应字段）。
2. 默认别名列表（按本文档顺序）。
3. 数据对象 `data` 内的别名。
4. 回退值（空字符串或 0）。

---

## 7. 错误处理兼容

- 若 API 返回非成功状态码，插件优先提取错误信息字段（见 1.2），并展示给用户。
- 若 HTTP 请求本身失败（如 502），插件会尝试从响应体中提取错误信息；若响应体无有效错误字段，则显示 HTTP 状态描述。

---

> 本文档随插件版本更新而更新，请以最新版本为准。