# 插件 API 解析地址 (Plugin API Endpoints)

本插件所有解析请求默认发送至 ifphp（BugPk）提供的解析服务，请求域名固定为 `https://api-new.ifphp.com`，并需在插件配置中填写 `apiKey`。

## 请求方式 (Request Method)

- 方法：GET
- 参数：待解析链接通过查询参数 `url` 传递
- 请求头：
  - `User-Agent`
  - `Referer: https://www.baidu.com/`
  - `Content-Type: application/x-www-form-urlencoded`
  - 认证头：默认 `X-API-Key: <apiKey>`，可切换为 `Authorization: Bearer <apiKey>` 或自定义请求头

## 主解析 API (Main API)

默认情况下所有平台先请求主 API；结果不可用或请求失败时，再尝试平台专属 API（若该平台已内置）。

| 用途 | API 地址 |
|------|----------|
| 通用聚合解析接口（默认主 API） | `https://api-new.ifphp.com/api/svparse` |

以下平台未内置专属接口，统一由主 API 解析：小红书、微博、西瓜视频、YouTube、TikTok、AcFun（A站）、知乎、微视、虎牙、好看视频、美拍、Twitter/X、Instagram、豆包图片、绿洲、梨视频、全民直播、皮皮虾、最右等。

## 平台专属 API (Platform Dedicated APIs)

| 平台标识 | 平台 | API 地址 |
|---------|------|----------|
| `bilibili` | 哔哩哔哩 | `https://api-new.ifphp.com/api/bilibili` |
| `douyin` | 抖音 | `https://api-new.ifphp.com/api/dyjx` |
| `kuaishou` | 快手 | `https://api-new.ifphp.com/api/ksjx` |
| `wechat_channel` | 微信视频号 | `https://api-new.ifphp.com/api/wxsph` |
| `doubao` | 豆包 | `https://api-new.ifphp.com/api/doubao` |
| `jimeng` | 即梦/剪映 | `https://api-new.ifphp.com/api/jimeng` |
| `pipigx` | 皮皮搞笑 | `https://api-new.ifphp.com/api/pipigx` |

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
2. 若在配置中开启某平台的「优先使用专属 API」（`platformDedicatedFirst`），则先专属、后主 API。
3. 自定义平台（`custom_` 前缀）只请求其配置的解析 API。

## 配置覆盖 (Configuration Overrides)

| 配置项 | 说明 |
|--------|------|
| `primaryApiUrl` | 覆盖默认主 API 地址 |
| `customApis[].apiUrl` | 按平台覆盖内置平台 API（`platform` 可选值含 `bilibili`/`douyin`/`kuaishou`/`doubao`/`jimeng`/`wechat_channel` 等） |
| `customPlatforms[].apiUrl` | 新增自定义平台及其解析 API |
| `apiKey` / `authHeaderType` / `customHeaderName` | 认证密钥与认证头方式 |