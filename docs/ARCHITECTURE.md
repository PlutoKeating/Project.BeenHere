# Project.BeenHere · 完整产品与系统架构

> **你不需要重要，才值得被记录。**

## 1. 产品定义

Project.BeenHere 是独立、长期、可验证、可修订的公共采访档案馆。

- 抖音负责相遇、采访发生、传播、评论与社区维护。
- Project.BeenHere 负责采集证据、编辑整理、受访者确认、正式编号、公开阅读、搜索引用、修订与撤回。
- 网站是 Wiki 式知识档案，不是任何人可直接改写人物记录的开放 Wiki。
- 公众可阅读、检索、引用、提交更正；授权编辑者维护正式内容。

系统不复制抖音信息流，不建设粉丝关系，不使用点赞、热度或商业价值决定展示顺序。

## 2. 不变量

1. **普通即价值**：所有采访使用同一档案规格，不按身份、职业、粉丝或热度分级。
2. **随机先行**：首页首要行为是 Drift；搜索与索引存在，但不取代随机相遇。
3. **证据与出版分离**：原始材料是受限证据，公开页面是经授权的 Published Edition。
4. **修订不静默**：公开内容修改必生成新 Edition，并说明变化。
5. **不可变不等于不可撤回**：历史不能被静默篡改；公开状态必须服从隐私、同意与合法请求。
6. **一个事实来源**：Story、Conversation、Record 均来自同一 Published Edition。
7. **社区留在现场**：抖音评论与互动不自动成为档案内容；精选引用必须另获授权并标明来源。
8. **人工最终负责**：OCR、转录与 AI 只产草稿，不得自动公开、自动判断同意或自动合并人物。

## 3. 最终产品形态

### 3.1 公共网站

#### 首页 `/`

- 主标题、项目信念、`捡起一个漂流瓶`。
- 档案馆规模：Interview、Person Record、Topic、Year。
- 次级入口：档案索引、年代、话题、项目方法。
- 不展示热门、趋势、榜单、阅读量。

#### Drift `/drift`

- 从当前可公开集合中近似均匀抽取 Interview。
- 同一浏览会话避免近期重复。
- 不基于用户画像、互动率或内容质量加权。
- 可分享确定结果；每次主动“再捡一个”重新随机。

#### Interview `/archives/{archiveNumber}`

固定页头：Archive Number、Participant 展示名、采访日期、Published Edition、公开状态。

三个投影：

- **Story**：编辑后的连贯阅读版本；任何重排、删节、转述必须可追溯。
- **Conversation**：按 Message Unit 顺序展示问题、回答、图片、停顿、追问关系。
- **Record**：来源、采访元数据、编辑说明、修订历史、授权范围、引用方式。

固定页尾：相关 Person Record、Topic、Douyin Source Record、提交更正、再捡一个。

#### Person Record `/people/{slug}`

- 展示名、身份呈现方式、简短自述。
- 按时间排列全部已公开 Interview。
- 不展示关注、粉丝、热度、人物排名。
- 同一人合并必须由编辑确认，不能仅凭昵称自动匹配。

#### 索引与说明

- `/archives`：按 Archive Number 或时间浏览。
- `/topics/{slug}`：编辑维护的话题说明与相关 Interview。
- `/years/{year}`：年代切片。
- `/search`：搜索人物展示名、采访正文、话题、Archive Number。
- `/method`：采访、编辑、授权、修订、随机算法与 AI 使用说明。
- `/corrections`：更正、隐私、认领、撤回入口。

每个 Interview 提供稳定 canonical URL、建议引用文本、sitemap、RSS/Atom、Open Graph、基础结构化数据和公开 JSON 表示。Source Evidence 永不通过公共接口暴露。

### 3.2 编辑工作台 `/admin`

- 创建或匹配 Person Record。
- 登记 Douyin URL、作品 ID、发布时间与采集时间。
- 上传截图、聊天导出、图片、音视频。
- OCR/转录生成 Editorial Draft。
- 校对 Message Unit，标记说话者、时间、类型、追问父节点。
- 标记敏感信息、第三方信息与授权范围。
- 生成 Story、Conversation、Record 预览。
- 发起受访者确认并记录 Consent Grant。
- 双人复核后发布首个 Edition。
- 处理更正、Redaction、Withdrawal 与本人认领。
- 查看完整审计日志；不能修改或删除审计事件。

