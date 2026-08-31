# ADR-0003：使用 Cloudflare Worker、D1 与唯一生产域名

- 状态：Accepted
- 日期：2026-08-31

## 决策

应用采用 React + Vite + Tailwind CSS 构建，由单个 Cloudflare Worker 同域提供静态资源与 API；D1 是唯一事务事实来源。生产仅使用 `beenhere.arr2018.dpdns.org`，关闭 `workers.dev` 与 preview URL。

## 原因

- 前端、API 与数据库可以在一个 TypeScript modular monolith 中部署，适合当前团队和规模。
- 同域减少 CORS、环境漂移与发布协调成本。
- D1 batch 足以承载当前编辑、出版、撤回与审计事务。
- 唯一域名避免预览地址被误当作正式档案链接。

## 后果

- Worker 与 D1 配置成为生产关键依赖，migration 必须先于部署执行。
- 公开 API 暂不做激进缓存，优先保证撤回立即生效。
- 大文件证据、OCR 与媒体处理不得塞进 D1；后续通过受限对象存储 Adapter 接入。
- GitHub Actions 只能使用最小权限、可轮换的 Cloudflare API Token，不保存本机 OAuth 凭据。
