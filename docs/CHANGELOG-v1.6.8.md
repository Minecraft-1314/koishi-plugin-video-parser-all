# koishi-plugin-video-parser-all v1.6.8

## 更新日志

### 修复

- **修复重复解析/重复发送问题（核心）**：同一消息在不同触发条件下会被解析两次、发送两次结果。根因已定位并修复，包含三个层面：
  - **发送竞态修复**：`Promise.race(session.send(), timeout)` 在超时后不会取消底层发送，导致消息实际发出。现改用 `pendingSends` Map，同一 `messageId::content` 在 pending 期间复用同一 Promise，从源头杜绝重复发送。
  - **消息幂等修复**：同一 `messageId` 的重复事件现在通过 `processingMessages` Set + `DeduplicationManager` 的 messageId 锁实现幂等保护，首次处理后标记为已处理，重复事件直接跳过。
  - **重复逻辑消除**：`index.ts` 中旧的本地 `fetchApi`/`parseUrl`/`processSingleUrl` 实现已删除，统一走 `src/service/api.ts` 和 `src/service/parser.ts` 模块化实现，消除重复逻辑导致的潜在重复触发风险。