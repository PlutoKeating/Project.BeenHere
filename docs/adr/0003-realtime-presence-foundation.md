# ADR 0003：以 Durable Object 作为实时在线基座

- 状态：Accepted
- 日期：2026-09-01

## 背景

页面需要在至少两位访客同时在线时实时显示人数，并为后续随机匹配与实时采访保留可扩展连接基座。现有运行时是单一 Cloudflare Worker、Workers Assets 与 D1，没有常驻服务器。

## 决策

新增一个 SQLite-backed `PresenceRoom` Durable Object。浏览器为当前浏览器生成并在 localStorage 保存随机 UUID，通过同源 `/api/presence` WebSocket 连接名为 `global` 的对象，再以首条 `hello` 消息发送 UUID。对象校验后把 UUID 放在连接 attachment 中，使用 WebSocket Hibernation API 按不同 UUID 计数，并向全部连接广播 `{ "type": "presence", "online": number }`。

界面只在人数不少于 2 时展示。断线后立即移除旧值并退避重连。同一浏览器多个标签页使用同一 UUID，因此只计为一位。

## 理由

- D1 心跳需要持续写入、定期清理并带来秒级延迟，不适合实时连接状态。
- 普通 Worker 内存不跨实例且会被回收，不能作为在线人数事实源。
- Durable Object 为单对象内连接提供顺序一致的协调；Hibernation 在空闲时保留连接而不持续占用执行时长。
- 连接接口可以继续承接已认证账户元数据、匹配状态与采访房间分配，不需要把在线统计重新迁移到另一种传输协议。

## 安全与隐私

- WebSocket GET 握手额外校验精确 Origin；首条 hello 的 visitorId 必须是 UUID，重复或无效身份帧以 1008 关闭。
- visitor UUID 不是账户 ID、Cookie 或权限凭据，不进入 URL、D1 或应用日志，不用于跨浏览器识别。
- 广播只包含聚合人数，不包含在线名单、IP、路径或账户资料。

## 后果与边界

- Wrangler 配置新增 `PRESENCE` binding 和声明式 SQLite Durable Object export；不需要 D1 migration。
- 当前使用一个全局对象，适合产品早期规模。Cloudflare 当前单对象 WebSocket 上限为 32,768；接近容量或需要地域/匹配分区时，应引入分片房间和独立聚合层。
- 当前只实现人数。匹配意愿、账户认证、双盲分配、实时采访消息、断线恢复与内容落库必须作为后续独立设计，不得从“在线”状态推断。