### 3.3 公众参与

公众没有直接编辑权。公众可提交事实错误、本人认领、隐私泄露、授权争议、补充材料、话题建议、撤回请求。编辑者审核；公开变化生成新 Edition 或 Withdrawal。

## 4. 内容生命周期

```text
Captured
  -> Transcribed
  -> EditorialReview
  -> ParticipantReview
  -> Approved
  -> Published
  -> Superseded | Withdrawn
```

- `Captured` 后立即生成 Source Record 与证据哈希。
- `Editorial Draft` 可修改，不对外公开。
- `ParticipantReview` 固定待确认快照，避免确认后内容偷换。
- `Approved` 必须存在有效 Consent Grant 与审核人。
- `Published` 首次分配 Archive Number；号码永不复用。
- 更正从当前 Edition 派生新草稿；发布后旧 Edition 变为 `Superseded`。
- `Withdrawn` 立即从搜索、Drift、索引和公开页移除；只留不含个人信息的墓碑。

公开状态与编辑状态分开：

- `Public`：索引、搜索、Drift 可见。
- `Unlisted`：持链接可见，不进入搜索与 Drift。
- `Embargoed`：到指定时间前仅编辑者可见。
- `Withdrawn`：正文不可见。

## 5. 领域与数据模型

### `people`

- `id` UUID，内部主键
- `slug`，稳定公开路径
- `display_name`
- `identity_mode`: `real_name | pseudonym | anonymous`
- `bio`
- `status`: `active | merged | restricted`
- `created_at`, `updated_at`

### `interviews`

- `id` UUID
- `archive_number`，首次出版时生成，唯一
- `person_id`
- `title`
- `conducted_at`, `ended_at`, `timezone`
- `language`
- `editorial_state`, `visibility`
- `current_edition_id`
- `created_at`, `updated_at`

### `source_records`

- `id`, `interview_id`
- `platform`: `douyin | direct | other`
- `external_id`, `canonical_url`
- `source_published_at`, `captured_at`
- `caption_snapshot`, `metadata_snapshot` JSONB
- `evidence_manifest_hash`

`platform + external_id` 唯一，保证重复导入幂等。

### `source_evidence`

- `id`, `source_record_id`
- `kind`: `screenshot | export | image | audio | video | text`
- `object_key`, `sha256`, `mime_type`, `byte_size`
- `captured_at`, `access_class`, `retention_until`

### `message_units`

- `id`, `interview_id`
- `sequence`，同 Interview 唯一
- `kind`: `question | answer | image | pause | note | section`
- `speaker_role`: `interviewer | participant | editor | system`
- `body` JSONB
- `occurred_at`, `duration_seconds`
- `parent_unit_id`，追问或引用来源
- `source_locator`，指向证据位置
- `editorial_status`

### `published_editions`

- `id`, `interview_id`
- `edition_number`，同 Interview 单调递增
- `snapshot` JSONB，完整不可变出版快照
- `change_summary`
- `approved_by`, `published_by`
- `consent_grant_id`
- `published_at`, `supersedes_id`, `content_hash`

公开渲染只读 `snapshot`，不直接读取可变 Draft。

### `assets`

- `id`, `interview_id`
- `object_key`, `public_variant_key`
- `kind`, `mime_type`, `width`, `height`, `duration`
- `alt_text`, `credit`, `rights_scope`, `sha256`

原件私有；公开变体去 EXIF、转码、压缩、必要时打码。

### `consent_grants`

- `id`, `person_id`, `interview_id`
- `scope` JSONB：文字、图片、原昵称、抖音回链、长期保存等
- `evidence_object_key`
- `granted_at`, `expires_at`, `revoked_at`
- `policy_version`

### `redactions`

- `id`, `interview_id`, `edition_id`
- `target_locator`, `reason_code`, `public_explanation`
- `created_by`, `created_at`

### `correction_requests`

