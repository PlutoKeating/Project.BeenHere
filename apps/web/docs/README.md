# Web 应用

`apps/web` 是当前唯一可部署应用。一个 Wrangler/Vite 部署同时发布 React/Tailwind 响应式界面、同源 Worker API、Durable Object 在线房间、D1 访问与 SMTP 客户端。Workers Assets 直接提供静态文件，`/api/*` 才由 `run_worker_first` 交给 Worker 模块。移动端优先，同时适配平板与桌面。

## 目录

- `src/`：浏览器端 React 应用。
- `src/styles/`：三层主题 Token 与全局样式；默认亮色画布以纯 CSS 生成草纱纸米色和低对比纤维质感，夜间主题使用独立纹理变量，不依赖图片资源。
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

登录成员还可从 `/studio/interview` 开始浏览器内自动采访。它由 `src/lib/automated-interview.ts` 的确定性规则驱动，不调用外部模型，也不持久化进行中内容；正常结束后只把可见双角色文本交给现有 `RecordForm`，保存为当前账户本人认领的未公开记录。采访开始时间与机器提问由前后端共同锁定，受访者自己的回答仍可编辑或删除。

`/about`、`/privacy`、`/terms` 是公共信任页面；顶栏/移动更多菜单、页脚、注册页和自动采访知情说明提供入口。修改账户、内容公开、第三方资源或保留期限时必须同步这些页面。

`npm run deploy` 直接面向 `wrangler.jsonc` 中的现有生产 Worker/custom domain，不是本地预览命令；只在完成生产授权、D1 recovery bookmark 与全量门禁后使用。日常发布仍以根文档规定的 GitHub Actions 链路为准。

采访标题由 `worker/domain.ts` 从全部被采访者消息确定性派生。`npm run titles:backfill:remote` 只读预览生产旧标题回填；显式追加 `-- --apply` 才会在打印 D1 Time Travel bookmark 后更新根记录标题并写审计。脚本对非公开标题做脱敏，且不会改写公开版本快照。

完整信息以仓库根部的[技术架构](../../../docs/ARCHITECTURE.md)、[API](../../../docs/API.md)、[部署](../../../docs/DEPLOYMENT.md)和[运维手册](../../../docs/OPERATIONS.md)为准。
