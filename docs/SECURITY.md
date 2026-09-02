# 安全模型

本文记录当前实现，不是第三方安全审计或合规认证。

## 1. 信任边界

- 浏览器、公开社交平台内容和所有 HTTP 输入均不可信。
- Cloudflare Worker 是 API 认证、授权和输入验证的唯一执行边界；API/回退头由 Worker 设置，普通静态头由同一部署内的 Workers Assets `_headers` 设置。
- `PresenceRoom` Durable Object 是实时连接协调边界，只接收 Worker 转发的同源 WebSocket，不作为账户认证源。
- 同源 OCR Web Worker 是浏览器内的临时计算边界；它接收 ImageBitmap，不能读取 HttpOnly 会话 Cookie，当前代码不调用本站 API，也不具备 D1 binding 或截图上传接口。Paddle BCE、jsDelivr 与 Google Fonts 是受 CSP 固定来源限制的外部静态资源服务。
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
- `/api/presence` 虽使用 GET 握手，仍强制 `Origin === SITE_URL` 与 WebSocket Upgrade；连接后的第一条 hello 消息必须携带 UUID visitor，防止第三方网页借用连接操纵人数。
- SameSite=Lax Cookie 与严格 Origin 共同降低 CSRF 风险。
- 所有 JSON 正文先检查 Content-Type，再由 Zod 校验长度、枚举、URL、时间与结构。
- SQL 全部使用 D1 prepared statement `.bind()`，不拼接用户正文；唯一动态 placeholder 数量来自已验证的漂流排除列表。
- API 错误不返回堆栈、SQL、SMTP 凭据或内部异常；未处理异常只返回通用 500。
- 忘记密码无论账户是否存在都返回同一 202 文案。

## 8. 响应头

静态响应由 `apps/web/public/_headers` 设置；API/Worker 回退响应由 `worker/http.ts` 设置，两处策略必须同步：

- `Content-Security-Policy`：页面资源默认同源，禁止 object、外部 base、frame ancestor；页面脚本只允许同源与 `wasm-unsafe-eval`，Worker 只允许同源；样式/字体仅额外允许 Google Fonts 固定域名，connect 仅额外允许固定的 jsDelivr WASM 与 Paddle 模型域名。锁定版本的 `/vendor/paddleocr-worker-0.4.2.js` 因其内置 OpenCV 运行时需要动态求值、ONNX Runtime 需要加载 jsDelivr 子模块，会先脱离全局 CSP，再只对该 Worker 响应允许 `unsafe-eval`、jsDelivr 脚本及两个固定下载域名；主页面不继承这些权限。
- `Strict-Transport-Security`：生产一年并包含子域。
- `X-Frame-Options: DENY`。
- `X-Content-Type-Options: nosniff`。
- `Referrer-Policy: strict-origin-when-cross-origin`。
- `Permissions-Policy`：关闭 camera、microphone、geolocation。

JSON API 额外使用 `Cache-Control: no-store`。

Workers Assets 的 `_headers` 规则会合并所有匹配项，同名 CSP 同时存在时浏览器会取交集。`/vendor/*` 因此必须先用 `! Content-Security-Policy` 移除全局策略，再附加专用策略；自动测试与生产验收都要防止回退为两条 CSP。

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
- OCR 原始截图只存在于用户选择的浏览器 File、临时 Object URL 与浏览器 OCR Worker 内存中；不上传 Worker API、不写入 D1/R2/日志，也不作为来源证据。模型与 WASM 供应方会看到静态资源请求的常规网络元数据，但不会收到截图字节。
- OCR 结果的坐标和置信度只用于当前校对界面；提交 `RecordDraft` 时显式重建消息对象，只保留 `speakerRole` 与 `body`。
- OCR 输入限制为 1–5 张 PNG/JPEG/WebP，单图最多 15 MB、解码后最多 4000 万像素；限制用于降低浏览器内存/解码风险，不代表图片内容安全或识别结果可信。
- 在线 visitor UUID 只保存在浏览器 localStorage 与活动 WebSocket attachment，不进入 URL，不写入 D1 或应用日志，也不主动关联 IP、路径或账户；Cloudflare 仍会按其平台规则处理连接元数据。对外只广播聚合人数。

## 12. 依赖与供应链边界

- npm 安装使用根 `package-lock.json` 与 `npm ci`；PaddleOCR 依赖额外在构建脚本中校验必须精确为 0.4.2。
- 生产 Vite 构建当前发布客户端 source map，Wrangler 上传 Worker source map；它们用于诊断但不得包含 Secret、`.dev.vars` 或用户数据。关闭或改为私有化时必须同步部署与运维说明。
- OCR vendor Worker 从锁定 npm 包复制，不手工修改、不提交生成文件；生产 Assets 使用内容 ETag 与 immutable cache。
- ONNX Runtime URL 固定为 1.24.3；Paddle 模型路径固定到 PaddleX 3.0.0 的 PP-OCRv6 tiny 资源。更新任一地址或版本必须同步 CSP、文档、资源大小、真实浏览器烟测与隐私说明。
- 页面不允许外部 JavaScript 或 `unsafe-eval`；只有 OCR vendor Worker 响应获得 jsDelivr 脚本和内置 OpenCV 所需的动态求值权限。
- 当前没有 Subresource Integrity、资源镜像或离线模型后备。固定上游被篡改、撤回或不可用仍是可用性/供应链风险；不能以扩大 CSP 或默认上传截图作为临时绕过。

## 13. 已知边界与后续门禁

当前未实现：

- MFA、Passkey 或恢复码。
- CAPTCHA/Turnstile、Cloudflare WAF/边缘 Rate Limiting 仓库配置。
- 独立 staging 环境。
- 外部 SIEM、错误告警或异常登录通知。
- 自动清理过期技术状态的 Cron。
- 账户自助会话列表、单设备撤销和登录历史。
- 在线连接级限流、Turnstile 与恶意多浏览器访客防刷；当前 Origin 与 UUID 校验只阻止跨站滥用，不能证明一个 UUID 对应一个自然人。

这些不是当前已承诺功能。引入任一项时必须更新威胁模型、数据模型、运维手册和验证矩阵。

## 14. 安全事件

怀疑凭据泄露时：

1. 停止公开传播含敏感信息的日志/截图并记录暴露范围。
2. 按影响轮换 SMTP、SESSION_SECRET 或 Cloudflare token；不要只删除聊天或日志。
3. 查看 Worker deployments、GitHub Actions、D1 审计和账户状态。
4. 如可能存在未授权数据修改，保存当前 bookmark 后定位事故前恢复点。
5. 验证生产健康、登录、邮件和关键数据；记录根因与预防措施。

具体命令见 [OPERATIONS.md](OPERATIONS.md)。

## 15. 开源许可与公开仓库

- 项目代码采用 `AGPL-3.0-only`；根目录 [`LICENCE`](../LICENCE) 是许可证原文的唯一事实源，npm 根包与 Web workspace 使用相同 SPDX 标识。
- 生产页面页脚提供公开源代码、许可证和无担保声明入口，网络用户可以直接取得当前公开仓库源码。
- GitHub Secret Scanning 与 Push Protection 当前已启用，但不能替代提交前检查；真实 Secret、`.dev.vars`、恢复产物和用户数据仍不得进入 Git 历史。
- 2026-09-02 的基线审计覆盖当时全部 36 个可达提交，高置信凭据模式与开放 Secret/Dependabot 告警均为 0；这是时间点证据，不保证未来提交自动安全。
