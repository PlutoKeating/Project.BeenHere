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

`.github/workflows/ci.yml` 在 pull request 执行验证，在 `main` push、手工触发或 `content-published` repository dispatch 后执行验证、D1 migration、Worker deployment、线上健康检查。

仓库配置：

- Variable `CLOUDFLARE_ACCOUNT_ID`
- Secret `CLOUDFLARE_API_TOKEN`

Token 只应授予此账号的 Workers Scripts Write、D1 Write、Workers Routes Write。不要上传本机 Wrangler OAuth token。
