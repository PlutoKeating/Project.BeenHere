# Web Module

Cloudflare Worker 全栈应用。React + Tailwind CSS 提供公共档案馆与编辑工作台；同一 Worker 提供 `/api/v1/*` 与 `/api/admin/*`，D1 保存正式数据。

## 页面

- `/`：首页
- `/drift`：随机漂流
- `/archives`、`/archives/:archiveNumber`：索引与三投影阅读
- `/people/:slug`、`/topics/:slug`、`/years/:year`：档案漫游
- `/search`：搜索
- `/method`：方法与 AI 声明
- `/corrections`：更正、认领、隐私与撤回请求
- `/admin`：编辑工作台

## 命令

从仓库根目录运行 `npm run dev`、`npm run check`、`npm run deploy`。完整步骤见 `docs/QUICK_START.md`。
