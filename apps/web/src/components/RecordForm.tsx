import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ConversationUnit, RecordDraft, SourceType } from "../types";

const emptyUnit = (sequence: number): ConversationUnit => ({ sequence, kind: sequence % 2 ? "question" : "answer", speakerRole: sequence % 2 ? "interviewer" : "participant", body: "", occurredAt: null, durationSeconds: null, parentUnitId: null });
function topicSlug(name: string): string {
  let hash = 2166136261;
  for (const char of name) { hash ^= char.codePointAt(0)!; hash = Math.imul(hash, 16777619); }
  const prefix = Array.from(name.toLowerCase()).slice(0, 8).map((char) => char.codePointAt(0)!.toString(36)).join("-");
  return `t-${prefix}-${(hash >>> 0).toString(36)}`;
}
export function emptyDraft(): RecordDraft { return { participant:{slug:"",displayName:"",identityMode:"pseudonym",bio:""},record:{title:"",excerpt:"",conductedAt:new Date().toISOString()},story:[""],recordNote:"原始对话由上传者整理，公开版本保留语义，不美化被采访者。",units:[emptyUnit(1),emptyUnit(2)],topics:[],source:{sourceType:"douyin",platformName:"抖音"} }; }

export function RecordForm({ initial, submitLabel, busy, onSubmit }: { initial?: RecordDraft; submitLabel: string; busy?: boolean; onSubmit: (draft: RecordDraft) => Promise<void> }) {
  const [draft,setDraft] = useState<RecordDraft>(initial ?? emptyDraft());
  const [topics,setTopics] = useState((initial?.topics ?? []).map(t=>t.name).join("，"));
  const updateUnit = (index:number, patch:Partial<ConversationUnit>) => setDraft(current => ({...current,units:current.units.map((unit,i)=>i===index?{...unit,...patch}:unit)}));
  async function submit(event:React.FormEvent) { event.preventDefault(); const cleaned:RecordDraft={...draft,participant:{...draft.participant,slug:draft.participant.slug.trim().toLowerCase()},story:draft.story.map(x=>x.trim()).filter(Boolean),units:draft.units.map((u,i)=>({...u,sequence:i+1,body:u.body.trim()})).filter(u=>u.body),topics:topics.split(/[，,]/).map(x=>x.trim()).filter(Boolean).map(name=>({name,slug:topicSlug(name)})),source:{...draft.source,platformName:draft.source.platformName?.trim()||undefined,externalId:draft.source.externalId?.trim()||undefined,canonicalUrl:draft.source.canonicalUrl?.trim()||undefined}}; await onSubmit(cleaned); }
  return <form onSubmit={submit} className="space-y-8">
    <fieldset className="paper-card grid gap-6 p-5 tablet:grid-cols-2 tablet:p-8"><legend className="record-label px-2 text-seal">01 · 被采访者</legend>
      <div><label className="field-label" htmlFor="displayName">公开显示名</label><input id="displayName" className="field" required maxLength={80} value={draft.participant.displayName} onChange={e=>setDraft({...draft,participant:{...draft.participant,displayName:e.target.value}})}/></div>
      <div><label className="field-label" htmlFor="slug">公开路径标识</label><input id="slug" className="field font-mono" required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="xiaolin" value={draft.participant.slug} onChange={e=>setDraft({...draft,participant:{...draft.participant,slug:e.target.value}})}/></div>
      <div><label className="field-label" htmlFor="identityMode">身份呈现</label><select id="identityMode" className="field" value={draft.participant.identityMode} onChange={e=>setDraft({...draft,participant:{...draft.participant,identityMode:e.target.value as RecordDraft["participant"]["identityMode"]}})}><option value="pseudonym">化名</option><option value="real_name">真实姓名</option><option value="anonymous">匿名</option></select></div>
      <div><label className="field-label" htmlFor="bio">简短背景</label><input id="bio" className="field" maxLength={500} value={draft.participant.bio} onChange={e=>setDraft({...draft,participant:{...draft.participant,bio:e.target.value}})}/></div>
    </fieldset>
    <fieldset className="paper-card grid gap-6 p-5 tablet:grid-cols-2 tablet:p-8"><legend className="record-label px-2 text-seal">02 · 采访与来源</legend>
      <div><label className="field-label" htmlFor="title">采访记录标题</label><input id="title" className="field" required maxLength={120} value={draft.record.title} onChange={e=>setDraft({...draft,record:{...draft.record,title:e.target.value}})}/></div>
      <div><label className="field-label" htmlFor="conductedAt">发生时间</label><input id="conductedAt" type="datetime-local" className="field" required value={draft.record.conductedAt.slice(0,16)} onChange={e=>setDraft({...draft,record:{...draft.record,conductedAt:new Date(e.target.value).toISOString()}})}/></div>
      <div className="tablet:col-span-2"><label className="field-label" htmlFor="excerpt">一句话摘要</label><textarea id="excerpt" className="field min-h-20" required maxLength={300} value={draft.record.excerpt} onChange={e=>setDraft({...draft,record:{...draft.record,excerpt:e.target.value}})}/></div>
      <div><label className="field-label" htmlFor="sourceType">录入方式</label><select id="sourceType" className="field" value={draft.source.sourceType} onChange={e=>setDraft({...draft,source:{...draft.source,sourceType:e.target.value as SourceType}})}><option value="douyin">抖音公开对话</option><option value="social_media">其他社交媒体</option><option value="in_person">线下面对面</option><option value="direct">线上直接采访</option><option value="other">其他形式</option></select></div>
      <div><label className="field-label" htmlFor="platformName">平台或场景</label><input id="platformName" className="field" maxLength={80} value={draft.source.platformName??""} onChange={e=>setDraft({...draft,source:{...draft.source,platformName:e.target.value}})}/></div>
      <div><label className="field-label" htmlFor="canonicalUrl">原始公开链接（可选）</label><input id="canonicalUrl" type="url" className="field" value={draft.source.canonicalUrl??""} onChange={e=>setDraft({...draft,source:{...draft.source,canonicalUrl:e.target.value}})}/></div>
      <div><label className="field-label" htmlFor="externalId">平台内容 ID（可选）</label><input id="externalId" className="field" maxLength={120} value={draft.source.externalId??""} onChange={e=>setDraft({...draft,source:{...draft.source,externalId:e.target.value}})}/></div>
    </fieldset>
    <fieldset className="paper-card space-y-5 p-5 tablet:p-8"><legend className="record-label px-2 text-seal">03 · 原始对话</legend>
      <p className="text-sm leading-7 text-ink-muted">按真实顺序录入，不强迫所有采访采用同一种媒介。图像或停顿也可以作为独立单元保存。</p>
      {draft.units.map((unit,index)=><div key={index} className="grid gap-3 border-b border-line pb-5 tablet:grid-cols-[140px_150px_1fr_44px]">
        <select aria-label={`第 ${index+1} 项发言者`} className="field" value={unit.speakerRole} onChange={e=>updateUnit(index,{speakerRole:e.target.value as ConversationUnit["speakerRole"]})}><option value="interviewer">采访者</option><option value="participant">被采访者</option><option value="recorder">记录说明</option><option value="system">系统信息</option></select>
        <select aria-label={`第 ${index+1} 项类型`} className="field" value={unit.kind} onChange={e=>updateUnit(index,{kind:e.target.value as ConversationUnit["kind"]})}><option value="question">提问</option><option value="answer">回答</option><option value="image">图片说明</option><option value="pause">停顿</option><option value="note">注记</option><option value="section">段落</option></select>
        <textarea aria-label={`第 ${index+1} 项内容`} className="field min-h-20" required value={unit.body} onChange={e=>updateUnit(index,{body:e.target.value})}/>
        <button type="button" className="grid size-11 place-items-center text-ink-muted hover:text-danger" onClick={()=>setDraft({...draft,units:draft.units.filter((_,i)=>i!==index)})} aria-label="删除对话单元"><Trash2 size={17}/></button>
      </div>)}
      <button type="button" className="button-secondary" onClick={()=>setDraft({...draft,units:[...draft.units,emptyUnit(draft.units.length+1)]})}><Plus size={16}/>添加对话单元</button>
    </fieldset>
    <fieldset className="paper-card space-y-6 p-5 tablet:p-8"><legend className="record-label px-2 text-seal">04 · 公开呈现</legend>
      <div><label className="field-label" htmlFor="story">故事视图（段落之间留空行）</label><textarea id="story" className="field min-h-48" required value={draft.story.join("\n\n")} onChange={e=>setDraft({...draft,story:e.target.value.split(/\n\s*\n/)})}/></div>
      <div><label className="field-label" htmlFor="recordNote">记录说明</label><textarea id="recordNote" className="field min-h-24" required maxLength={1000} value={draft.recordNote} onChange={e=>setDraft({...draft,recordNote:e.target.value})}/></div>
      <div><label className="field-label" htmlFor="topics">话题（逗号分隔）</label><input id="topics" className="field" value={topics} onChange={e=>setTopics(e.target.value)}/></div>
    </fieldset>
    <button disabled={busy} className="button-primary w-full sm:w-auto sm:min-w-56">{busy?"正在保存…":submitLabel}</button>
  </form>;
}
