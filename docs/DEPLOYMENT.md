# 部署架构与发布手册

## 1. 当前生产资源

| 资源 | 当前值 | 配置来源 |
|---|---|---|
| 生产域名 | `beenhere.arr2018.dpdns.org` | `apps/web/wrangler.jsonc` custom domain |
| Worker | `project-been-here` | `wrangler.jsonc:name` |
| 入口 | `apps/web/worker/index.ts` | `wrangler.jsonc:main` |
| 静态资源 | Vite 产物 `apps/web/dist/client` → binding `ASSETS` | `wrangler.jsonc:assets` + Cloudflare Vite Plugin |
| D1 | `beenhere-records` → binding `DB` | `wrangler.jsonc:d1_databases` |
| Durable Object | SQLite-backed `PresenceRoom` → binding `PRESENCE` | `wrangler.jsonc:durable_objects` + `exports` |
| OCR 浏览器 Worker | PaddleOCR.js 0.4.2 预构建静态资产 | `prebuild` → `public/vendor/` → Workers Assets |
| SMTP | TLS 465 | 非敏感端点在 `vars`，凭据在 Worker Secrets |
| 可观测性 | Workers Logs 开启，采样率 100% | `wrangler.jsonc:observability` |

`workers_dev=false`、`preview_urls=false`，生产服务只通过唯一 custom domain 暴露。Worker compatibility date 为 `2026-08-25`，启用 `global_fetch_strictly_public`，上传 source maps。D1 的实际 UUID 只维护在 `wrangler.jsonc`，文档不重复，避免漂移。

### 已核验生产快照（2026-09-01）

- Cloudflare deployments 显示当前发布来源为 Wrangler，100% 流量指向最新版本；GitHub Actions 的 `verify` 与 `deploy` 是权威流水线。
- D1 已应用 `0001_initial.sql` 和 `0002_simplify_interview_messages.sql`，无待应用迁移；正式正文表为 `interview_messages`，旧 `conversation_units/topics/record_topics` 已不存在。
- Worker Secrets 名称为 `SESSION_SECRET`、`SMTP_USERNAME`、`SMTP_PASSWORD`、`SUPERADMIN_EMAILS`；只核验名称，不在仓库记录值。
- 线上 `/`、`/api/health`、`/vendor/paddleocr-worker-0.4.2.js` 均已验证；OCR vendor 文件为 11,341,486 字节并使用 immutable cache。

此快照记录核验范围，不固定易变的 deployment/version ID。实时版本应通过 `wrangler deployments list` 与目标 GitHub run 的 `headSha` 查询。

生产 build 同时生成浏览器产物 `dist/client` 和 Worker 产物 `dist/project_been_here`。`vite.config.ts` 当前为客户端和 Worker 构建启用 source map，`wrangler.jsonc` 同时开启 Worker source map 上传；客户端 `.js.map` 属 Workers Assets。Cloudflare Vite Plugin 会生成重定向后的部署配置，且必须保留 `PRESENCE` binding 与 `PresenceRoom` export；Wrangler 部署日志中的 “Using redirected Wrangler configuration” 属正常行为。`dist/` 与 `.wrangler/` 都是可重建、被忽略的产物，不得手工编辑或提交；原始配置仍是 `apps/web/wrangler.jsonc`。

`prebuild` 还会从精确锁定的 npm 依赖复制 11,341,486 字节的官方 PaddleOCR 浏览器 Worker 到 `public/vendor/paddleocr-worker-0.4.2.js`。`deploy` 必须调用完整的 `npm run build`，不能绕过该生命周期。生成目录被 Git 忽略，CI 会从 `package-lock.json` 重建；这只是现有 Worker 的静态资产，不是新的 Cloudflare Worker 项目。两个 PP-OCRv6 tiny 模型（合计 6,318,080 字节）与 ONNX Runtime Web 1.24.3 子模块/WASM（生产核验分别约 16KB/4,732,028 字节）不进入部署包，浏览器按需从固定的 BCE BOS 与 jsDelivr 地址下载。

### 外部运行时服务与不存在的资源

| 服务/来源 | 当前用途 | 数据边界 |
|---|---|---|
| Cloudflare Custom Domain / TLS | 唯一生产入口 | 处理常规连接元数据。 |
| Workers Assets | SPA、source map、OCR vendor Worker | 与 API 同一部署，不是第二个 Worker。 |
| D1 `beenhere-records` | 业务持久化与限流桶 | 浏览器不能直连。 |
| SQLite-backed `PresenceRoom` | 全局 WebSocket 在线人数 | attachment 只含 visitor UUID，不写 D1。 |
| Workers Logs / D1 Time Travel | 运行日志与短期恢复 | CI 发布前保存 7 天 bookmark artifact。 |
| Yeah SMTP TLS 465 | 账户事务邮件 | 接收必要邮箱、正文与一次性链接。 |
| Paddle BCE | PP-OCRv6 tiny 模型下载 | 只收到静态 GET 与常规网络元数据，不收到截图。 |
| jsDelivr | ONNX Runtime 1.24.3 `.mjs` 与 WASM | 只收到静态 GET 与常规网络元数据，不收到截图。 |
| Google Fonts | Inter、JetBrains Mono、Noto Serif SC | 只用于字体 CSS/文件，由页面 CSP 限定。 |

