# 最终产品架构

## 1. 系统边界

Project.BeenHere 是采访记录公共站。唯一生产域名为 `beenhere.arr2018.dpdns.org`。系统不提供开放 Wiki 式匿名编辑，不设置内容复核流程，也不把录入方式绑定到任何平台。

```text
浏览器
  ├─ 公共页面与 /api/v1/* ───────────────┐
  └─ Cloudflare Access 身份验证           │
       └─ /studio* /director*             │
          /api/account/* /api/director/*  │
                                          ▼
                                Cloudflare Worker
                                  ├─ React 静态资源
                                  ├─ RecordRepository
                                  ├─ AccountModule
                                  ├─ RecordManagementModule
                                  └─ GovernanceModule
                                          │
                                          ▼
                                    Cloudflare D1
```

浏览器永不直连 D1。Access 负责认证，Worker 再验证 JWT 的签名、签发者、受众和时效；D1 中的账户角色与记录所有权负责授权。

## 2. 权限矩阵

| 能力 | 路人 | 成员 | 记录主人 | 馆长 |
|---|---:|---:|---:|---:|
| 阅读所有公开采访记录 | ✓ | ✓ | ✓ | ✓ |
| 提交更正/撤回请求 | ✓ | ✓ | ✓ | ✓ |
| 创建采访记录 |  | ✓ | ✓ | ✓ |
| 修改、公开、软删除记录 |  |  | 自己拥有 | 全部 |
| 提交本人认领申请 |  | ✓ | ✓ | ✓ |
| 审阅记录的认领申请 |  |  | 自己拥有 | 全部 |
| 停用/恢复成员账户 |  |  |  | ✓ |

`record_owners` 是编辑授权的唯一数据源。上传产生 `uploader` 所有权；认领获批产生 `claimed` 所有权。软删除保留记录、版本和审计事件，不再公开。

## 3. 模块与页面

- 公共阅读：`/records`、`/records/:recordNumber`、`/drift`、`/search`、人物/话题/年份聚合页。
- 账户中心：`/studio`，只展示当前成员可管理的采访记录。
- 独立录入：`/studio/new`。来源类型覆盖抖音、其他社交媒体、线下、直接采访与其他形式；以后 OCR、导入和多媒体录入只扩展这个模块。
- 记录编辑：`/studio/records/:id`，使用修订号做乐观并发控制。
- 认领：`/studio/claim/:recordId` 与 `/studio/claims`。
- 馆长：`/director/accounts`。

## 4. 数据模型

- `accounts`：Access 邮箱映射、显示名、`member|director`、账户状态。
- `people`：被采访者的公开身份呈现。
- `interview_records`：采访记录根实体、稳定编号、公开状态、当前版本、软删除信息。
- `record_owners`：记录与账户的多对多所有权。
- `source_records`：来源类型、平台、外部 ID 与原始链接。
- `record_drafts`：当前可修改快照和修订号。
- `published_editions`：每次公开产生不可变版本及 SHA-256 内容摘要。
- `conversation_units`：提问、回答、图片说明、停顿、注记或段落。
- `claim_requests`：认领申请文本、决定、审阅者与说明。
- `correction_requests`：公开更正、隐私、授权和撤回请求。
- `audit_events`：关键写操作的责任记录。

只有 `public` 进入公共列表、搜索与随机发现；`unlisted` 仅可通过编号读取；`private` 和 `deleted` 不公开。

## 5. 唯一 HTTP 接口

```text
GET  /api/v1/meta
GET  /api/v1/records
GET  /api/v1/records/{recordNumber}
GET  /api/v1/drift
GET  /api/v1/search
GET  /api/v1/people/{slug}
GET  /api/v1/topics/{slug}
GET  /api/v1/years/{year}
POST /api/v1/correction-requests

GET|PATCH /api/account/me
GET|POST  /api/account/records
GET|PATCH|DELETE /api/account/records/{id}
POST /api/account/records/{id}/publish
POST /api/account/records/{id}/claim
GET  /api/account/claims
POST /api/account/claims/{id}/review

GET   /api/director/accounts
PATCH /api/director/accounts/{id}/status
```

不提供任何别名、旧路径或兼容接口。

## 6. 发布与恢复

GitHub Actions 对每次变更执行类型检查、测试和构建；主分支通过后迁移 D1 并部署 Worker。Cloudflare Worker 的 Git 仓库连接同时保留平台侧构建触发。部署前保存 D1 Time Travel bookmark，生产健康检查必须成功。
