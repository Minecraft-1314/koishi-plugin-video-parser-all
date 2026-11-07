# 插件 API 解析地址 (Plugin API Endpoints)

本插件所有解析请求默认发送至 ifphp（BugPk）提供的解析服务，请求域名固定为 `https://api-new.ifphp.com`，并需在插件配置中填写 `apiKey`。

## 认证方式 (Authentication)

同一接口支持两种等价的 Key 传递方式，在插件配置中通过 `authMode` 选择：

### Header 模式（默认，`authMode: "header"`）

推荐服务端调用使用，请求地址更干净，也不容易在日志或分享链接中暴露 Key。

```
X-API-Key: <apiKey>
```

可通过 `authHeaderType` 切换为 `Authorization: Bearer <apiKey>` 或自定义请求头名称。

### Query 模式（`authMode: "query"`）

适合快速验证或无法自定义请求头的客户端。

```
https://api-new.ifphp.com/api/svparse?key=<apiKey>&url=https://v.douyin.com/xxxx/
```

## 请求方式 (Request Method)

- 方法：GET
- 参数：待解析链接通过查询参数 `url` 传递
- 请求头：`User-Agent`、`Referer: https://www.baidu.com/`、`Content-Type: application/x-www-form-urlencoded`

## 主解析 API (Main API)

默认情况下所有平台先请求主 API；结果不可用或请求失败时，再尝试平台专属 API（若该平台已内置）。

| 用途 | API 地址 |
|------|----------|
| 通用聚合解析接口（默认主 API） | `https://api-new.ifphp.com/api/svparse` |

以下平台未内置专属接口，统一由主 API 解析：今日头条、千问、TikTok、AcFun（A站）、微视、好看视频、豆包图片、梨视频等。

## 平台专属 API (Platform Dedicated APIs)

| 平台标识 | 平台 | API 地址 |
|---------|------|----------|
| `bilibili` | 哔哩哔哩 | `https://api-new.ifphp.com/api/bilibili` |
| `douyin` | 抖音 | `https://api-new.ifphp.com/api/dyjx`，失败后尝试 `https://api-new.ifphp.com/api/dydj` |
| `kuaishou` | 快手 | `https://api-new.ifphp.com/api/ksjx` |
| `wechat_channel` | 微信视频号 | `https://api-new.ifphp.com/api/wxsph` |
| `doubao` | 豆包 | `https://api-new.ifphp.com/api/doubao` |
| `jimeng` | 即梦/剪映 | `https://api-new.ifphp.com/api/jimeng` |
| `dola` | Dola | `https://api-new.ifphp.com/api/dola` |
| `douyin` 二级回退 | 抖音 `video_id` 原画直链 | `https://api-new.ifphp.com/api/zjyh` |

## 请求示例 (Examples)

解析抖音链接：

```
GET https://api-new.ifphp.com/api/dyjx?url=https://v.douyin.com/xxxx/
X-API-Key: <你的 API Key>
```

解析即梦链接：

```
GET https://api-new.ifphp.com/api/jimeng?url=https://jimeng.jianying.com/xxxx/
X-API-Key: <你的 API Key>
```

## 调用顺序 (Call Order)

1. 默认：先请求主 API（`svparse`），失败或返回空内容时降级到平台专属 API。
2. 抖音按 `svparse` → `dyjx` → `dydj` 的顺序尝试；若前序接口返回 `video_id` 但没有媒体地址，再调用 `zjyh?video_id=<id>`。缺少 `video_id` 时跳过 `zjyh`，且该跳过、空内容响应或 HTML 响应都不会覆盖服务端返回的真实业务错误（如「作品未审核通过」）。错误信息优先级为「HTTP 200 明确业务结论 > 传输层（4xx/5xx）错误体 > 其它错误」，HTML 跳转页与超长文本会被净化为「解析接口返回了非预期内容」，字符串型 JSON 响应也能正确读取 `code`/`msg`。
3. 抖音实况照片在 `svparse` / `dyjx` 中返回的作品类型为 `live`，数据位于 `live_photo` 数组（元素含 `image` 与 `video`）；插件将其归一化为普通图片类型，只发送图片、不发送实况视频。`dydj` 面向短剧，实况照片场景下会返回「未找到该短剧作品」，属正常失败并继续降级。
4. 若在配置中开启某平台的「优先使用专属 API」（`platformDedicatedFirst`），则先专属、后主 API。
5. 自定义平台（`custom_` 前缀）只请求其配置的解析 API。

## 配置覆盖 (Configuration Overrides)

| 配置项 | 说明 |
|--------|------|
| `primaryApiUrl` | 覆盖默认主 API 地址 |
| `customApis[].apiUrl` | 按平台覆盖内置平台 API（`platform` 可选值含 `bilibili`/`douyin`/`kuaishou`/`toutiao`/`qianwen`/`doubao`/`jimeng`/`wechat_channel` 等） |
| `customPlatforms[].apiUrl` | 新增自定义平台及其解析 API |
| `apiKey` / `authMode` / `authHeaderType` / `customHeaderName` | 认证密钥与认证方式（Header/Query + 头类型） |
