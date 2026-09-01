# 安全模型

本文记录当前实现，不是第三方安全审计或合规认证。

## 1. 信任边界

- 浏览器、公开社交平台内容和所有 HTTP 输入均不可信。
- Cloudflare Worker 是认证、授权、输入验证和响应头的唯一执行边界。
- D1 只接受 Worker/运维凭据访问；浏览器没有 D1 binding。
- SMTP 是外部依赖，只接收最小的收件地址、邮件正文和验证链接。
- GitHub Actions 与 Cloudflare 管理凭据是生产控制面，权限高于站内馆长。

## 2. 密码

- 新密码长度 12–128 字符。
- 每次设置密码生成 16 字节随机盐。
- 使用 Web Crypto PBKDF2-HMAC-SHA-256，100,000 轮，输出 256 bit。
- D1 保存版本化字符串 `pbkdf2-sha256$100000$<salt>$<hash>`，不保存明文或可逆密文。
- 比较派生值时使用固定工作量字节比较。

100,000 轮是当前 Cloudflare Workers Web Crypto 对 PBKDF2 的运行时上限。修改算法或参数必须引入新版本标识与迁移策略，不能静默把旧凭据解释成新格式。

## 3. 会话

- 登录、注册验证和密码重设成功后生成 32 字节随机 opaque token。
- 浏览器 Cookie：`bh_session`、`Path=/`、`HttpOnly`、`Secure`、`SameSite=Lax`、30 天 Max-Age。
- D1 只保存 `HMAC-SHA-256(SESSION_SECRET, token)`，泄露数据库不能直接得到 Cookie token。
- 只接受未过期、active 账户的会话。
- 退出删除当前会话；停用账户、改邮箱、改密码、重设密码、删号撤销相应全部会话。
- 轮换 `SESSION_SECRET` 会使所有已有会话无法匹配，相当于全站强制退出。

## 4. 邮件动作令牌

- 注册验证、密码重设、换邮箱、删号共用 `account_actions`。
- 原始 token 为 32 字节随机值，只出现在发给目标邮箱的 HTTPS 链接中。
- D1 只保存 SHA-256 摘要、动作类型、目标账户、必要 payload 和过期时间。
- 链接 30 分钟过期、只能消费一次；同账户同类型的新动作会撤销旧未消费 token。
- 改密码、重设密码和确认换邮箱会清理其他未完成安全动作，减少旧链接接管风险。
- SMTP 失败时删除刚创建的动作 token；忘记密码对外仍返回统一文案。

## 5. 邮箱与账户生命周期

- 邮箱使用 `COLLATE NOCASE` 唯一约束；输入标准化为小写。
- 注册先进入 pending，邮箱确认后才能 active 登录。
- 改邮箱需要当前密码，并向新邮箱发送确认；确认后撤销全部会话。
- 改密码需要当前密码；忘记密码依赖原邮箱的一次性链接。
- 删号依赖当前邮箱确认。确认后邮箱替换为不可投递匿名地址、显示名改为“已删除账户”、密码清空、状态置为 deleted、会话与动作删除。
- 为保持采访记录所有权和审计引用，account id 及已发布采访记录不会物理删除。

## 6. 授权

| 对象 | 授权来源 |
|---|---|
| 账户 API | active session |
| 采访记录写操作 | `record_owners(record_id, account_id)` 或 director role |
| 认领审阅 | 当前记录主人或 director |
| 全站记录/账户管理 | director role |
| 普通成员停用/恢复 | director role；不能停用 director |

前端路由保护只改善体验，不作为授权证据。每个 Worker 写路径都必须重新认证并调用所有权/角色检查。

## 7. CSRF、输入与输出