- `id`, `interview_id`, `requester_contact`, `requester_role`
- `kind`, `description`, `evidence`
- `status`, `resolution`, `assigned_to`
- `created_at`, `resolved_at`

### `topics`、`interview_topics`

Topic 由编辑维护；Interview 与 Topic 多对多。Topic 不成为人物身份标签。

### `audit_events`

Append-only。保存 actor、action、target、reason、before_hash、after_hash、timestamp；payload 不重复保存不必要的个人信息。

### 关键约束

- Archive Number 属于 Interview，不属于 Person Record 或 Edition。
- Published Edition 发布后禁止更新 snapshot；只能创建下一 Edition。
- Draft 与 Published Edition 分表，阻断误发布和静默修改。
- Withdrawal 是一等状态，不用删除 Interview 模拟。
- Person 合并保留 alias 与审计记录；拆分必须可恢复。
- Source Evidence 和 Public Asset 使用不同存储前缀与访问策略。

## 6. 系统形态

采用 **TypeScript modular monolith**，不拆微服务。

```text
Browser
  |
CDN / WAF
  |
Web Application
  |-- Public Web
  |-- Editorial Workbench
  |-- HTTP Interface
  |
Application Modules
  |-- Identity
  |-- Ingestion
  |-- Editorial
  |-- Publication
  |-- Discovery
  |-- Governance
  |-- Audit
  |
  |-- PostgreSQL
  |-- S3-compatible Object Storage
  |-- Search Index
  `-- Job Worker
```

### 6.1 技术选型

- Web：Next.js、React、TypeScript。
- UI：服务端渲染优先；少量交互岛；移动端优先。
- 数据库：PostgreSQL，唯一事务事实来源。
- 数据访问：轻量类型安全 SQL 层与显式迁移；领域规则不放进 ORM hooks。
- 文件：S3-compatible object storage；原件私有，公开变体经 CDN。
- 搜索：独立全文索引；索引是 PostgreSQL 可重建投影，不承载事实。
- 后台任务：PostgreSQL job table + 独立 worker；不引入 Kafka。
- 登录：仅编辑工作台需要 OIDC；公共阅读无需账号。
- OCR/转录、邮件：供应商 Adapter；可替换。
- 部署：容器化 Web 与 Worker；托管 PostgreSQL、对象存储、CDN/WAF。

### 6.2 模块接口

```ts
// Identity
resolvePerson(candidate): PersonResolution
mergePeople(primaryId, duplicateId, reason): MergeResult
changePresentation(personId, presentation): PersonRecord

// Ingestion
captureSource(input): CaptureResult
transcribe(sourceRecordId): DraftResult

// Editorial
editInterview(command): EditorialDraft
requestParticipantReview(interviewId): ReviewPackage
approveInterview(interviewId, consentGrant): ApprovalResult

// Publication
publish(interviewId): PublishedEdition
revise(interviewId, changeSet): PublishedEdition
withdraw(interviewId, reason): WithdrawalResult

// Discovery
drift(exclusions): ArchiveSummary
search(query, filters, cursor): SearchPage
browse(facet, cursor): ArchivePage

// Governance
submitCorrection(request): CorrectionRequest
resolveCorrection(id, decision): Resolution
applyRedaction(command): PublishedEdition

// Audit
record(event): void
history(target): AuditTrail
verify(target): IntegrityResult
```

各 Module 隐藏状态机与持久化细节。路由只调用 Module interface，不能直接操作数据库。

### 6.3 依赖方向

```text
Identity <--- Editorial <--- Ingestion
   ^            |
   |            v
Governance ---> Publication ---> Public Projection ---> Discovery/Search
                     |
                     v
                   Audit
