# 来过自动采访系统

**状态**：第一版本地实现（2026-09-02）  
**入口**：登录后访问 `/studio/interview`  
**实现边界**：浏览器内确定性规则，不调用 LLM、Embedding、远程 NLP 或新增后端接口

## 1. 这个系统为什么存在

来过原有录入流程擅长保存已经发生的采访，但还不能帮助一个愿意表达的人开始说。自动采访的职责是提供一条温和、有限、随时可退出的提问路径，让普通人在没有专业采访者在场时，也能把此刻的生活说下来。

它不是批量生产“像真人”的私信内容，也不以骗过受访者为目标。页面必须明确说明对方是自动程序；程序不声称理解、感受或拥有亲身经历。人的表达是正文，机器提问只是支架。

## 2. ELIZA 源码调研

Joseph Weizenbaum 在 1966 年发表的 ELIZA 论文把会话行为拆成可替换脚本、关键词优先级、分解规则、重组规则、代词转换与无命中兜底。Charles Hayden 的经典 Java 实现忠实重现了论文所述程序和原始 DOCTOR script，具体执行顺序是：

1. `pre` 规则先统一输入表达，按句子切分；
2. 扫描命中的 `key`，由 `KeyStack` 按数值 `rank` 排序；
3. 对最高优先关键词下面的 `decomp` 按声明顺序尝试匹配；
4. `reasmb` 从捕获片段重组回复，`post` 规则在插值前转换人称；
5. `goto` 可将当前输入交给另一关键词规则处理；
6. 带 `$` 的分解规则把回复写进 `Mem`，没有即时匹配时再取出；
7. 最后才使用 `xnone` 兜底；同一分解下的普通重组规则循环使用，memory 规则随机选择。

恢复的 1965 年 MAD-SLIP 源码也呈现同一主干：扫描关键词、执行 decomposition、进行 reassembly，无命中时使用保持句。ELIZA 的价值不在于理解语言，而在于证明少量结构化映射足以让人向系统投射理解。

来过继承的是这种**可审计的会话结构**，不是“制造理解幻觉”的目标：

| 经典机制 | 来过第一版 | 选择理由 |
| --- | --- | --- |
| 固定 script | 六个从当下到留给读者的话的问题 | 让采访有稳定起承转合 |
| key rank | 普通话题显式 `rank`；现实危险、敏感、跳过在其前处理 | 多词命中时结果稳定且安全优先 |
| decomposition | 每条话题规则包含按序尝试的正则分解 | 只捕获用户确实说出的词 |
| reassembly | 纯函数把捕获词放回开放追问 | 回引原话但不声称理解 |
| goto | 回答追问后回到固定问题队列 | 话题不会无限深挖 |
| quit | 页面始终提供跳过和结束 | 退出不依赖猜测特定措辞 |
| xnone | 简短确认后进入下一题 | 不用万能反问掩盖无理解 |
| pre/post、synonym | 第一版不做 | 中文人称和同义改写误伤风险高，当前语料不足 |
| Mem 延迟回复 | 第一版不做 | 旧敏感内容可能在错误时机重现 |
| 轮换/随机重组 | 第一版不做 | 确定输出更便于测试、解释和安全审查 |
| DOCTOR 治疗师角色 | 明确不做 | 自动采访不是心理咨询，不复制治疗语境和施压式反问 |

受访者可能包含未成年人，因此设计还参考了 UNICEF 关于儿童相关 AI 与参与式资料收集的原则：安全、隐私、透明、可解释、同意/同意表达（assent）、退出和避免伤害必须贯穿整个流程，而不是在发布前补一个提示。

参考资料：

