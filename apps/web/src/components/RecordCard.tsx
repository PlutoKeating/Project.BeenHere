import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { InterviewRecordSummary } from "../types";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" });
export function RecordCard({ record }: { record: InterviewRecordSummary }) {
  return <article className="paper-card group flex min-h-72 flex-col p-5 transition-transform duration-200 hover:-translate-y-1 tablet:p-6">
    <div className="flex items-start justify-between gap-4">
      <div><p className="record-label text-blueprint">{record.recordNumber}</p><p className="mt-1 font-mono text-[11px] text-ink-muted">{dateFormatter.format(new Date(record.conductedAt))}</p></div>
      <span className="rounded-full border border-seal/40 px-2 py-1 text-[10px] text-seal">采访记录</span>
    </div>
    <p className="mt-8 text-xs text-ink-muted">{record.displayName}</p>
    <h2 className="mt-2 font-serif text-[1.4rem] font-semibold leading-snug">{record.title}</h2>
    <p className="mt-4 line-clamp-3 text-sm leading-7 text-ink-muted">{record.excerpt}</p>
    <div className="mt-auto flex items-end justify-between gap-4 pt-8">
      <div className="flex flex-wrap gap-2 text-xs text-blueprint">{record.topics.map((topic) => <span key={topic.slug}>#{topic.name}</span>)}</div>
      <Link to={`/records/${record.recordNumber}`} className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong transition-colors hover:bg-strong hover:text-inverse" aria-label={`阅读 ${record.title}`}><ArrowUpRight size={17} /></Link>
    </div>
  </article>;
}
