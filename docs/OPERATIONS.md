# 生产运维手册

适用对象：馆长、仓库维护者和 Cloudflare 运维者。命令默认从仓库根目录执行；Cloudflare 命令标明时进入 `apps/web`。

## 1. 服务目标与变更原则

- 唯一生产入口：`https://beenhere.arr2018.dpdns.org`。
- 首要保护：账户凭据、采访记录、公开版本和恢复能力。
- 先只读诊断，再决定写操作；任何 restore、DELETE、角色变更、Secret 轮换和生产回滚都要记录原因与恢复点。
- 不在终端输出、日志、截图或 issue 中粘贴 Secret 值、会话 Cookie、邮件 token 或完整用户邮箱列表。

## 2. 运维权限

| 能力 | 所需权限 |
|---|---|
| 查看 GitHub Actions | GitHub 仓库 read/actions |
| 推送 main / 触发发布 | GitHub write 与 production environment 权限 |
| Worker 日志/部署 | Cloudflare Workers read/write 或 tail 权限 |
| D1 查询/恢复 | Cloudflare D1 read/write |
| Secrets 轮换 | Cloudflare Workers Secrets write |
| 账户停用 | 站内馆长账户 |

凭据失效时不要反复执行写命令。先运行 `npx wrangler whoami`；API code 10000 通常需要重新登录或更换具备目标资源权限的 token。

## 3. 日常健康检查

```bash
curl --fail --show-error \
  https://beenhere.arr2018.dpdns.org/api/health

curl --fail --head \
  https://beenhere.arr2018.dpdns.org/

gh run list --workflow "CI and deploy" --branch main --limit 3
```

预期：health 为 200 和 `{"status":"ok","service":"project-been-here"}`；首页为 200；最新生产 run 的 verify/deploy 均成功。

健康接口只验证 Worker 基本路由，不覆盖 SMTP、D1 写入、登录或邮件链接。相关发布必须执行对应业务烟测。

实时在线需要独立 WebSocket 烟测。浏览器开发者工具中 `/api/presence` 应保持 101；两个不同浏览器访客连接后都应收到 `{"type":"presence","online":2}`。同一浏览器多标签页使用相同 visitor UUID，只增加连接数，不增加在线人数。

## 4. 实时日志

```bash
cd apps/web
npx wrangler tail project-been-here --format pretty
```

Workers Logs 已在 `wrangler.jsonc` 开启，可在 Cloudflare Dashboard → Worker → Logs 查询 invocation、异常与 `console.error`。官方说明见 [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)。

日志排查只记录 HTTP 状态、错误 code、SMTP reply code、deployment/version、时间和请求路径。不得增加打印密码、token、Cookie、完整请求正文或 SMTP AUTH 内容的调试日志。

## 5. 事故分级与处理顺序

| 等级 | 示例 | 首要动作 |
|---|---|---|
| P0 | 全站不可用、数据大范围错误删除、凭据泄露 | 冻结发布，保存证据与 bookmark，决定回滚/恢复。 |
| P1 | 登录/邮件/写入全局失败，公共阅读仍可用 | 停止相关变更，查日志、Secrets 名称与 D1。 |
| P2 | 单页面、单账户或交互异常 | 建立可复现测试，修复后走标准发布。 |

统一顺序：

1. 记录北京时间/UTC、影响路径、用户症状、最近成功版本与最近变更。
2. health、首页、相关 API 各测一次，区分静态、Worker、D1、SMTP。
3. 查看 GitHub run 与 Worker deployments，不盲目重放失败命令。
4. 打开实时日志，以一次受控请求复现。
5. 若涉及数据写入，先取得当前 D1 bookmark。
6. 选择修复、Worker 回滚或 D1 Time Travel；分别验证。

## 6. 常见故障

### 全站或 API 5xx

```bash
curl -i https://beenhere.arr2018.dpdns.org/api/health
cd apps/web
npx wrangler deployments list --name project-been-here --json
npx wrangler tail project-been-here --format pretty
```

- health 失败：优先检查当前 deployment、route/custom domain 和 Worker 启动异常。
- 页面正常但 API 失败：检查 Worker 日志、D1 binding、迁移和 Secrets 名称。
- 只有静态资源失败：检查 Assets directory、构建产物和 CSP，而不是 D1。

### 注册/重设/换邮箱/删号邮件失败

