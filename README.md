# Project.BeenHere · 来过

一个公开保存陌生人随机采访陌生人之真实对话的网站。内容统一称为“采访记录”；抖音等平台负责对话发生与传播，本站以采访者与被采访者的纯文本消息保存、长期维护、认领与更正。

生产地址：<https://beenhere.arr2018.dpdns.org>

## 使用方式

- 路人无需登录，可阅读、搜索、随机发现全部公开采访记录，也可提交更正或撤回请求。
- 页面与本站保持连接时会进入实时在线统计；至少两位访客在线时，页面顶部显示当前人数。
- 登录成员可直接粘贴或拖入聊天截图，由浏览器端 OCR 转为双方纯文本消息；也可粘贴已有文字。校对双方归属后，可修改、公开和软删除自己拥有的采访记录。
- 被采访者可提交带说明的认领申请；记录主人同意后，申请人成为共同主人并可编辑。
- 馆长可管理账户及全部采访记录。

账户使用邮箱注册与验证。密码只保存 PBKDF2-SHA-256 派生值；站内支持登录、找回密码、修改用户名/邮箱/密码和邮件确认删除账户。

## 技术结构

当前仓库只有 `apps/web` 一个 npm workspace 和一个生产部署单元：

- React 19.2.8、React Router 7.18.3、Tailwind CSS 4.3.3、Vite 8.2.2 与 TypeScript 7.0.2 构成响应式 SPA。
- Cloudflare Workers Assets 提供前端静态文件；同一 `project-been-here` Worker 提供 `/api/*`、D1 访问与 SMTP 客户端。
- SQLite-backed `PresenceRoom` Durable Object 通过 WebSocket Hibernation 维护全站实时在线人数。
- D1 `beenhere-records` 保存账户、精简采访草稿、不可变公开版本、双角色消息、所有权、认领、更正和审计。
- PaddleOCR.js 0.4.2 在浏览器专用 Worker 中识别截图；PP-OCRv6 tiny 模型来自 Paddle BCE，ONNX Runtime 1.24.3 模块与 WASM 来自 jsDelivr，截图字节不会发送到这些服务。
- 事务邮件由 Worker 通过 `cloudflare:sockets` 连接 Yeah SMTP TLS 465；字体样式来自 Google Fonts，均受 CSP 固定来源限制。

没有第二个 OCR Worker 项目、R2/KV 业务存储、独立 staging、Cron、Turnstile/WAF 仓库配置或服务端 OCR。唯一权威生产发布链路是 `main` → GitHub Actions → Wrangler → 现有 Cloudflare Worker。

## 文档入口

- [技术架构](docs/ARCHITECTURE.md)：运行时拓扑、模块边界、数据模型和关键流程。
- [HTTP API](docs/API.md)：接口、权限、请求与响应约定。
- [部署架构](docs/DEPLOYMENT.md)：环境、Secrets、CI/CD、标准发布与验收。
- [运维手册](docs/OPERATIONS.md)：监控、故障处理、回滚、D1 恢复与密钥轮换。
- [安全模型](docs/SECURITY.md)：认证、授权、令牌、限流和已知边界。
- [本地启动](docs/QUICK_START.md)：开发环境、D1 初始化和验证命令。
- [领域语言](docs/CONTEXT.md)、[内容规范](docs/content.md)、[设计原则](docs/DESIGN_SOUL.md)、[设计系统](docs/DESIGN_SYSTEM.md)。

```bash
npm ci
npm run dev
npm run check
```
