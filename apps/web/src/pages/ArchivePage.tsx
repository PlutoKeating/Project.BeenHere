import { ExternalLink, RefreshCw } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArchiveSeal } from "../components/ArchiveSeal";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

type Projection = "story" | "conversation" | "record";
const projections: Array<{ value: Projection; label: string; zh: string }> = [
  { value: "story", label: "STORY", zh: "故事" },
  { value: "conversation", label: "CONVERSATION", zh: "对话" },
  { value: "record", label: "RECORD", zh: "档案" },
];

export function ArchivePage() {
  const { archiveNumber = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view");
  const projection: Projection = requested === "conversation" || requested === "record" ? requested : "story";
  const { data, error, loading } = useApi(() => api.archive(archiveNumber), [archiveNumber]);

  if (loading) return <div className="page-shell py-20"><LoadingState /></div>;
  if (error || !data) return <div className="page-shell py-20"><ErrorState message={error ?? "档案不存在。"} /></div>;

  return (
    <article className="pb-12">
      <header className="border-b border-line bg-subtle/45">
        <div className="page-shell grid gap-10 py-12 tablet:grid-cols-12 tablet:py-16">
          <div className="tablet:col-span-9">
            <p className="archive-label text-blueprint">{data.archiveNumber} · EDITION {data.edition.number}</p>
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-tight tracking-tight tablet:text-6xl">{data.title}</h1>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              <Link to={`/people/${data.personSlug}`} className="text-blueprint hover:underline">{data.displayName}</Link>
              <span aria-hidden="true">·</span>
              <time className="font-mono" dateTime={data.conductedAt}>{new Date(data.conductedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</time>
              <span aria-hidden="true">·</span>
              <span>{data.units.length} 个记录单元</span>
            </div>
          </div>
          <div className="flex items-start justify-end tablet:col-span-3"><ArchiveSeal>来过</ArchiveSeal></div>
        </div>
      </header>

      <div className="sticky top-16 z-30 border-b border-line bg-canvas/95 backdrop-blur tablet:top-20">
        <div className="page-shell overflow-x-auto">
          <div className="mx-auto flex min-w-max max-w-[720px]" role="tablist" aria-label="阅读方式">
            {projections.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={projection === item.value}
                onClick={() => setSearchParams(item.value === "story" ? {} : { view: item.value }, { replace: true })}
                className={`min-h-14 flex-1 border-x border-line px-5 text-left transition-colors first:border-r-0 last:border-l-0 ${projection === item.value ? "bg-strong text-inverse" : "bg-canvas text-ink-muted hover:text-ink"}`}
              >
                <span className="archive-label block">{item.label}</span>
                <span className="mt-0.5 block text-[10px] opacity-70">{item.zh}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="reading-column px-5 py-14 tablet:px-0 tablet:py-20">
        {projection === "story" && (
          <section aria-labelledby="story-heading">
            <h2 id="story-heading" className="sr-only">故事模式</h2>
            <p className="mb-10 border-l-2 border-seal pl-5 font-serif text-lg leading-9 text-ink-muted">{data.excerpt}</p>
            <div className="space-y-8">{data.story.map((paragraph, index) => <p key={index} className="font-serif text-[1.08rem] leading-[2.05] tracking-[0.015em] tablet:text-lg">{paragraph}</p>)}</div>
          </section>
        )}

        {projection === "conversation" && (
          <section aria-labelledby="conversation-heading">
            <h2 id="conversation-heading" className="sr-only">对话模式</h2>
            <ol className="space-y-7">
              {data.units.map((unit) => unit.kind === "pause" ? (
                <li key={unit.id} className="flex items-center gap-4 py-5 text-center font-serif text-sm italic text-ink-muted">
                  <span className="h-px flex-1 bg-line" /><span>{unit.body}</span><span className="h-px flex-1 bg-line" />
                </li>
              ) : (
                <li key={unit.id} className={`grid gap-2 ${unit.speakerRole === "participant" ? "pl-8 tablet:pl-20" : "pr-8 tablet:pr-20"}`}>
                  <div className="flex items-center gap-3">
                    <span className="archive-label text-blueprint">{unit.speakerRole === "participant" ? data.displayName : unit.speakerRole === "interviewer" ? "采访者" : "编辑记录"}</span>
                    {unit.occurredAt && <time className="font-mono text-[10px] text-ink-muted">{new Date(unit.occurredAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time>}
                  </div>
                  <p className="paper-card px-5 py-4 font-serif text-base leading-8">{unit.body}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {projection === "record" && (
          <section aria-labelledby="record-heading" className="space-y-10">
            <h2 id="record-heading" className="font-serif text-2xl font-semibold">保存记录</h2>
            <dl className="divide-y divide-line border-y border-line">
              {[
                ["Archive Number", data.archiveNumber],
                ["Published Edition", String(data.edition.number)],
                ["Published At", new Date(data.edition.publishedAt).toLocaleString("zh-CN")],
                ["Change Summary", data.edition.changeSummary],
                ["Content Hash", data.edition.contentHash],
              ].map(([term, value]) => <div key={term} className="grid gap-2 py-4 tablet:grid-cols-[180px_1fr]"><dt className="archive-label text-ink-muted">{term}</dt><dd className="break-all font-mono text-xs leading-6">{value}</dd></div>)}
            </dl>
            <div>
              <h3 className="archive-label text-blueprint">EDITORIAL NOTE</h3>
              <p className="mt-4 font-serif leading-8">{data.editorialNote}</p>
            </div>
            {data.source?.canonicalUrl && <a href={data.source.canonicalUrl} rel="noreferrer" target="_blank" className="button-secondary"><ExternalLink size={15} />查看 {data.source.platform} 现场</a>}
          </section>
        )}

        <div className="mt-16 border-t border-line pt-8">
          <div className="flex flex-wrap gap-2">{data.topics.map((topic) => <Link key={topic.slug} to={`/topics/${topic.slug}`} className="border border-line px-3 py-2 text-xs text-blueprint hover:bg-subtle">#{topic.name}</Link>)}</div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Link to="/drift" className="button-primary"><RefreshCw size={15} />再捡一个漂流瓶</Link>
            <Link to={`/corrections?archive=${data.archiveNumber}`} className="button-secondary">提交更正或撤回</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