```

- Module 通过命令、查询结果与 domain event 交互，不跨模块改表。
- 公共页面只读取 Publication 生成的 projection。
- 搜索、sitemap、缓存通过 transactional outbox 异步更新。
- 同一进程内部调用；只有 OCR、对象存储、搜索、邮件存在 Adapter seam。

## 7. 发布与投影

`publish()` 单事务完成：

1. 校验状态、Consent Grant、审核与素材权利。
2. 分配或复用 Archive Number。
3. 从批准 Draft 生成不可变 Edition snapshot。
4. 生成 Story、Conversation、Record 所需结构。
5. 更新 `current_edition_id`。
6. 写 Audit Event 与 Outbox Event。

Worker 消费 Outbox Event，更新搜索索引、清理缓存、更新 sitemap/feed、生成图片公开变体、发送通知。失败可重试；幂等键为 `event_id + handler_name`。搜索或通知失败不回滚已完成出版。

## 8. Drift 算法

每个可公开 Interview 保存稳定索引字段 `random_key`。

1. 请求生成随机值 `r`。
2. 查询 `random_key >= r` 的首条合格记录。
3. 无结果则从最小键回绕。
4. 排除当前会话最近见过的 Archive Number。
5. 只从 `Public + current edition + drift eligible` 集合抽取。

不执行大表 `ORDER BY random()`；不读取浏览量、点赞或用户画像。

## 9. 搜索与索引

搜索文档只含 Archive Number、Participant 公开展示名、当前 Edition 公开文本、Interview 日期、Topic、公开 Editorial Note。

索引不含 Source Evidence、联系信息、Consent Evidence、已遮蔽文本。Withdrawal 产生最高优先级删除索引任务；公共读取同时检查 PostgreSQL 当前状态，防止索引延迟泄露。

## 10. 权限与安全

角色：

- `Contributor`：创建 Source Record 与 Draft。
- `Editor`：编辑内容、发起确认。
- `Reviewer`：批准出版、处理一般更正。
- `PrivacyOfficer`：处理 Redaction、Withdrawal 与证据访问。
- `Administrator`：账号与系统配置；默认没有查看全部证据的业务必要性。

控制：

- 工作台强制 MFA、短会话、设备与登录审计。
- Source Evidence 使用私有 bucket、短时签名 URL、最小权限。
- 上传文件校验 MIME、大小、病毒；图片去 EXIF；公开变体独立生成。
- 敏感操作要求原因；出版、撤回、身份合并采用双人复核。
- 联系信息独立加密；日志禁止记录正文、token、签名 URL。
- CSRF、速率限制、CSP、输出编码、参数化 SQL。
- 数据库加密备份；定期恢复演练。

## 11. 隐私、同意与保留

- Consent Grant 精确到 Interview 与素材类型，不使用永久全包授权。
- 受访者确认固定 Review Package，不是持续变化的 Draft。
- 未成年人、第三方隐私、医疗、住址、联系方式进入增强审核。
- 撤回后立即停止公开；证据保留或销毁按授权、争议状态与适用规则执行。
- 确需彻底删除时允许 hard delete；审计只留无个人信息的动作证明。
- Analytics 默认无跨站跟踪，不建立人物或读者画像。
- 抖音评论不抓取入库；引用时作为新材料单独授权。

## 12. HTTP Interface

```text
GET  /api/v1/drift
GET  /api/v1/archives/{archiveNumber}
GET  /api/v1/people/{slug}
GET  /api/v1/topics/{slug}
GET  /api/v1/years/{year}
GET  /api/v1/search?q=&topic=&year=&cursor=
POST /api/v1/correction-requests

POST  /api/admin/source-records
POST  /api/admin/source-records/{id}/transcribe
PATCH /api/admin/interviews/{id}/draft
POST  /api/admin/interviews/{id}/participant-review
POST  /api/admin/interviews/{id}/approve
POST  /api/admin/interviews/{id}/publish
POST  /api/admin/interviews/{id}/revise
POST  /api/admin/interviews/{id}/redact
POST  /api/admin/interviews/{id}/withdraw
POST  /api/admin/people/{id}/merge
```

命令接受 idempotency key。并发编辑使用 optimistic concurrency token；冲突必须显式解决。

## 13. 仓库结构

```text
apps/
  web/                    # 公共网站与编辑工作台
  worker/                 # OCR、媒体、索引、通知任务
