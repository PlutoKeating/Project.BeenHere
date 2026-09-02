# HTTP API

生产基址：`https://beenhere.arr2018.dpdns.org`。所有接口同源提供，不承诺跨域访问或兼容旧路径。

## 1. 通用协议

- JSON 请求必须使用 `Content-Type: application/json`。
- 写请求的 `Origin` 必须等于生产基址；本地 development 只额外接受 localhost/127.0.0.1。
- 成功响应：`{ "data": ... }`，健康检查除外。
- 错误响应：`{ "error": { "code": "...", "message": "..." } }`。
- 账户接口通过 `bh_session` Cookie 认证；浏览器不能读取该 HttpOnly Cookie。

常见状态码：400 无效/过期令牌，401 未登录或密码错误，403 权限不足，404 资源不存在，409 状态/修订冲突，415 非 JSON，422 字段校验失败，429 频率限制，500 未处理故障。

## 2. 健康检查

| 方法与路径 | 响应 | 认证 |
|---|---|---|
| `GET /api/health` | `{ "status": "ok", "service": "project-been-here" }` | 无 |

只证明 Worker 路由可响应；不证明 SMTP、登录邮件或全部 D1 写链路正常。

## 3. 实时在线

| 方法与路径 | 说明 | 认证 |
|---|---|---|
| `GET /api/presence` | 升级为同源 WebSocket，订阅全站在线人数。 | 无 |

握手必须包含 `Upgrade: websocket` 和精确等于 `SITE_URL` 的 `Origin`。普通 HTTP 请求返回 426；外站 Origin 返回 403。连接打开后，客户端必须先发送浏览器生成的 UUID；无效或重复 hello 会以 WebSocket code 1008 关闭连接：

```json
{ "type": "hello", "visitorId": "018f2f29-7e41-7b5e-8fa8-3b2f0d9cb4aa" }
```

身份帧通过后服务端广播：

```json
{ "type": "presence", "online": 2 }
```

人数按不同 visitor UUID 去重。visitor 只用于当前浏览器在线去重，不是账户身份或授权凭据；服务端不公开在线名单。客户端断线时不得继续展示最后一次人数。

## 4. 公共读取 `/api/v1`

| 方法与路径 | 说明 |
|---|---|
| `GET /api/v1/meta` | 公开采访记录、人物和年份计数。 |
| `GET /api/v1/records?limit=24` | 公开记录列表；limit 被限制在 1–50。 |
| `GET /api/v1/records/{recordNumber}` | 按 `BH-000001` 读取 public/unlisted 记录与当前版本。 |
| `GET /api/v1/drift?exclude=BH-000001` | 随机返回一条公开记录；最多使用 20 个有效排除编号。 |
| `GET /api/v1/search?q=...` | 搜索编号、标题、摘要、显示名与公开版本快照；查询截取前 100 字符，最多 50 条。 |
| `GET /api/v1/people/{slug}` | 被采访者资料与公开记录。 |
| `GET /api/v1/years/{year}` | 指定四位年份的公开记录。 |
| `POST /api/v1/correction-requests` | 提交更正、隐私、授权、补充或撤回请求。 |

更正请求正文：

```json
{
  "recordNumber": "BH-000001",
  "requesterContact": "联系信息",
  "requesterRole": "participant",
  "kind": "fact",
  "description": "至少十个字符的说明"
}
```

`recordNumber` 可省略；`requesterContact` 为 3–200 字符，`description` 为 10–4000 字符；`requesterRole` 为 `participant|reader|representative|other`，`kind` 为 `fact|identity|privacy|consent|supplement|withdrawal`。同一来源每小时最多 5 次。

## 5. 认证 `/api/auth`

| 方法与路径 | 正文 | 成功结果 |
|---|---|---|
| `POST /api/auth/register` | `email`, `displayName`, `password` | 202，向邮箱发送 30 分钟验证链接。 |
| `POST /api/auth/verify-email` | `token` | 激活账户并签发会话。 |
| `POST /api/auth/login` | `email`, `password` | 返回账户并签发会话。 |
| `POST /api/auth/logout` | `{}` | 删除当前会话并清 Cookie。 |
| `POST /api/auth/forgot-password` | `email` | 始终返回 202 通用文案；存在 active 账户时发送邮件。 |
| `POST /api/auth/reset-password` | `token`, `password` | 更新密码、撤销旧会话并签发新会话。 |
| `POST /api/auth/confirm-email-change` | `token` | 更新邮箱、撤销所有会话并清 Cookie。 |
| `POST /api/auth/confirm-deletion` | `token` | 匿名化账户、撤销会话与凭据并清 Cookie。 |

注册用户名 2–40 字符；邮箱最长 254 字符；新密码 12–128 字符；一次性 token 只接受 40–200 字符。

## 6. 当前账户 `/api/account`

全部要求 active 会话。

