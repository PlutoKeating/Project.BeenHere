import { ExternalLink, RefreshCw, UserRoundCheck } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { RecordMark } from "../components/RecordMark";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

type Projection = "story" | "conversation" | "record";
const projections: Array<{ value: Projection; label: string; zh: string }> = [{value:"story",label:"STORY",zh:"故事"},{value:"conversation",label:"CONVERSATION",zh:"对话"},{value:"record",label:"RECORD",zh:"记录信息"}];
export function RecordPage() {
  const { recordNumber = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const requested = params.get("view");
  const projection: Projection = requested === "conversation" || requested === "record" ? requested : "story";
  const { data, error, loading } = useApi(() => api.record(recordNumber), [recordNumber]);
  if (loading) return <div className="page-shell py-20"><LoadingState/></div>;
  if (error || !data) return <div className="page-shell py-20"><ErrorState message={error ?? "采访记录不存在。"}/></div>;
  return <article className="pb-12">
    <header className="border-b border-line bg-subtle/45"><div className="page-shell grid gap-10 py-12 tablet:grid-cols-12 tablet:py-16"><div className="tablet:col-span-9"><p className="record-label text-blueprint">{data.recordNumber} · VERSION {data.edition.number}</p><h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-tight tablet:text-6xl">{data.title}</h1><div className="mt-7 flex flex-wrap gap-3 text-sm text-ink-muted"><Link to={`/people/${data.personSlug}`} className="text-blueprint hover:underline">{data.displayName}</Link><span>·</span><time dateTime={data.conductedAt}>{new Date(data.conductedAt).toLocaleDateString("zh-CN")}</time><span>·</span><span>{data.units.length} 个对话单元</span></div></div><div className="flex justify-end tablet:col-span-3"><RecordMark>来过</RecordMark></div></div></header>
    <div className="sticky top-16 z-30 border-b border-line bg-canvas/95 backdrop-blur"><div className="reading-column flex overflow-x-auto px-5 tablet:px-0" role="tablist">{projections.map(item => <button key={item.value} role="tab" aria-selected={projection===item.value} onClick={() => setParams(item.value === "story" ? {} : {view:item.value},{replace:true})} className={`min-h-14 flex-1 border-x border-line px-5 text-left ${projection===item.value?"bg-strong text-inverse":"bg-canvas text-ink-muted"}`}><span className="record-label block">{item.label}</span><span className="text-[10px]">{item.zh}</span></button>)}</div></div>
    <div className="reading-column px-5 py-14 tablet:px-0 tablet:py-20">
      {projection === "story" && <section><p className="mb-10 border-l-2 border-seal pl-5 font-serif text-lg leading-9 text-ink-muted">{data.excerpt}</p><div className="space-y-8">{data.story.map((paragraph,index)=><p key={index} className="font-serif text-[1.08rem] leading-[2.05]">{paragraph}</p>)}</div></section>}
      {projection === "conversation" && <ol className="space-y-7">{data.units.map(unit => <li key={unit.id} className={`grid gap-2 ${unit.speakerRole==="participant"?"pl-8 tablet:pl-20":"pr-8 tablet:pr-20"}`}><span className="record-label text-blueprint">{unit.speakerRole === "participant" ? data.displayName : unit.speakerRole === "interviewer" ? "采访者" : "记录说明"}</span><p className="paper-card px-5 py-4 font-serif leading-8">{unit.body}</p></li>)}</ol>}
      {projection === "record" && <section className="space-y-9"><h2 className="font-serif text-2xl font-semibold">记录信息</h2><dl className="divide-y divide-line border-y border-line">{[["Record Number",data.recordNumber],["Version",String(data.edition.number)],["Published At",new Date(data.edition.publishedAt).toLocaleString("zh-CN")],["Change Summary",data.edition.changeSummary],["Content Hash",data.edition.contentHash]].map(([term,value])=><div key={term} className="grid gap-2 py-4 tablet:grid-cols-[180px_1fr]"><dt className="record-label text-ink-muted">{term}</dt><dd className="break-all text-sm">{value}</dd></div>)}</dl><div><h3 className="record-label text-blueprint">RECORD NOTE</h3><p className="mt-4 font-serif leading-8">{data.recordNote}</p></div>{data.source?.canonicalUrl && <a href={data.source.canonicalUrl} rel="noreferrer" target="_blank" className="button-secondary"><ExternalLink size={15}/>查看原始对话现场</a>}</section>}
      <div className="mt-16 border-t border-line pt-8"><div className="flex flex-wrap gap-2">{data.topics.map(topic=><Link key={topic.slug} to={`/topics/${topic.slug}`} className="border border-line px-3 py-2 text-xs text-blueprint">#{topic.name}</Link>)}</div><div className="mt-10 grid gap-3 sm:grid-cols-3"><Link to="/drift" className="button-primary"><RefreshCw size={15}/>再遇见一位</Link><a href={`/studio/claim/${data.id}`} className="button-secondary" data-navigation="document"><UserRoundCheck size={15}/>我是被采访者</a><Link to={`/corrections?record=${data.recordNumber}`} className="button-secondary">更正或撤回</Link></div></div>
    </div>
  </article>;
}
