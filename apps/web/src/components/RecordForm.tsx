import { ArrowLeftRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { parsePastedConversation } from "../lib/conversation";
import type { InterviewMessage, RecordDraft, SourceType } from "../types";

const emptyMessage = (speakerRole: InterviewMessage["speakerRole"]): InterviewMessage => ({ speakerRole, body: "" });

export function emptyDraft(): RecordDraft {
  return {
    participant: { displayName: "", identityMode: "pseudonym" },
    conductedAt: new Date().toISOString(),
    messages: [emptyMessage("interviewer"), emptyMessage("participant")],
    source: { sourceType: "douyin", platformName: "抖音" },
  };
}

export function RecordForm({ initial, submitLabel, busy, onSubmit }: { initial?: RecordDraft; submitLabel: string; busy?: boolean; onSubmit: (draft: RecordDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<RecordDraft>(initial ?? emptyDraft());
  const [pasted, setPasted] = useState("");
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  function updateMessage(index: number, patch: Partial<InterviewMessage>) {
    setDraft((current) => ({ ...current, messages: current.messages.map((message, currentIndex) => currentIndex === index ? { ...message, ...patch } : message) }));
  }

  function importConversation() {
    const messages = parsePastedConversation(pasted);
    if (!messages.length) {
      setParseNotice("请先粘贴采访对话。");
      return;
    }
    setDraft((current) => ({ ...current, messages }));
    setParseNotice(`已识别 ${messages.length} 条消息，请检查双方归属。`);
  }

  function swapRoles() {
    setDraft((current) => ({
      ...current,
      messages: current.messages.map((message) => ({ ...message, speakerRole: message.speakerRole === "interviewer" ? "participant" : "interviewer" })),
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      ...draft,
      participant: { ...draft.participant, displayName: draft.participant.displayName.trim() },
      messages: draft.messages.map((message) => ({ ...message, body: message.body.trim() })).filter((message) => message.body),
      source: {
        ...draft.source,
        platformName: draft.source.platformName?.trim() || undefined,
        canonicalUrl: draft.source.canonicalUrl?.trim() || undefined,
      },
    });
  }

  return <form onSubmit={submit} className="space-y-8">
    <fieldset className="paper-card space-y-5 p-5 tablet:p-8">
      <legend className="record-label px-2 text-seal">01 · 粘贴采访对话</legend>
      <p className="text-sm leading-7 text-ink-muted">支持“我：…”与“对方：…”格式；没有角色标记时，将按采访者、被采访者交替识别。</p>
      <textarea className="field min-h-44" value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder={'我：你最近在想什么？\n对方：想去一个没有去过的地方。'} aria-label="粘贴采访对话" />
      <button type="button" className="button-secondary" onClick={importConversation}><Sparkles size={16} />识别为消息气泡</button>
      {parseNotice && <p className="text-sm text-ink-muted" role="status">{parseNotice}</p>}
    </fieldset>

    <fieldset className="paper-card space-y-5 p-5 tablet:p-8">
      <legend className="record-label px-2 text-seal">02 · 检查消息归属</legend>
      <div className="flex justify-end">
        <button type="button" className="button-secondary" onClick={swapRoles}><ArrowLeftRight size={16} />交换双方</button>
      </div>
      {draft.messages.map((message, index) => <div key={index} className={`grid gap-3 border-b border-line pb-5 tablet:grid-cols-[130px_1fr_44px] ${message.speakerRole === "participant" ? "tablet:pl-16" : "tablet:pr-16"}`}>
        <button type="button" className="field min-h-11 text-left" onClick={() => updateMessage(index, { speakerRole: message.speakerRole === "interviewer" ? "participant" : "interviewer" })} aria-label={`切换第 ${index + 1} 条消息的发言者`}>
          {message.speakerRole === "interviewer" ? "采访者" : "被采访者"}
        </button>
        <textarea aria-label={`第 ${index + 1} 条消息内容`} className="field min-h-20" required value={message.body} onChange={(event) => updateMessage(index, { body: event.target.value })} />
        <button type="button" className="grid size-11 place-items-center text-ink-muted hover:text-danger" onClick={() => setDraft({ ...draft, messages: draft.messages.filter((_, currentIndex) => currentIndex !== index) })} aria-label="删除消息"><Trash2 size={17} /></button>
      </div>)}
      <button type="button" className="button-secondary" onClick={() => setDraft({ ...draft, messages: [...draft.messages, emptyMessage(draft.messages.at(-1)?.speakerRole === "interviewer" ? "participant" : "interviewer")] })}><Plus size={16} />添加消息</button>
    </fieldset>

    <fieldset className="paper-card grid gap-6 p-5 tablet:grid-cols-2 tablet:p-8">
      <legend className="record-label px-2 text-seal">03 · 最少公开信息</legend>
      <div><label className="field-label" htmlFor="displayName">被采访者显示名</label><input id="displayName" className="field" required maxLength={80} value={draft.participant.displayName} onChange={(event) => setDraft({ ...draft, participant: { ...draft.participant, displayName: event.target.value } })} placeholder="可以是真名、化名或匿名称呼" /></div>
      <div><label className="field-label" htmlFor="identityMode">身份呈现</label><select id="identityMode" className="field" value={draft.participant.identityMode} onChange={(event) => setDraft({ ...draft, participant: { ...draft.participant, identityMode: event.target.value as RecordDraft["participant"]["identityMode"] } })}><option value="pseudonym">化名</option><option value="real_name">真实姓名</option><option value="anonymous">匿名</option></select></div>
      <div><label className="field-label" htmlFor="conductedAt">发生时间</label><input id="conductedAt" type="datetime-local" className="field" required value={draft.conductedAt.slice(0, 16)} onChange={(event) => event.target.value && setDraft({ ...draft, conductedAt: new Date(event.target.value).toISOString() })} /></div>
      <div><label className="field-label" htmlFor="sourceType">来源</label><select id="sourceType" className="field" value={draft.source.sourceType} onChange={(event) => { const sourceType = event.target.value as SourceType; const platformName = sourceType === "douyin" ? "抖音" : sourceType === "direct" ? "来过" : sourceType === "in_person" ? "线下" : ""; setDraft({ ...draft, source: { ...draft.source, sourceType, platformName } }); }}><option value="douyin">抖音</option><option value="social_media">其他社交媒体</option><option value="in_person">线下采访</option><option value="direct">本站直接采访</option><option value="other">其他</option></select></div>
      <div><label className="field-label" htmlFor="platformName">平台名称（可选）</label><input id="platformName" className="field" maxLength={80} value={draft.source.platformName ?? ""} onChange={(event) => setDraft({ ...draft, source: { ...draft.source, platformName: event.target.value } })} /></div>
      <div><label className="field-label" htmlFor="canonicalUrl">原始公开链接（可选）</label><input id="canonicalUrl" type="url" className="field" value={draft.source.canonicalUrl ?? ""} onChange={(event) => setDraft({ ...draft, source: { ...draft.source, canonicalUrl: event.target.value } })} /></div>
    </fieldset>

    <button disabled={busy} className="button-primary w-full sm:w-auto sm:min-w-56">{busy ? "正在保存…" : submitLabel}</button>
  </form>;
}