- 用户指定的 Charles Hayden 实现：[Eliza Test、完整 Java 源码与 script](http://chayden.net/eliza/Eliza.html)。
- Joseph Weizenbaum, [ELIZA—A Computer Program for the Study of Natural Language Communication Between Man and Machine](https://doi.org/10.1145/365153.365168), 1966。
- ELIZA Archaeology, [恢复的原始程序与核心循环](https://findingeliza.org/code.html)。
- UNICEF, [Guidance on AI and Children, Version 3.0](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children), 2025。
- UNICEF, [Policy on Ethics in Evidence Activities Involving People as Participants or Subjects](https://www.unicef.org/documents/policy-ethics-evidence-activities-involving-people-as-participants-subjects)。

## 3. 产品不变量

1. **明确自动化身份**：开始前和每条采访者消息都标记“自动提问”，不冒充真人。
2. **表达控制权属于受访者**：开始需要主动勾选知情说明；任何问题都可跳过；任何时刻都可结束。
3. **不伪造共情**：不使用“我也经历过”“主播也经常”等虚构亲身经验；只确认已经听到的内容，并准确回引原词。
4. **敏感内容不深挖**：命中敏感表达时不做语境追问，明确无需解释，并继续到下一题。
5. **现实危险优先于内容**：命中明确的自伤/轻生即时意图时停止采访，不提供保存入口，提示联系身边可信任的人、当地紧急服务或现实中的专业帮助。
6. **默认不保存、不公开**：进行中的对话只存在于 React 页面状态；刷新或离开页面即丢失。只有受访者主动进入整理页后，文本才成为待校对内容。
7. **继续复用现有治理链**：整理后的内容只能先保存为未公开 `RecordDraft`；公开仍需记录主人操作，并继续受版本、认领、更正、匿名与撤回机制约束。

## 4. 第一版用户流程

```text
账户中心
  → 开始自动采访
  → 阅读自动化、隐私与能力边界
  → 主动勾选并开始
  → 固定问题
      ├─ 普通回答 + 规则命中 → 最多一次语境追问 → 下一题
      ├─ 普通回答 + 无命中 → 简短确认 → 下一题
      ├─ 跳过 → 不写入虚构回答 → 下一题
      ├─ 敏感回答 → 不追问 + 归还控制权 → 下一题
      └─ 现实危险 → 立即停止 + 现实帮助提示，不提供整理入口
  → 正常结束或主动结束
  → 整理为未公开记录
  → 在既有 RecordForm 逐条修改/删除并补充最少信息
  → 主动保存未公开草稿
```

第一版的六个问题：

1. 最近在过怎样的日子；
2. 一件很小但仍记得的事；
3. 最近不容易的部分（明确可跳过）；
4. 察觉到的自身变化；
5. 对接下来的期待；
6. 希望偶然读到记录的人记住哪句话。

相比原草案，第一版不主动询问年龄、学校、精确位置等识别性更强且非完成采访所必需的信息，也不以“困境”作为采访中心。

## 5. 实现架构

### 5.1 模块与状态源

| 模块 | 职责 | 权威状态 |
| --- | --- | --- |
| `src/lib/automated-interview.ts` | 问题、rank、分解/重组、状态迁移、安全分支、`RecordDraft` 转换 | `AutomatedInterviewState` |
| `src/pages/AutomatedInterviewPage.tsx` | 知情开始、对话呈现、输入、跳过、结束和整理入口 | 页面 React state |
| `src/pages/IngestionPage.tsx` | 接收路由携带的自动采访草稿，进入现有校对表单 | `location.state` 仅作一次性交接 |
| `src/components/RecordForm.tsx` | 逐条校对、身份与来源补充、提交未公开记录 | 现有 `RecordDraft` |

依赖始终是：

```text
AutomatedInterviewPage
  → automated-interview（纯函数）
  → interviewToDraft
  → IngestionPage / RecordForm
  → 既有 api.createRecord
```

采访引擎不访问 `fetch`、D1、账户、WebSocket 或浏览器存储。第一版没有会话恢复，避免在未确认前形成隐藏持久化；代价是刷新会丢失当前回答，页面已明确告知。

### 5.2 状态模型

```ts
interface AutomatedInterviewState {
  phase: "active" | "complete";
  completionReason: "finished" | "stopped" | "safety" | null;
  startedAt: string;
  questionIndex: number;
  awaitingFollowUp: boolean;
  messages: InterviewMessage[];
}
```

`completionReason` 不是展示装饰：`interviewToDraft` 会拒绝尚未结束或因 `safety` 停止的状态，页面也不显示整理入口；只有 `finished` 与 `stopped` 允许进入人工整理。

### 5.3 规则优先级

每次输入按以下确定性顺序处理：

1. 空文本不改变状态；
2. 明确“跳过”不伪造被采访者消息，直接进入下一题；
3. 现实危险表达停止采访；
4. 其他敏感表达确认边界且不追问；
5. 当前固定问题尚未追问、且命中普通话题时，按 `rank` 选择规则，再按序尝试 decomposition 并 reassemble 一次开放追问；
6. 回答追问或未命中规则时，简短确认并进入下一题；
7. 固定提纲耗尽后正常结束。

所有规则和输出都是确定的，便于单元测试、审查和未来对规则版本做差异比较。

## 6. 页面与无障碍

- 移动端单列对话，桌面端只扩大阅读宽度，不改变消息顺序。
- 所有按钮沿用项目现有不小于 44px 的触控规格。
- 对话用有序列表表达；采访者与受访者都有文字角色标签，不只依赖颜色或左右位置。
- 最新自动提问通过 `aria-live="polite"` 单独播报，避免每次更新重复朗读整段历史。
- 文本框有可访问名称；Enter 发送、Shift+Enter 换行，同时保留可见发送按钮。
- 主题颜色全部使用现有语义 Token，兼容纸张和夜间主题；动效遵循全局 `prefers-reduced-motion`。

## 7. 第一版明确不做

- 不调用 LLM 改写措辞；
- 不做 Embedding 召回、分词、NER、画像槽位或情感分类；
- 不发送表情包，不模拟口头禅，不伪造第一人称经历；
- 不采集年龄、学校、精确地点；
- 不做匿名公开采访房间、实时匹配或 WebSocket 消息持久化；
- 不自动判断内容是否适合公开，不自动生成标题或摘要；
- 不自动保存恢复中的会话；
- 不把关键词规则描述成医学、心理或风险诊断。

这些能力只有在真实使用证据表明固定规则不足，并且隐私、可解释性、成本、失败降级与人工审查方案已经明确时才重新评估。尤其是 LLM，即使未来加入，也只能作为可关闭的措辞候选，不能接管提问策略、安全分支或公开决定。

## 8. 验收标准

- Given 用户未勾选知情说明，When 查看开始页，Then 开始按钮不可用。
- Given 正在采访，When 输入同时命中多个普通话题，Then 按显式 rank 选择最高优先规则。
- Given 正在采访，When 输入命中普通话题的回答，Then 系统最多追问一次并回到固定提纲。
- Given 用户选择跳过，When 状态推进，Then 正文中没有机器虚构的受访者回答。
- Given 回答包含敏感表达，When 系统处理，Then 不追问原因并再次说明可跳过或结束。
- Given 回答包含明确现实危险表达，When 系统处理，Then 采访停止、显示现实帮助提示且没有整理入口。
- Given 正常或主动结束，When 用户选择整理，Then 原对话进入现有 `RecordForm`，仍可逐条编辑且只可先保存为未公开记录。
- Given 用户没有选择整理，When 刷新或离开页面，Then 当前对话没有被写入服务端、D1 或浏览器持久存储。

## 9. 后续评估指标

在不收集进行中对话内容的前提下，第一版应先通过定性使用测试判断：提问是否容易理解、跳过与结束是否足够明显、追问是否经常答非所问、整理前是否能准确理解“尚未保存”。在明确新的数据告知和同意机制前，不增加隐式埋点。
