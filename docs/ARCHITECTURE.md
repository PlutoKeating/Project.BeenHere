# 最终产品架构

## 1. 系统边界

Project.BeenHere 是采访记录公共站。唯一生产域名为 `beenhere.arr2018.dpdns.org`。系统不提供开放 Wiki 式匿名编辑，不设置内容复核流程，也不把录入方式绑定到任何平台。

```text
浏览器
  ├─ 公共页面与 /api/v1/* ───────────────┐
  └─ 注册/登录与 HttpOnly 会话            │
       └─ /studio* /director*             │
          /api/account/* /api/director/*  │
                                          ▼
                                Cloudflare Worker
                                  ├─ React 静态资源
                                  ├─ RecordRepository
                                  ├─ AccountModule
                                  ├─ SMTP 邮件发送器
                                  ├─ RecordManagementModule
                                  └─ GovernanceModule
                                          │
                                          ▼
                                    Cloudflare D1
```

浏览器永不直连 D1。Worker 验证站内会话，D1 中的账户角色与记录所有权负责授权。会话令牌只存在于 `Secure; HttpOnly; SameSite=Lax` Cookie，D1 仅保存 HMAC 摘要。密码使用每账户随机盐与 PBKDF2-SHA-256 派生，明文密码和邮件令牌不落库。

## 2. 权限矩阵

| 能力 | 路人 | 成员 | 记录主人 | 馆长 |
|---|---:|---:|---:|---:|
| 阅读所有公开采访记录 | ✓ | ✓ | ✓ | ✓ |
| 提交更正/撤回请求 | ✓ | ✓ | ✓ | ✓ |
| 创建采访记录 |  | ✓ | ✓ | ✓ |
| 修改、公开、软删除记录 |  |  | 自己拥有 | 全部 |
| 提交本人认领申请 |  | ✓ | ✓ | ✓ |
| 审阅记录的认领申请 |  |  | 自己拥有 | 全部 |
| 停用/恢复成员账户 |  |  |  | ✓ |

`record_owners` 是编辑授权的唯一数据源。上传产生 `uploader` 所有权；认领获批产生 `claimed` 所有权。软删除保留记录、版本和审计事件，不再公开。

## 3. 模块与页面

- 公共阅读：`/records`、`/records/:recordNumber`、`/drift`、`/search`、人物/话题/年份聚合页。
- 账户中心：`/studio`，只展示当前成员可管理的采访记录。
- 账户入口：`/auth/login`、`/auth/register`、`/auth/forgot-password` 及邮件确认页面。
- 账户设置：`/account/settings`，修改用户名、邮箱、密码或申请删除账户。
- 独立录入：`/studio/new`。来源类型覆盖抖音、其他社交媒体、线下、直接采访与其他形式；以后 OCR、导入和多媒体录入只扩展这个模块。
- 记录编辑：`/studio/records/:id`，使用修订号做乐观并发控制。
- 认领：`/studio/claim/:recordId` 与 `/studio/claims`。
- 馆长：`/director/accounts`。

## 4. 数据模型

- `accounts`：验证邮箱、密码派生值、显示名、`member|director` 与账户状态。
- `account_sessions`：30 天会话的 HMAC 摘要和过期时间。
- `account_actions`：一次性邮件动作令牌摘要，覆盖注册验证、密码重设、换邮箱与账户删除。
- `auth_rate_limits`：认证敏感操作的 15 分钟频率窗口。
- `people`：被采访者的公开身份呈现。
- `interview_records`：采访记录根实体、稳定编号、公开状态、当前版本、软删除信息。
- `record_owners`：记录与账户的多对多所有权。
- `source_records`：来源类型、平台、外部 ID 与原始链接。
- `record_drafts`：当前可修改快照和修订号。
- `published_editions`：每次公开产生不可变版本及 SHA-256 内容摘要。
- `conversation_units`：提问、回答、图片说明、停顿、注记或段落。
- `claim_requests`：认领申请文本、决定、审阅者与说明。
- `correction_requests`：公开更正、隐私、授权和撤回请求。
- `audit_events`：关键写操作的责任记录。

只有 `public` 进入公共列表、搜索与随机发现；`unlisted` 仅可通过编号读取；`private` 和 `deleted` 不公开。

## 5. 唯一 HTTP 接口

```text
GET  /api/v1/meta
GET  /api/v1/records
GET  /api/v1/records/{recordNumber}
GET  /api/v1/drift
GET  /api/v1/search
GET  /api/v1/people/{slug}
GET  /api/v1/topics/{slug}
GET  /api/v1/years/{year}
POST /api/v1/correction-requests

POST /api/auth/register
POST /api/auth/verify-email
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/confirm-email-change
POST /api/auth/confirm-deletion

GET|PATCH /api/account/me
PATCH /api/account/password
PATCH /api/account/email
POST  /api/account/deletion
GET|POST  /api/account/records
GET|PATCH|DELETE /api/account/records/{id}
POST /api/account/records/{id}/publish
POST /api/account/records/{id}/claim
GET  /api/account/claims
POST /api/account/claims/{id}/review

GET   /api/director/accounts
PATCH /api/director/accounts/{id}/status
```

不提供任何别名、旧路径或兼容接口。

## 6. 账户安全规则

- 邮箱在库内不区分大小写且唯一；未验证账户不能登录。
- 密码长度为 12–128 个字符。改密码需旧密码，完成后撤销全部旧会话并签发新会话。
- 改邮箱需旧密码与新邮箱邮件确认；完成后撤销全部会话。
- 忘记密码接口统一返回相同文案，避免探测账户；完成重设后撤销全部旧会话。
- 删除账户必须点击当前邮箱收到的一次性链接。删除后邮箱、用户名和凭据被匿名化，已发布采访记录及必要审计关系保留。
- 邮件令牌 30 分钟失效且只能使用一次；认证接口按来源 IP 限流；所有写请求必须来自唯一生产域名。
- SMTP 授权码与会话密钥仅存 Cloudflare Worker Secret，不进入 Git、构建产物或浏览器。

## 7. 发布与恢复

GitHub Actions 对每次变更执行类型检查、测试和构建；主分支通过后迁移 D1 并部署 Worker。Cloudflare Worker 的 Git 仓库连接同时保留平台侧构建触发。部署前保存 D1 Time Travel bookmark，生产健康检查必须成功。
