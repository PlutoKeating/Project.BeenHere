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

src/lib/presence.ts ── WebSocket ── worker/presence.ts ── PresenceRoom

OcrImportPanel ── src/lib/ocr.ts ── browser Web Worker ── PaddleOCR.js
               └─ src/lib/ocr-conversation.ts ── RecordDraft.messages

AutomatedInterviewPage ── src/lib/automated-interview.ts ── RecordDraft
                       └─ router memory state ── IngestionPage / RecordForm
```

浏览器端不导入 Worker 模块、不读取 D1 字段，也不接触 SMTP 或会话密钥。业务授权必须在 Worker 内再次判断，不能依赖前端隐藏按钮。

## 浏览器端

| 路径 | 职责 |
|---|---|
| `src/App.tsx` | 唯一路由表；区分公共、认证和受保护页面。 |
| `src/components/AppShell.tsx` | 顶部导航、移动底部 Tab、主题、账户与公共政策入口。 |
| `src/components/RequireAccount.tsx` | 调用 `/api/account/me`；401 时跳转登录并保留返回路径。 |
| `src/components/RecordForm.tsx` | 所有录入方式汇合到统一 `RecordDraft`；承接 OCR/纯文本导入、角色校对和最少公开信息，并锁定自动采访来源事实。 |
| `src/pages/AutomatedInterviewPage.tsx` | 自动化身份与知情说明、整页单滚动区采访交互、跳过/结束、安全停止和人工整理入口。 |
| `src/pages/{About,Privacy,Terms}Page.tsx` | 公共身份、数据处理与服务条款；内容必须与当前代码和部署一致。 |
| `src/lib/automated-interview.ts` | 无基础设施依赖的固定提纲、关键词 rank/分解/重组、状态迁移、安全分支与 `RecordDraft` 转换。 |
| `src/components/OcrImportPanel.tsx` | 页面级图片粘贴、选择、拖放、预览、去重、识别进度、取消、资源释放和错误恢复。 |
| `src/lib/ocr.ts` | 图片类型、数量、体积与解码像素限制，官方 OCR Worker 协议、模型初始化和逐图识别。 |
| `src/lib/ocr-conversation.ts` | 坐标到角色的纯函数模块；合并多行、过滤居中提示、跨图去重和 100 条上限。 |
| `src/lib/api.ts` | 唯一 HTTP 客户端；统一 JSON、同源凭据与错误转换。 |
| `src/lib/presence.ts` | 实时连接适配器；本地访客标识、消息校验、断线清值和退避重连。 |
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
| `worker/domain.ts` | 无基础设施依赖的领域格式、采访标题 NLP 派生与规范化函数。 |
| `worker/presence.ts` | 同源 WebSocket 入口与全局 Durable Object；访客去重和人数广播。 |

## 持久化

`migrations/*.sql` 是 D1 schema 的唯一来源。当前 binding 名为 `DB`，数据库名为 `beenhere-records`。`record_drafts.snapshot` 与 `published_editions.snapshot` 保存完整 `RecordDraft` JSON；公开版本不可变，当前版本通过 `interview_records.current_edition_id` 指向。

生产已应用 `0001_initial.sql` 与 `0002_simplify_interview_messages.sql`。当前正文表只有 `interview_messages`；`conversation_units`、`topics`、`record_topics` 已由 0002 删除，不得继续作为当前接口或扩展点。

实时状态不进入 D1。`PRESENCE` binding 始终指向一个名为 `global` 的 SQLite-backed `PresenceRoom`；WebSocket attachment 只保存随机 visitor UUID，以便 Durable Object 休眠后恢复去重计数。

## 扩展规则

- 新公开查询进入 `RecordRepository`，不绕过 visibility 条件。
- 新写操作进入 `RecordManagementModule`，必须先检查记录主人或馆长权限并写审计事件。
- 新录入方式转换为同一个 `RecordDraft`，不新增兼容版采访记录定义。
- 标题只能由 `worker/domain.ts` 根据全部 participant 消息派生；沿用关键词 rank、语句 decomposition 与标题 reassembly，不把 interviewer 开场白当标题，不在浏览器和维护脚本复制另一套算法。
- 自动采访规则必须保持机器身份透明、可跳过/结束、普通话题最多一次追问；敏感分支不得被表现层绕过，进行中内容不得在未新增明确同意机制前持久化。
- `automated_interview` 草稿创建时当前账户必须写为 `claimed`；更新必须在 Worker 中锁定录入标记、采访时间和采访者消息，不能只依赖前端 disabled/readOnly。
- OCR 坐标、置信度、截图文件和预览 URL 都是浏览器临时状态；提交前必须剥离，只保留 `speakerRole` 与 `body`。
- `public/_headers` 是普通 Assets 响应头的事实源；OCR vendor 路径先 detach 全局 CSP，再应用只允许固定运行时来源的专用 CSP。修改 OCR 资源地址时必须同步源码、`_headers`、安全文档和生产烟测。
- 新认证动作复用 `account_actions` 的一次性令牌机制，不把令牌明文入库。
- 新 HTTP 路径同时更新 `worker/index.ts`、`src/lib/api.ts`、根部 `docs/API.md` 和测试。
- 新实时消息类型集中在 `worker/presence.ts` 与 `src/lib/presence.ts` 的窄接口内；账户身份、匹配和采访消息不得把 visitor UUID 当作授权凭据。
