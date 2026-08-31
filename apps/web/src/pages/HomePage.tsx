import { ArrowDown, ArrowRight, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ArchiveCard } from "../components/ArchiveCard";
import { ArchiveSeal } from "../components/ArchiveSeal";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function HomePage() {
  const navigate = useNavigate();
  const { data: meta } = useApi(api.meta);
  const { data: archiveData, error, loading } = useApi(api.archives);

  async function drift() {
    const archive = await api.drift();
    navigate(`/archives/${archive.archiveNumber}`);
  }

  return (
    <>
      <section className="page-shell grid min-h-[calc(100dvh-4rem)] items-center py-14 tablet:min-h-[calc(100dvh-5rem)] tablet:grid-cols-12 tablet:py-20">
        <div className="tablet:col-span-8 tablet:col-start-2">
          <p className="archive-label text-blueprint">PUBLIC ARCHIVE · EST. 2026</p>
          <h1 className="mt-8 max-w-4xl font-serif text-[clamp(2.8rem,9vw,7.5rem)] font-semibold leading-[1.03] tracking-[-0.045em]">
            今天，<br />你会遇见谁？
          </h1>
          <p className="mt-8 max-w-xl font-serif text-base leading-8 text-ink-muted tablet:text-lg tablet:leading-9">
            这里没有重要人物，只有被认真保存的普通时刻。打开一份档案，遇见一个本不会认识的人。
          </p>
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={drift} className="button-primary sm:min-w-56">
              <Compass size={17} aria-hidden="true" />捡起一个漂流瓶
            </button>
            <a href="#today" className="button-secondary">
              看看档案馆 <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="mt-14 flex justify-end tablet:col-span-2 tablet:mt-0 tablet:self-end tablet:pb-14">
          <ArchiveSeal>来过</ArchiveSeal>
        </div>
      </section>

      <section className="border-y border-line bg-subtle/55 py-10" aria-label="档案馆规模">
        <div className="page-shell grid grid-cols-2 gap-y-8 tablet:grid-cols-4">
          {[
            [meta?.interviews ?? "—", "INTERVIEWS", "份采访"],
            [meta?.people ?? "—", "PEOPLE", "个普通人"],
            [meta?.topics ?? "—", "TOPICS", "个话题"],
            [meta?.years ?? "—", "YEARS", "年的痕迹"],
          ].map(([value, label, description]) => (
            <div key={label} className="border-l border-line pl-4 tablet:pl-6">
              <p className="font-mono text-2xl font-medium tablet:text-3xl">{value}</p>
              <p className="archive-label mt-2 text-ink-muted">{label}</p>
              <p className="mt-1 text-xs text-ink-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="today" className="page-shell py-20 tablet:py-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="archive-label text-blueprint">FROM THE CATALOG</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tablet:text-4xl">馆内一隅</h2>
          </div>
          <a href="/archives" className="hidden items-center gap-2 text-sm text-ink-muted hover:text-ink sm:flex">查看索引 <ArrowRight size={15} /></a>
        </div>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {archiveData && <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">{archiveData.items.slice(0, 3).map((archive) => <ArchiveCard key={archive.id} archive={archive} />)}</div>}
      </section>
    </>
  );
}
