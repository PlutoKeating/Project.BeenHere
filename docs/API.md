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

## 3. 公共读取 `/api/v1`

| 方法与路径 | 说明 |
|---|---|
| `GET /api/v1/meta` | 公开采访记录、人物、话题、年份计数。 |
| `GET /api/v1/records?limit=24` | 公开记录列表；limit 被限制在 1–50。 |
| `GET /api/v1/records/{recordNumber}` | 按 `BH-000001` 读取 public/unlisted 记录与当前版本。 |
| `GET /api/v1/drift?exclude=BH-000001` | 随机返回一条公开记录；最多使用 20 个有效排除编号。 |
| `GET /api/v1/search?q=...` | 搜索编号、标题、摘要、显示名与公开版本快照；最多 50 条。 |
| `GET /api/v1/people/{slug}` | 被采访者资料与公开记录。 |
| `GET /api/v1/topics/{slug}` | 话题资料与公开记录。 |
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

`recordNumber` 可省略；`requesterRole` 为 `participant|reader|representative|other`，`kind` 为 `fact|identity|privacy|consent|supplement|topic|withdrawal`。同一来源每小时最多 5 次。

## 4. 认证 `/api/auth`

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

## 5. 当前账户 `/api/account`

全部要求 active 会话。

| 方法与路径 | 正文/说明 |
|---|---|
| `GET /api/account/me` | 返回 `id,email,displayName,role,status`。 |
| `PATCH /api/account/me` | `{ "displayName": "新用户名" }`，无需再次验证密码。 |
| `PATCH /api/account/password` | `currentPassword`, `newPassword`；成功后旧会话和未用安全动作失效。 |
| `PATCH /api/account/email` | `currentPassword`, `newEmail`；向新邮箱发送确认链接。 |
| `POST /api/account/deletion` | `{}`；向当前邮箱发送删号确认链接。 |

## 6. 采访记录管理

全部要求 active 会话。普通成员只能管理 `record_owners` 中自己的记录；馆长可管理全部。

| 方法与路径 | 说明 |
|---|---|
| `GET /api/account/records` | 当前账户可管理的记录。 |
| `POST /api/account/records` | 创建 private 草稿；当前账户成为 uploader。 |
| `GET /api/account/records/{id}` | 读取可编辑快照和 revision。 |
| `PATCH /api/account/records/{id}` | `{ expectedRevision, draft }`；冲突返回 409。 |
| `DELETE /api/account/records/{id}` | `{ reason }`；软删除并写审计。 |
| `POST /api/account/records/{id}/publish` | `{ changeSummary }`；生成新公开版本。 |
| `POST /api/account/records/{id}/claim` | `{ requestText }`；申请文本 20–2000 字符。 |
| `GET /api/account/claims` | 返回收到与发出的认领申请。 |
| `POST /api/account/claims/{id}/review` | `decision=approved|rejected` 与可选 `note`。 |

`draft` 的规范结构定义在 `worker/index.ts` 与 `worker/types.ts`，核心字段包括 participant、record、story、recordNote、units、topics、source。录入来源只使用 `douyin|social_media|in_person|direct|other`。

## 7. 馆长 `/api/director`

| 方法与路径 | 说明 |
|---|---|
| `GET /api/director/accounts` | 列出未删除账户。 |
| `PATCH /api/director/accounts/{id}/status` | `{ "status": "active" }` 或 `suspended`；不能停用馆长。 |

暂停成员时立即删除其全部会话。当前没有通过 HTTP 修改角色的接口。

## 8. 接口变更规则

- 产品尚未维护兼容层；接口变化直接收敛到一个版本。
- 新增或修改路径时，必须同步 `worker/index.ts`、`src/lib/api.ts`、相关 Zod/type、测试与本文。
- 禁止仅修改前端类型而不修改 Worker 校验，或直接向客户端暴露 D1 行结构。
