# Web 应用

`apps/web` 是当前唯一可部署应用。一个 Wrangler/Vite 部署同时发布 React/Tailwind 响应式界面、同源 Worker API、Durable Object 在线房间、D1 访问与 SMTP 客户端。Workers Assets 直接提供静态文件，`/api/*` 才由 `run_worker_first` 交给 Worker 模块。移动端优先，同时适配平板与桌面。

## 目录

- `src/`：浏览器端 React 应用。
- `worker/`：Worker 入口、业务模块、在线房间、安全边界与 SMTP。
- `migrations/`：D1 的顺序迁移文件；当前采访正文保存为 `interview_messages` 双角色纯文本消息，已经发布的迁移不得改写。
- `public/`：Workers Assets 的 `_headers` 等公开资源；构建前从锁定依赖生成的 `public/vendor/` 被 Git 忽略并由 Vite 复制到产物。页面 CSP 与 OCR Worker CSP 在 `_headers` 中分开定义。
- `wrangler.jsonc`：生产 Worker、域名、Assets、D1 binding 与非敏感变量的配置源。

## 常用命令

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run deploy
npm run db:migrate:local
npm run prepare:ocr
```

`predev` 与 `prebuild` 会自动执行 `prepare:ocr`，从精确锁定的 PaddleOCR.js 0.4.2 包复制官方预构建浏览器 Worker。`deploy` 必须调用完整 `build`，不能直接绕开此生命周期。不得手工编辑或提交生成的 11,341,486 字节文件，也不得为 OCR 创建第二个 Cloudflare Worker 项目。

完整信息以仓库根部的[技术架构](../../../docs/ARCHITECTURE.md)、[API](../../../docs/API.md)、[部署](../../../docs/DEPLOYMENT.md)和[运维手册](../../../docs/OPERATIONS.md)为准。
