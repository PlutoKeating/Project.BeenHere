# Project.BeenHere · 来过

一个公开保存陌生人随机采访陌生人之真实对话的网站。内容统一称为“采访记录”；抖音等平台负责对话发生与传播，本站负责结构化呈现、长期维护、认领与更正。

生产地址：<https://beenhere.arr2018.dpdns.org>

## 使用方式

- 路人无需登录，可阅读、搜索、随机发现全部公开采访记录，也可提交更正或撤回请求。
- 登录成员可录入、修改、公开和软删除自己拥有的采访记录。
- 被采访者可提交带说明的认领申请；记录主人同意后，申请人成为共同主人并可编辑。
- 馆长可管理账户及全部采访记录。

账户使用邮箱注册与验证。密码只保存 PBKDF2-SHA-256 派生值；站内支持登录、找回密码、修改用户名/邮箱/密码和邮件确认删除账户。

## 技术结构

React 19、Tailwind CSS 4 与 Vite 构成响应式前端；Cloudflare Worker 提供同源 API 与静态资源；Cloudflare D1 保存账户、采访记录、版本、所有权、认领和审计数据。详见 [架构](docs/ARCHITECTURE.md)、[领域语言](docs/CONTEXT.md)、[设计系统](docs/DESIGN_SYSTEM.md) 与 [启动部署](docs/QUICK_START.md)。

```bash
npm install
npm run dev
npm run check
```
