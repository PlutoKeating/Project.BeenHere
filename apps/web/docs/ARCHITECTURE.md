# Web 模块边界

- `src/pages`：公共阅读、账户中心、独立录入、编辑、认领与馆长页面。
- `src/components/RecordForm.tsx`：录入方式的当前适配器；未来 OCR、批量导入或媒体附件在此模块旁扩展。
- `worker/record-repository.ts`：只读公开采访记录。
- `worker/accounts.ts`：Access 身份映射、账户状态和馆长授权。
- `worker/record-management.ts`：所有权、修订、公开、软删除和认领。
- `worker/governance.ts`：公开更正与撤回请求。
- `migrations/0001_initial.sql`：上线前压缩后的唯一数据库定义。

React 只通过 `src/lib/api.ts` 使用 HTTP 接口，不直接依赖 Worker 模块或 D1 字段。
