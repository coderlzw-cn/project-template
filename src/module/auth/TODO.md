# 待优化：Refresh Token 重用检测（Reuse Detection）

> 记录时间：2026-08-01。研究清楚后再实施。

## 现状

当前刷新流程采用"令牌轮换"（rotation）：每次调用 `/auth/refresh`，服务端生成新的 refresh token，并把 `auth_session.refresh_token_hash` 更新为新令牌的哈希，旧令牌哈希从此在数据库中查不到。

因此拿**已用过的旧 refresh token** 再来刷新时，`findUnique({ where: { refreshTokenHash } })` 查不到记录，直接返回 401「刷新令牌无效」。请求虽然被拒绝了，但仅此而已。

## 问题

旧令牌被重放只有两种可能：

1. **客户端 bug**：网络重试、多标签页并发刷新等，误用了旧令牌；
2. **令牌泄露**：攻击者窃取了 refresh token。

关键是第 2 种场景的时间线：

- 攻击者偷到用户的 refresh token（此时还未被使用）；
- 攻击者先刷新，拿到**新的**合法令牌对，会话继续有效——服务端完全无感知；
- 用户自己的客户端随后拿（已被轮换掉的）旧令牌刷新，收到 401 被登出。

结果：**攻击者持有有效会话，真正的用户反而被踢下线**，系统只记录了一次普通 401，没有任何告警或阻断。

## 企业级做法

检测到"旧令牌重用"时按安全事件处理：

1. 会话表保留上一代令牌的哈希（如加一列 `previous_token_hash`），或单独记录已消费的令牌；
2. 刷新时若 `refresh_token_hash` 未命中，再查 `previous_token_hash`；
3. 若命中 previous——说明该令牌已被轮换却又被使用，**无法区分是用户还是攻击者**，最安全的做法：
   - 立即撤销整个会话（甚至该用户的全部会话）；
   - 强制双方重新登录；
   - 记录告警日志。

这样即使令牌泄露，攻击者最多使用一次；一旦新旧令牌出现"竞争"，会话立刻作废，把损失窗口压到最小。参考 OAuth 2.0 Security BCP（RFC 9700）对 refresh token rotation 的建议。

## 实施要点（预估改动）

- `prisma/schema.prisma`：`AuthSession` 加 `previous_token_hash` 列 + 一次迁移（注意同步维护 MySQL COMMENT）；
- `auth.service.ts` 的 `refresh` 方法：
  - 轮换时把旧哈希写入 `previous_token_hash`；
  - 未命中 `refreshTokenHash` 时回查 `previous_token_hash`，命中则撤销会话并告警；
- 可选：i18n 增加对应错误消息、告警日志接入现有 Logger。
