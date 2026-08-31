# Web Module Architecture

## Runtime

```text
React SPA + Tailwind assets
          |
Cloudflare Worker HTTP interface
          |
   ArchiveRepository
   EditorialModule
   PublicationModule
          |
        D1
```

Cloudflare Vite plugin 在本地使用 workerd，在部署时生成 Worker 与静态资源配置。`/api/*` 先进入 Worker；其他路径由静态资源 binding 提供 SPA fallback。

## Design system

`src/styles/tokens.css` 实现 primitive、semantic、component 三层 token。`src/styles/global.css` 将 semantic token 映射到 Tailwind v4 theme。组件不使用未经 token 语义化的品牌颜色。

移动端使用单栏、20px 边距、底部安全区导航；平板切换双栏；桌面目录最大宽度 1140px，阅读正文固定 720px。Paper 与 Night theme 只覆盖 semantic token。

## Backend rules

- `ArchiveRepository` 只读取公开或持链接可见的当前 Edition。
- `EditorialModule` 管理 Draft、Participant Review、Consent Grant。
- `PublicationModule` 分配 Archive Number、创建不可变 Edition、生成 Message Unit、执行 Withdrawal。
- 管理接口验证 Cloudflare Access 注入的 `Cf-Access-Jwt-Assertion`，包括签名、issuer、audience 与有效期。
- 本地管理员旁路只允许 localhost。
- 所有公开写入使用 Zod 校验；审计事件 append-only。