1. `npx wrangler secret list` 只核对 `SMTP_USERNAME`、`SMTP_PASSWORD` 是否存在。
2. 核对 `SMTP_HOST`、`SMTP_PORT`、`SMTP_FROM_NAME` 的入库配置。
3. 用受控邮箱执行一次操作并观察 Worker 日志；`SMTP 334/235/250` 等 reply code 用于定位认证、收件人或 DATA 阶段。
4. 在服务邮箱检查发件箱/退信，在目标邮箱检查垃圾邮件。
5. 忘记密码接口即使投递失败也返回通用 202；必须以日志和收件结果判断。

SMTP Password 失效时先在邮箱提供商生成新授权凭据，再交互执行 `npx wrangler secret put SMTP_PASSWORD`，最后真实发送一封验证邮件。

### 登录失败

- 401 `invalid_credentials`：邮箱或密码不匹配。
- 403 `email_not_verified`：账户仍为 pending，需要重新注册以发送新的验证链接。
- 403 `account_unavailable`：账户 suspended/deleted。
- 401 `account_auth_required`：Cookie 缺失、会话过期、SESSION_SECRET 已轮换或账户被停用。

优先从馆长页面查询账户。必须查 D1 时，只选择 `status, role, email_verified_at, created_at, last_seen_at`，不要读取 `password_credential`、会话或 token 摘要；也不要把真实邮箱写进共享终端记录。Wrangler 4.127.1 的 `d1 execute` 没有绑定参数选项，含个人邮箱的临时 SQL 应在 Cloudflare 受控控制台执行并避免保留截图。

### 429 频率限制

认证桶为 15 分钟，更正桶为 1 小时。先确认是正常防护还是滥用；不要直接删限流表来掩盖攻击。误触发可等待窗口结束。持续攻击应在 Cloudflare WAF/Rate Limiting 层增加规则；当前仓库未配置 WAF 规则。

### 在线人数不显示或不下降

1. 先确认是否确有至少两个不同浏览器 visitor UUID；单人和同浏览器多标签页不显示属于预期。
2. 在浏览器检查 `/api/presence` 是否为 101；400 查 visitor UUID，403 查 Origin/SITE_URL，426 查 Upgrade 是否被代理剥离。
3. 查看最新 Worker deployment 是否包含 `PRESENCE` binding 和 `PresenceRoom` export，再查看 Durable Object invocation/error 指标。
4. 人数短暂不下降通常是网络断开尚未完成；客户端断线会先隐藏旧值，服务端在 WebSocket close/error 后广播新值。持续异常时记录连接时间与 deployment，禁止通过 D1 DELETE 处理，因为在线状态不在 D1。

### CI 失败

- verify 失败：修复 typecheck/test/build 或根 Markdown 布局，不能跳过 deploy 门禁。
- bookmark 失败：检查 D1 权限与数据库名；未获得恢复点时不要继续破坏性迁移。
- migration 失败：保存错误与 bookmark，判断是否部分应用；D1 migration 记录是事实源。
- deploy 失败：确认 Worker 名、D1 ID、custom domain 和 GitHub Cloudflare 凭据。
- health 失败：部署可能已生效但不健康；查看 deployment 与日志后决定 Worker rollback。

## 7. 账户运维

- 普通成员停用/恢复必须优先使用 `/director/accounts`，这样停用时会同步撤销会话。
- 馆长账户不能通过该页面停用。
- `SUPERADMIN_EMAILS` 只在注册创建账户时决定角色。修改 Secret 不会升级/降级已有账户。
- 当前没有角色管理 API。已有账户角色变更属于受控数据库操作：先保存 bookmark、确认目标 account id、执行最小 UPDATE、记录操作者与理由，再验证登录权限。不得仅凭显示名识别账户。
- 删除账户由用户点击邮件链接完成；运维人员不应以直接 DELETE 代替。系统保留匿名 account id 以维持所有权与审计引用。

## 8. D1 只读检查

```bash
cd apps/web

# 迁移状态
npx wrangler d1 migrations list beenhere-records --remote

# 核心数量，不读取私人正文
npx wrangler d1 execute beenhere-records --remote --command \
  "SELECT 'accounts' entity, COUNT(*) total FROM accounts
   UNION ALL SELECT 'records', COUNT(*) FROM interview_records
   UNION ALL SELECT 'editions', COUNT(*) FROM published_editions
   UNION ALL SELECT 'claims', COUNT(*) FROM claim_requests
   UNION ALL SELECT 'corrections', COUNT(*) FROM correction_requests;"

# 外键完整性
npx wrangler d1 execute beenhere-records --remote --command \
  "PRAGMA foreign_key_check;"
```