| 方法与路径 | 正文/说明 |
|---|---|
| `GET /api/account/me` | 返回 `id,email,displayName,role,status`。 |
| `PATCH /api/account/me` | `{ "displayName": "新用户名" }`，无需再次验证密码。 |
| `PATCH /api/account/password` | `currentPassword`, `newPassword`；成功后旧会话和未用安全动作失效。 |
| `PATCH /api/account/email` | `currentPassword`, `newEmail`；向新邮箱发送确认链接。 |
| `POST /api/account/deletion` | `{}`；向当前邮箱发送删号确认链接。 |

## 7. 采访记录管理

全部要求 active 会话。普通成员只能管理 `record_owners` 中自己的记录；馆长可管理全部。

聊天截图 OCR 完全在浏览器中执行，不新增上传接口。`POST /api/account/records` 与草稿更新只接收下面的规范化纯文本 `draft`；截图、OCR 坐标和置信度不得进入请求。

| 方法与路径 | 说明 |
|---|---|
| `GET /api/account/records` | 当前账户可管理的记录。 |
| `POST /api/account/records` | 创建 private 草稿；普通录入成为 uploader，自动采访成为 claimed 本人记录主人。 |
| `GET /api/account/records/{id}` | 读取可编辑快照和 revision。 |
| `PATCH /api/account/records/{id}` | `{ expectedRevision, draft }`；冲突返回 409。 |
| `DELETE /api/account/records/{id}` | `{ reason }`；软删除并写审计。 |
| `POST /api/account/records/{id}/publish` | `{ changeSummary }`；生成新公开版本。 |
| `POST /api/account/records/{id}/claim` | `{ requestText }`；申请文本 20–2000 字符。 |
| `GET /api/account/claims` | 返回收到与发出的认领申请。 |
| `POST /api/account/claims/{id}/review` | `decision=approved|rejected` 与可选 `note`。 |

删除理由为 3–500 字符；公开变更说明为 2–500 字符；认领审阅说明最多 1000 字符。创建认领申请与更正申请成功返回 201；创建采访记录成功也返回 201。

`draft` 的规范结构定义在 `worker/index.ts` 与 `worker/types.ts`：

```json
{
  "ingestionMethod": "automated_interview",
  "participant": { "displayName": "小林", "identityMode": "pseudonym" },
  "conductedAt": "2026-09-01T00:00:00.000Z",
  "messages": [
    { "speakerRole": "interviewer", "body": "你最近在想什么？" },
    { "speakerRole": "participant", "body": "想去一个没有去过的地方。" }
  ],
  "source": { "sourceType": "douyin", "platformName": "抖音", "canonicalUrl": "https://example.com/source" }
}
```

`ingestionMethod` 仅允许可选值 `automated_interview`；普通 OCR/纯文本录入省略该字段。自动采访创建时当前账户会以 `claimed` 而非 `uploader` 成为记录主人；后续更新不得移除该标记、修改 `conductedAt`，或修改、删除、新增采访者消息，Worker 会比较上一版 D1 快照并返回 `400 automated_interview_immutable`。被采访者自己的消息仍可修改或删除。

消息数组限制为 2–100 条，单条正文去除首尾空白后为 1–8000 字符，只允许纯文本和 `interviewer|participant` 两种角色，且双方至少各有一条。被采访者显示名为 1–80 字符，平台名最多 80 字符，`conductedAt` 必须是带时区偏移的 ISO datetime，`canonicalUrl` 只接受 HTTP(S) URL。标题、摘要和人物 slug 由 Worker 派生。标题让每一条 `participant` 消息贡献候选语句，以跨消息中英文关键词权重和主题 cue rank 选择代表性语句、去除口语前缀并截为最多 48 个 Unicode 字符；没有足够内容时回退为“与{显示名}的一次采访”。摘要仍取第一条被采访者消息的前 300 字符。已公开记录保存草稿时不提前改变公开标题，只有发布新版本时才更新。录入来源只使用 `douyin|social_media|in_person|direct|other`。

浏览器 OCR 的 5 张、15 MB、4000 万像素限制是前端临时输入约束，不是 API 字段。服务端从不接收截图，也不信任前端置信度或坐标；无论消息来自 OCR、纯文本还是未来实时采访，都必须通过同一个 `draftSchema`。

## 8. 馆长 `/api/director`

| 方法与路径 | 说明 |
|---|---|
| `GET /api/director/accounts` | 列出未删除账户。 |
| `PATCH /api/director/accounts/{id}/status` | `{ "status": "active" }` 或 `suspended`；不能停用馆长。 |

暂停成员时立即删除其全部会话。当前没有通过 HTTP 修改角色的接口。

## 9. 接口变更规则

- 产品尚未维护兼容层；接口变化直接收敛到一个版本。
- 新增或修改路径时，必须同步 `worker/index.ts`、`src/lib/api.ts`、相关 Zod/type、测试与本文。
- WebSocket 路径同步维护 `worker/presence.ts`、`src/lib/presence.ts`、消息校验、Origin 测试与本文，不经 `src/lib/api.ts` 的 JSON 请求封装。
- 禁止仅修改前端类型而不修改 Worker 校验，或直接向客户端暴露 D1 行结构。
