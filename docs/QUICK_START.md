# 启动与部署

## 本地

需要 Node.js 22+。安装后运行：

```bash
npm install
npm run dev
npm run check
```

初始化本地 D1：

```bash
npm run db:migrate:local
```

首次开发先复制 `apps/web/.dev.vars.example` 为 `apps/web/.dev.vars`；该本地文件已被 Git 忽略。

## 生产

- Worker：`project-been-here`
- D1：`beenhere-records`
- 唯一域名：`beenhere.arr2018.dpdns.org`
- Worker secrets：`SESSION_SECRET`、`SMTP_USERNAME`、`SMTP_PASSWORD`、`SUPERADMIN_EMAILS`
- Worker vars：`SMTP_HOST=smtp.yeah.net`、`SMTP_PORT=465`、`SMTP_FROM_NAME=来过`
- GitHub secret：`CLOUDFLARE_API_TOKEN`
- GitHub variable：`CLOUDFLARE_ACCOUNT_ID`

站内账户保护 `/studio*`、`/director*`、`/api/account/*` 和 `/api/director/*`。邮箱完成验证后才能登录；Worker 根据注册邮箱是否属于 `SUPERADMIN_EMAILS` 授予馆长角色。

主分支推送触发 GitHub Actions：检查根目录文档布局、安装锁定依赖、类型检查、测试、构建、保存 D1 恢复书签、迁移、部署和健康检查。Cloudflare Worker 的 Git 连接也会收到同一提交并触发平台构建。
