# Project.BeenHere · 本地开发与部署

## 前置条件

- Node.js 24+
- npm 11+
- Cloudflare 账号；部署时需 Worker 与 D1 写权限

## 本地启动

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

打开 `http://localhost:5173`。本地编辑接口使用 `X-Local-Admin: 1`；该旁路只对 `localhost` 与 `127.0.0.1` 生效。

## 验证

```bash
npm run check
```

该命令依次执行 TypeScript 检查、领域测试与生产构建。

## Cloudflare 资源

- Worker：`project-been-here`
- D1：`beenhere-archive`
- D1 ID：`2e304f82-d514-469f-b477-e0a6ac783daf`
- 唯一生产域名：`https://beenhere.arr2018.dpdns.org`
- `workers.dev`：禁用
- Preview URLs：禁用

首次部署：

```bash
npx wrangler login
npm run db:migrate:remote
npm run deploy
```

生产库不自动执行 `seed.sql`。示例内容只在首次明确初始化时导入。

## GitHub Actions

`.github/workflows/ci.yml` 在 pull request 执行验证，在 `main` push、手工触发或 `content-published` repository dispatch 后执行验证、记录 D1 Time Travel recovery bookmark、执行 migration、部署 Worker 并完成线上健康检查。CI 不导出生产数据库明文。

已配置的仓库配置：

- Variable `CLOUDFLARE_ACCOUNT_ID`
- Secret `CLOUDFLARE_API_TOKEN`

Token 只应授予此账号的 Workers Scripts Write、D1 Write、Workers Routes Write。不要上传本机 Wrangler OAuth token。

生产环境已创建 `BeenHere Editorial` Access self-hosted application，只保护 `/admin*` 与 `/api/admin/*`，公共档案不要求登录。Allow policy 仅接受账号所有者邮箱；Worker secrets `ACCESS_TEAM_DOMAIN` 与 `ACCESS_AUD` 已设置。Worker 会再次验证 Access JWT 的签名、签发者、受众和有效期。