当前没有 R2、业务 KV、Queue、Cron、Vectorize、Workers AI、服务端 OCR、第二个 Worker、独立 staging、Cloudflare Access 或仓库管理的 WAF/Turnstile。D1 内部维护的系统表不等于应用使用 KV。

## 2. 配置源优先级

1. 仓库中的源码、迁移、`wrangler.jsonc` 和 `.github/workflows/ci.yml`。
2. Cloudflare 当前 Worker/D1/Secret 名称与 deployment 结果。
3. GitHub Actions 当前运行与 environment 配置。
4. 本文；若与 1–3 冲突，以实时配置为准并立即修正文档。

不要在 Cloudflare Dashboard 临时修改普通 vars、route 或 binding 后不回写 `wrangler.jsonc`；下一次部署可能覆盖这些漂移。

## 3. 环境变量与 Secrets

### Worker 非敏感 vars（入库）

| 名称 | 用途 |
|---|---|
| `APP_ENV=production` | 开启生产 Origin 与 HSTS 行为。 |
| `SITE_URL` | 邮件链接和同源校验基址。 |
| `SMTP_HOST` / `SMTP_PORT` | SMTP TLS 端点。 |
| `SMTP_FROM_NAME` | 邮件发件人显示名。 |

### Worker Secrets（只存 Cloudflare）

| 名称 | 用途 | 轮换影响 |
|---|---|---|
| `SESSION_SECRET` | 会话令牌 HMAC | 轮换后所有现有会话立即失效。 |
| `SMTP_USERNAME` | SMTP 登录和 envelope sender | 与 SMTP_PASSWORD 同步轮换。 |
| `SMTP_PASSWORD` | SMTP 授权凭据 | 错误会使所有事务邮件失败。 |
| `SUPERADMIN_EMAILS` | 注册时授予馆长角色的邮箱列表 | 只影响后续注册，不改已有账户角色。 |

仅检查名称：

```bash
cd apps/web
npx wrangler secret list
```

设置时交互输入，避免写入 shell history：

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SMTP_USERNAME
npx wrangler secret put SMTP_PASSWORD
npx wrangler secret put SUPERADMIN_EMAILS
```

`wrangler secret put/delete` 会创建并立即部署新的 Worker 版本，因此按生产变更处理。Cloudflare 官方说明见 [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。

### GitHub

| 类型 | 名称 | 用途 |
|---|---|---|
| Repository/Environment Secret | `CLOUDFLARE_API_TOKEN` | CI 执行 D1 与 Worker 部署。 |
| Repository/Environment Variable | `CLOUDFLARE_ACCOUNT_ID` | 指定 Cloudflare account。 |
| Environment | `production` | 部署环境和生产 URL。 |

值不得进入仓库、Actions 日志、issue、截图或文档。

## 4. 权威 CI/CD 链路

当前可验证的权威链路：

```mermaid
flowchart LR
  Push[push main / workflow_dispatch / repository_dispatch]
  Verify[verify job]
  Backup[D1 current bookmark artifact]
  Migrate[apply remote migrations]
  Deploy[wrangler deploy]
  Health[GET /api/health]

  Push --> Verify
  Verify --> Backup --> Migrate --> Deploy --> Health
