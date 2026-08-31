<div align="center">

# Project.BeenHere · 来过

**你不需要重要，才值得被记录。**

</div>

> Project.BeenHere 是一座**记录普通人存在痕迹的开放互联网档案馆**。它不制造明星，不评判价值，只做一件简单的事：
>
> **见证一个人曾经来过。**

一个人像漂流瓶一样随机出现，被另一个陌生人捡起，接受一次正式采访，然后进入一座庄严的公共档案馆。

## 是什么 / 不是什么

- 是**见证人**的互联网，不是**展示人**的互联网
- 是一座**档案馆**，不是媒体门户 / 人物数据库 / 社交平台
- 每一个普通人都拥有与名人完全相同的档案规格

## 核心体验

**漂流 → 偶遇 → 采访 → 记录 → 入馆 → 再次漂流**

没有终点。用户不必先选择分类、人物或热门内容，而是随机打开一份档案，遇见一个本不会认识的人。

> [!NOTE]
> 抖音承载采访发生、传播与社区互动；本站承载独立、结构化、可修订的长期公共档案。

## 文档

- [设计灵魂](docs/DESIGN_SOUL.md) — 项目的精神、理念与产品愿景
- [完整产品与系统架构](docs/ARCHITECTURE.md) — 最终产品形态、领域模型、模块、数据、安全与运维设计
- [统一语言](CONTEXT.md) — 项目领域术语与边界
- [设计系统](docs/DESIGN_SYSTEM.md) — 颜色、字体、空间与组件语言
- [本地开发与部署](docs/QUICK_START.md) — Cloudflare Worker、D1 与 CI/CD

## 在线档案馆

生产环境：<https://beenhere.arr2018.dpdns.org>

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```