## 9. 周期性数据维护

当前没有 Cron 清理。建议每月检查行数；需要清理时先取 bookmark，再执行：

```sql
DELETE FROM account_sessions
WHERE datetime(expires_at) < datetime('now', '-7 days');

DELETE FROM account_actions
WHERE datetime(expires_at) < datetime('now', '-7 days');

DELETE FROM auth_rate_limits
WHERE datetime(expires_at) < datetime('now', '-1 day');

DELETE FROM public_request_limits
WHERE datetime(expires_at) < datetime('now', '-1 day');
```

这些表是过期技术状态，不删除账户、采访记录、公开版本、认领、更正或审计。生产 DELETE 仍需明确授权、bookmark 和事后计数。

## 10. Worker 回滚

代码/资源故障且 schema 仍兼容时：

```bash
cd apps/web
npx wrangler deployments list --name project-been-here --json
npx wrangler rollback <KNOWN_GOOD_VERSION_ID> \
  --message "incident: rollback after <reason>"
curl --fail https://beenhere.arr2018.dpdns.org/api/health
```

Worker rollback立即把 100% 流量切到指定版本，但不会回滚 D1、Secrets 或外部 SMTP。若目标版本依赖旧 schema/binding，不能单独回滚代码。官方限制见 [Workers Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)。

`PresenceRoom` 不保存业务数据；回滚到引入在线功能之前的 Worker 可以停止该功能而不恢复 D1。Durable Object namespace 可能继续存在但没有旧版本 binding，不应为清理资源而执行生产删除。

回滚后必须补一个正常 Git 提交修复 main；不要让生产版本长期偏离仓库。

## 11. D1 Time Travel 恢复

Time Travel restore 会原地覆盖数据库并取消在途查询，是破坏性生产操作。必须由数据负责人明确确认。

### 获取恢复点

```bash
cd apps/web
npx wrangler d1 time-travel info beenhere-records

# 按事故前 RFC3339 时间定位
npx wrangler d1 time-travel info beenhere-records \
  --timestamp "2026-09-01T00:00:00Z"
```

### 恢复

1. 先保存当前 bookmark，作为撤销恢复点。
2. 停止发布和人工写操作，记录事故前目标时间/bookmark。
3. 获得确认后执行其一：

```bash
npx wrangler d1 time-travel restore beenhere-records \
  --bookmark <TARGET_BOOKMARK>

# 或
npx wrangler d1 time-travel restore beenhere-records \
  --timestamp "<RFC3339_TIMESTAMP>"
```

4. 保存命令返回的 `previous_bookmark`。
5. 验证迁移表、核心数量、外键、登录、读取和受控写入。
6. 如恢复点错误，用 `previous_bookmark` 撤销。

Cloudflare Time Travel 自动开启；保留期依套餐通常为 7 天或 30 天，CI artifact 只保留 7 天。它不是长期异地备份。详见 [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)。

## 12. Secret 轮换

| Secret | 顺序 |
|---|---|
| `SESSION_SECRET` | 公告需要重新登录 → 写入强随机新值 → 验证登录 → 观察 401/错误率。旧会话全部失效。 |
| SMTP 凭据 | 邮箱侧生成新授权码 → 更新 USERNAME/PASSWORD → 真实投递验证 → 吊销旧授权码。 |
| `SUPERADMIN_EMAILS` | 审核名单 → 更新 Secret → 用新注册流程验证；已有角色另行受控处理。 |
| GitHub Cloudflare token | 创建最小权限新 token → 更新 GitHub Secret → 手工触发 workflow → 成功后吊销旧 token。 |

任何 Secret 写入都会产生 Worker deployment；轮换后检查当前部署和 health。

## 13. 域名与 TLS

- custom domain 的唯一声明在 `apps/web/wrangler.jsonc`。
- 域名异常先检查 Cloudflare Worker route/custom domain、DNS 解析和证书状态；不要创建第二个生产域名绕过问题。
- 生产响应应包含 HSTS；修改域名必须同步 `SITE_URL`、CSP/Origin 预期、SMTP Message-ID、GitHub environment URL 和所有文档。

## 14. 事故记录模板

```text
时间（UTC/Asia-Shanghai）：
影响范围：
用户症状：
最近成功 commit / Worker version：
D1 current bookmark：
证据（run、状态码、脱敏日志）：
根因：
执行动作：
代码回滚 / 数据恢复点：
验证结果：
后续预防：
```