```

触发条件：

- push 到 `main`：验证并部署生产。
- pull request 到 `main`：只验证，不部署。
- `workflow_dispatch`：人工触发验证与部署。
- `repository_dispatch` 类型 `content-published`：外部内容流程可触发部署。

`verify` job：

1. 检出代码，Node.js 24，`npm ci`。
2. 检查根目录只保留 `README.md` 与 `AGENTS.md` 两份 Markdown。
3. 执行 `npm run check`：typecheck、Vitest、生产 build。

`deploy` job：

1. 再次 `npm ci` 与 build。
2. 获取 D1 当前 Time Travel bookmark，上传为保留 7 天的 Actions artifact。
3. `wrangler d1 migrations apply beenhere-records --remote`。
4. `wrangler deploy`。
5. 对生产 `/api/health` 重试验证。

部署使用 `wrangler-action@v4` 且显式固定 Wrangler 4.127.1；前端/Worker 依赖的当前解析版本以 `package-lock.json` 为准。Actions 使用 Node.js 24，仓库最低支持 Node.js 22.13。

Wrangler 部署时按 `exports` 声明创建或维护 Durable Object namespace；它与 D1 migration 是两套独立生命周期。新增、重命名或删除 Durable Object class 必须审查生产 binding 和 Worker 回滚兼容性。

同一 ref 使用 concurrency 组，新提交会取消旧的在途运行。

### Cloudflare Workers Builds 状态

2026-09-01 的可验证证据中，最新提交只有 GitHub Actions 的 `verify` 与 `deploy` check，实际 deployment source 为 Wrangler。当前运维凭据没有读取 Workers Builds trigger 的权限，因此平台侧 Git trigger 状态为 `unknown`，不能作为生产发布依赖，也不应与 GitHub Actions 同时承担权威部署。若以后启用，必须记录 trigger、branch、root directory、build/deploy commands、watch paths，并避免一条提交重复部署。官方机制见 [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)。

## 5. 标准发布

```bash
git status --short
npm run check
git diff --check
git add <明确文件>
git commit -m "<清晰意图>"
git push origin main
gh run list --workflow "CI and deploy" --branch main --limit 1
gh run watch <run-id> --exit-status
curl --fail https://beenhere.arr2018.dpdns.org/api/health
```

完成条件：目标提交在 `origin/main`；verify 与 deploy 都 success；生产 health 返回 `ok`。页面可见不等于邮件、登录或 D1 写链路通过；按变更风险补充业务烟测。

## 6. 数据库迁移

1. 新增递增迁移文件，禁止改写已发布迁移。
2. 本地应用并运行全量门禁。
3. 评估旧 Worker 是否能读取新 schema，以及新 Worker 是否能读取旧 schema。
4. 对破坏性变更采用 expand → deploy → contract 的多次发布，不与代码回滚形成不兼容。
5. CI 在部署代码前保存 bookmark 并应用迁移。

迁移列表：

```bash
cd apps/web
npx wrangler d1 migrations list beenhere-records --remote
```

### 标题数据回填

标题算法升级不修改 schema，也不改写 `published_editions.snapshot`。发布新 Worker 后，先只读预览，再在确认结果和恢复点后显式应用：

```bash
# 只读取规范快照并显示变化数量；非公开标题不会输出
npm run titles:backfill:remote --workspace @beenhere/web

# 0003 已部署后：获取并打印写入前 bookmark，逐条 CAS 更新根标题；数据库触发器原子写 audit_events
npm run titles:backfill:remote --workspace @beenhere/web -- --apply
```

有当前公开版本的记录以 `current_edition_id` 对应快照为准；尚未公开的记录以当前草稿为准。应用前脚本会确认 0003 标题审计触发器存在；每个 UPDATE 与其审计由 SQLite 原子提交。脚本完成后会重新读取全部记录并用同一 `deriveInterviewTitle` 验证没有旧标题。发生异常时保留脚本输出的 bookmark，按运维手册评估 Time Travel；不得直接改写不可变公开版本。

## 7. 首次或重建环境

以下步骤只用于明确授权的新环境或灾难重建，不用于日常发布：

1. `npx wrangler d1 create beenhere-records --location apac`。
2. 把返回的 database ID 写入 `apps/web/wrangler.jsonc`。
3. `npm run db:migrate:remote`。
4. 交互写入四个 Worker Secrets。
5. 配置 GitHub secret、variable 与 `production` environment。
6. `npm run deploy` 创建 Worker、Assets、D1 binding 与 custom domain。
7. 验证 health、公共页面、注册邮件和账户登录。

删除/重建 D1 会永久丢失当前数据库，必须先确认数据、恢复点和授权。

## 8. 紧急人工部署

正常情况只走 GitHub Actions。CI 平台故障且已获授权时：

```bash
npm ci
npm run check
cd apps/web
npx wrangler d1 time-travel info beenhere-records
npx wrangler d1 migrations apply beenhere-records --remote
cd ../..
npm run deploy
curl --fail https://beenhere.arr2018.dpdns.org/api/health
```

人工部署不会自动创建 GitHub artifact；必须把 bookmark、提交 SHA、操作者、时间和验证结果写入事故记录。

## 9. 发布后验证

- `GET /api/health` 为 200。
- `/`、`/auth/login`、`/studio` 返回本站 SPA，不出现第三方认证跳转。
- 未登录 `GET /api/account/me` 返回 401。
- 恶意 Origin 的写请求返回 403。
- 涉及账户邮件时，用受控测试账户验证 SMTP 接受、收件和一次性链接；验收后清理测试数据。
- 涉及 schema 时核对迁移列表和关键只读计数。
- 涉及在线状态时，建立两个 WebSocket 并分别发送不同 visitor UUID 的 hello 帧，验证第一个收到 1、两个连接都收到 2，并确认恶意 Origin 握手返回 403。
- 涉及 OCR 时，确认 `/vendor/paddleocr-worker-0.4.2.js` 为 200 且带长期缓存；使用受控聊天截图完成一次浏览器识别，确认 CSP 仅放行固定模型/WASM 域名，Network 中没有截图上传请求，最后检查导入草稿 JSON 不含坐标、置信度或图片信息。
- 涉及 OCR/CSP 时，额外确认页面响应只有严格页面 CSP，vendor 响应只有 detach 后的专用 CSP；vendor 的 `script-src` 仅额外允许 jsDelivr 与运行时所需 eval，`connect-src` 仅允许 jsDelivr 和 Paddle BCE。重复 CSP 会取交集并可能在模型加载前阻断 OCR。

回滚与恢复步骤见 [OPERATIONS.md](OPERATIONS.md)。
