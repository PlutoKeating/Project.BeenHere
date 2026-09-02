# 本地启动

本页只描述本地开发。生产发布见[部署架构](DEPLOYMENT.md)，线上故障与恢复见[运维手册](OPERATIONS.md)。

## 1. 环境要求

- Node.js 22.13 或更高版本；CI 当前使用 Node.js 24。
- npm，依赖版本由根目录 `package-lock.json` 锁定。
- 需要执行 Cloudflare 远程命令时，先完成 `npx wrangler login`。

## 2. 安装与初始化

```bash
npm ci
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run db:migrate:local
npm run dev
```

开发服务器由 Vite 与 Cloudflare Vite Plugin 共同启动；React 页面、Worker API 和本地 D1 使用同一套源码。

`npm run dev` 与 `npm run build` 会先从锁定的 `@paddleocr/paddleocr-js@0.4.2` 包复制官方浏览器 Worker 到被 Git 忽略的 `apps/web/public/vendor/`。如果只需要重新生成该资产，可运行 `npm run prepare:ocr --workspace @beenhere/web`。浏览器首次截图识别还需要访问 `cdn.jsdelivr.net` 与 `paddle-model-ecology.bj.bcebos.com`；前者提供 ONNX Runtime 1.24.3 子模块/WASM，后者提供两个 PP-OCRv6 tiny 模型，截图本身不会发送到这些地址。

`apps/web/.dev.vars` 已被 Git 忽略。只使用 `.dev.vars`，不要同时创建 `.env`。至少替换 `SESSION_SECRET`；需要测试注册、密码重设、换邮箱或删号邮件时，再填写可用的测试 SMTP 凭据。禁止把生产授权码复制进仓库或测试日志。

## 3. 本地变量

| 名称 | 本地用途 |
|---|---|
| `APP_ENV` | 设为 `development`，允许 localhost 的同源写请求。 |
| `SITE_URL` | 本地邮件链接和 Origin 校验基址，默认 `http://localhost:5173`。 |
| `SESSION_SECRET` | 会话令牌 HMAC 密钥；使用独立随机值。 |
| `SMTP_HOST` / `SMTP_PORT` | 测试 SMTP TLS 端点。 |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | 测试邮箱凭据。 |
| `SMTP_FROM_NAME` | 发件人显示名。 |
| `SUPERADMIN_EMAILS` | 本地首次注册时授予馆长角色的邮箱列表。 |

`DB`、`ASSETS` 与 `PRESENCE` 由 Wrangler/Vite binding 提供，不写入 `.dev.vars`。本地 Durable Object 数据在 `.wrangler/` 下生成并已被忽略。

## 4. 验证

```bash
npm run typecheck
npm test
npm run build
# 或一次执行全部门禁
npm run check
```

测试覆盖密码派生、令牌摘要、Cookie/Origin 边界、在线访客去重与消息校验、SMTP 邮件格式、领域编号、纯文本与 OCR 对话解析、截图输入限制、基于全部被采访者消息的标题派生、移动导航和异步注册成功状态。`npm run check` 不发送真实邮件，也不执行真实模型推理或证明生产部署成功。

本地 OCR 验收：登录后进入 `/studio/new`，可在页面任意位置直接粘贴图片，或选择/拖入 PNG、JPEG、WebP 聊天截图。单次最多 5 张，每张最多 15 MB、解码后最多 4000 万像素。首次加载会下载模型；识别完成后应显示双角色消息，右侧默认采访者、左侧默认被采访者。检查浏览器 Network，截图不得产生上传请求；只有本站 Worker、BCE 模型、jsDelivr `.mjs`/WASM 和原有字体的 GET 请求。

`npm run dev` 的 Vite 页面不等同于生产 Workers Assets 响应头。需要核验 `_headers` 合并/移除规则时，执行：

```bash
npm run build --workspace @beenhere/web
cd apps/web
npx wrangler dev --config dist/project_been_here/wrangler.json
```

这条命令只用于本地检查构建后 Assets/headers；生成配置带生产普通 vars，不应用于真实账户或邮件测试。分别检查 `/` 与 `/vendor/paddleocr-worker-0.4.2.js` 只返回各自的一条 CSP。

本地实时在线验收：同时用两个不同浏览器配置文件打开页面，第二个连接建立后顶部应显示“2 人在线”；同一浏览器打开多个标签页仍只计为一位。关闭其中一个浏览器后，剩余页面应隐藏人数。

## 5. 本地 D1

```bash
# 应用尚未执行的迁移
npm run db:migrate:local

# 查看本地表
cd apps/web
npx wrangler d1 execute beenhere-records --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

新增数据库变化时创建递增迁移，例如 `0002_description.sql`。不要修改已经在生产执行过的迁移；CI 只会执行尚未记录的文件。

## 6. 常见本地问题

- 注册返回 500：通常是 `.dev.vars` 中 SMTP 配置不可用；先看终端 Worker 日志。
- 写请求返回 403：确认 `APP_ENV=development`，并从 localhost 页面发起请求。
- 数据表不存在：重新运行 `npm run db:migrate:local`。
- 类型与页面行为不一致：先运行 `npm run check`，再检查 `src/lib/api.ts` 与 `worker/index.ts` 是否同步。
- 顶部不显示在线人数：单人在线时属于预期；多人测试时检查浏览器 WebSocket、请求 Origin、本地 `PRESENCE` binding 与控制台连接错误。
- OCR 一直停在加载：检查 `/vendor/paddleocr-worker-0.4.2.js`、两个模型、jsDelivr `.mjs`/WASM 和两套 CSP。vendor 响应必须先移除全局 CSP，再只允许锁定 Worker 所需的 `unsafe-eval`、jsDelivr script/connect 与 Paddle connect；失败时仍可展开纯文本录入。
