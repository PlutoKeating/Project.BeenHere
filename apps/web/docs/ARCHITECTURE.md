# Web 模块边界

## 依赖方向

```text
React pages/components
        │
        ▼
src/lib/api.ts ── same-origin HTTP ── worker/index.ts
                                           │
             ┌─────────────────────────────┼──────────────────────────┐
             ▼                             ▼                          ▼
       accounts.ts              record-management.ts       record-repository.ts
             │                             │                          │
             ├── auth-crypto.ts            └──────────┬───────────────┘
             ├── smtp.ts                              ▼
             └────────────────────────────────────── D1
```

浏览器端不导入 Worker 模块、不读取 D1 字段，也不接触 SMTP 或会话密钥。业务授权必须在 Worker 内再次判断，不能依赖前端隐藏按钮。

## 浏览器端

| 路径 | 职责 |
|---|---|
| `src/App.tsx` | 唯一路由表；区分公共、认证和受保护页面。 |
| `src/components/AppShell.tsx` | 顶部导航、移动底部 Tab、主题与账户入口。 |
| `src/components/RequireAccount.tsx` | 调用 `/api/account/me`；401 时跳转登录并保留返回路径。 |
| `src/components/RecordForm.tsx` | 当前手工录入适配器；未来录入方式在该边界扩展。 |
| `src/lib/api.ts` | 唯一 HTTP 客户端；统一 JSON、同源凭据与错误转换。 |
| `src/styles/tokens.css` | primitive → semantic → component 三层 Token。 |

## Worker 端

| 模块 | 职责 |
|---|---|
| `worker/index.ts` | 路由、Zod 输入验证、公开/账户/馆长接口分组。 |
| `worker/http.ts` | JSON 错误协议、安全响应头、Cookie、同源写请求校验。 |
| `worker/accounts.ts` | 注册、登录、一次性邮件动作、会话、账户状态与馆长授权。 |
| `worker/auth-crypto.ts` | PBKDF2 密码派生、随机令牌、SHA-256/HMAC 摘要。 |
| `worker/smtp.ts` | 通过 `cloudflare:sockets` 连接 SMTP TLS 465 并发送多部分邮件。 |
| `worker/record-repository.ts` | 只读公开查询；只返回 `public` 或明确的 `unlisted` 记录。 |
| `worker/record-management.ts` | 所有权、修订、公开版本、软删除、认领和审计。 |
| `worker/governance.ts` | 公开更正/撤回请求和小时级限流。 |
| `worker/domain.ts` | 无基础设施依赖的领域格式与规范化函数。 |

## 持久化

`migrations/*.sql` 是 D1 schema 的唯一来源。当前 binding 名为 `DB`，数据库名为 `beenhere-records`。`record_drafts.snapshot` 与 `published_editions.snapshot` 保存完整 `RecordDraft` JSON；公开版本不可变，当前版本通过 `interview_records.current_edition_id` 指向。

## 扩展规则

- 新公开查询进入 `RecordRepository`，不绕过 visibility 条件。
- 新写操作进入 `RecordManagementModule`，必须先检查记录主人或馆长权限并写审计事件。
- 新录入方式转换为同一个 `RecordDraft`，不新增兼容版采访记录定义。
- 新认证动作复用 `account_actions` 的一次性令牌机制，不把令牌明文入库。
- 新 HTTP 路径同时更新 `worker/index.ts`、`src/lib/api.ts`、根部 `docs/API.md` 和测试。