packages/
  domain/                 # 实体、值对象、状态机、策略
  identity/               # Identity Module
  ingestion/              # Ingestion Module
  editorial/              # Editorial Module
  publication/            # Publication Module
  discovery/              # Discovery Module
  governance/             # Governance Module
  audit/                  # Audit Module
  database/               # schema、migration、transaction adapters
  object-storage/         # S3 adapters
  search/                 # search adapters
  ui/                     # design tokens、共享 UI
docs/
  adr/                    # 难逆转决策
  policies/               # 同意、编辑、隐私、撤回规则
CONTEXT.md                 # 统一语言
```

每个 Module 暴露一个小 Interface；公共 Web 不依赖 Ingestion 或 Editorial implementation。

## 14. 缓存与一致性

- Interview 公共页按 `archiveNumber + editionNumber` 缓存；Edition URL 内容永久稳定。
- canonical URL 指向当前 Edition；发布新 Edition 时主动失效。
- Drift 与搜索允许秒级最终一致，但每次返回前校验 visibility。
- Source Evidence、Consent Grant、Correction Request 强一致读取。
- 使用 PostgreSQL transaction + outbox，不做跨系统分布式事务。

## 15. 可用性与无障碍

- 公共页面 SSR；关闭 JavaScript 后核心正文仍可阅读。
- WCAG 2.2 AA；键盘可操作、清晰焦点、语义标题、图片 alt、视频字幕。
- 正文窄栏、低刺激动效、大量留白；支持系统减少动态效果。
- Story、Conversation、Record 使用 URL 状态，刷新与分享后保持视图。
- 图片懒加载；首屏不加载原始大图；中文排版控制行宽与标点挤压。

## 16. 可观测性与运维

监控公共错误率与延迟、Drift 空结果与重复率、发布任务与索引延迟、OCR 失败率、Withdrawal 下线耗时、对象存储异常、管理员敏感操作。告警不携带采访正文。使用 correlation ID 串联 HTTP、job 与 outbox event。

- PostgreSQL 自动备份与时间点恢复。
- Object Storage 开启版本与生命周期策略。
- 搜索索引不备份，随时从 PostgreSQL 重建。
- 定期执行数据库、对象与完整 Interview 恢复演练。

## 17. 测试策略

- Domain：状态机、编号、Edition 不可变、Consent、Withdrawal、人物合并。
- Module interface：真实 PostgreSQL 测试关键事务，不模拟领域规则。
- Adapter contract：对象存储、搜索、OCR、通知使用同一契约测试。
- Integration：导入到发布、修订、遮蔽、撤回、索引删除全链路。
- Authorization：每个后台命令覆盖允许与拒绝矩阵。
- Public rendering：三投影、无 JavaScript、无障碍、视觉回归。
- Privacy regression：公开响应、日志、搜索文档不含受限字段。
- Recovery：数据库恢复、对象恢复、搜索重建。

## 18. 明确不做

- 不做点赞、粉丝、排行、热门、个性化推荐。
- 不复制抖音评论区。
- 不允许公众直接改写正式档案。
- 不把聊天截图当成唯一公开阅读形式。
- 不让 AI 自动发布、自动授权、自动合并人物。
- 不用区块链证明“不可篡改”；Edition、哈希、审计与备份足够。
- 不拆微服务；规模或团队边界真实出现后再从 Module seam 拆分。
- 不让搜索索引、CDN 或抖音成为事实来源。

## 19. 完整验收标准

1. 真实采访可从 Source Evidence 生成结构化 Draft。
2. 受访者确认固定内容与授权范围后才能发布。
3. 一个 Published Edition 稳定生成 Story、Conversation、Record。
4. 更正生成新 Edition，旧 Edition 不被静默覆盖。
5. Withdrawal 后公共页、Drift、搜索、索引、sitemap 均不再泄露正文。
6. Drift 不依赖热度或画像，档案规模增长后仍保持索引查询。
7. Person Record 可承载多年多次 Interview，不变成人物社交主页。
8. 搜索索引可从 PostgreSQL 完整重建。
9. Source Evidence 永不通过公共接口或公共对象 URL 暴露。
10. 恢复演练能够恢复完整 Interview 及其 Edition 历史。

最终形态：**抖音保存相遇现场，Project.BeenHere 保存可被长期理解、验证、修订与尊重的记录。**