- 所有状态修改请求要求 `Origin === SITE_URL`；本地 development 只额外允许 localhost/127.0.0.1。
- SameSite=Lax Cookie 与严格 Origin 共同降低 CSRF 风险。
- 所有 JSON 正文先检查 Content-Type，再由 Zod 校验长度、枚举、URL、时间与结构。
- SQL 全部使用 D1 prepared statement `.bind()`，不拼接用户正文；唯一动态 placeholder 数量来自已验证的漂流排除列表。
- API 错误不返回堆栈、SQL、SMTP 凭据或内部异常；未处理异常只返回通用 500。
- 忘记密码无论账户是否存在都返回同一 202 文案。

## 8. 响应头

静态响应设置：

- `Content-Security-Policy`：资源默认同源，禁止 object、外部 base、frame ancestor；connect 仅同源。
- `Strict-Transport-Security`：生产一年并包含子域。
- `X-Frame-Options: DENY`。
- `X-Content-Type-Options: nosniff`。
- `Referrer-Policy: strict-origin-when-cross-origin`。
- `Permissions-Policy`：关闭 camera、microphone、geolocation。

JSON API 额外使用 `Cache-Control: no-store`。

## 9. 频率限制

| 动作 | 当前窗口与上限 | Key 构成 |
|---|---|---|
| 注册 | 15 分钟 4 次 | 来源 IP + 动作 |
| 登录 | 15 分钟 8 次 | 来源 IP + 动作 |
| 忘记密码 | 15 分钟 4 次 | 来源 IP + 动作 |
| 修改密码 | 15 分钟 5 次 | 来源 IP + account id + 动作 |
| 修改邮箱 | 15 分钟 3 次 | 来源 IP + account id + 动作 |
| 请求删号 | 15 分钟 3 次 | 来源 IP + account id + 动作 |
| 更正/撤回请求 | 1 小时 5 次 | 来源 IP + 小时桶 |

Key 在写入 D1 前做 SHA-256，不直接保存 IP。应用限流不是 DDoS/WAF 替代品。

## 10. Secrets 与控制面

- Worker Secrets：`SESSION_SECRET`、`SMTP_USERNAME`、`SMTP_PASSWORD`、`SUPERADMIN_EMAILS`。
- GitHub Secret：`CLOUDFLARE_API_TOKEN`；variable：`CLOUDFLARE_ACCOUNT_ID`。
- 非敏感 vars 才进入 `wrangler.jsonc`。
- 本地凭据只进入被 Git 忽略的 `.dev.vars`。
- 不在源码、迁移、文档、issue、Actions output 或日志中记录 Secret 值。

配置与轮换见 [DEPLOYMENT.md](DEPLOYMENT.md) 和 [OPERATIONS.md](OPERATIONS.md)。

## 11. 内容与隐私

- 公共查询只返回 public；unlisted 只允许按编号读取；private/deleted 不公开。
- 公众更正请求不会直接修改采访记录。
- 公开版本不可变；修改产生新版本与内容摘要，避免静默覆盖历史。
- 采访记录软删除保留版本与审计；账户删除保留匿名引用。
- 原始来源材料不应放进公开字段；当前系统尚未实现私有附件存储。

## 12. 已知边界与后续门禁

当前未实现：

- MFA、Passkey 或恢复码。
- CAPTCHA/Turnstile、Cloudflare WAF/边缘 Rate Limiting 仓库配置。
- 独立 staging 环境。
- 外部 SIEM、错误告警或异常登录通知。
- 自动清理过期技术状态的 Cron。
- 账户自助会话列表、单设备撤销和登录历史。

这些不是当前已承诺功能。引入任一项时必须更新威胁模型、数据模型、运维手册和验证矩阵。

## 13. 安全事件

怀疑凭据泄露时：

1. 停止公开传播含敏感信息的日志/截图并记录暴露范围。
2. 按影响轮换 SMTP、SESSION_SECRET 或 Cloudflare token；不要只删除聊天或日志。
3. 查看 Worker deployments、GitHub Actions、D1 审计和账户状态。
4. 如可能存在未授权数据修改，保存当前 bookmark 后定位事故前恢复点。
5. 验证生产健康、登录、邮件和关键数据；记录根因与预防措施。

具体命令见 [OPERATIONS.md](OPERATIONS.md)。
