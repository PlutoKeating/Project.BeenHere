import { ArrowRight, Compass, MessageCircleQuestion } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { RecordCard } from "../components/RecordCard";
import { RecordMark } from "../components/RecordMark";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function HomePage() {
  const navigate = useNavigate();
  const { data: meta } = useApi(api.meta);
  const { data: recordData, error, loading } = useApi(api.records);

  async function drift() {
    const record = await api.drift();
    navigate(`/records/${record.recordNumber}`);
  }

  return (
    <>
      <section className="page-shell grid min-h-[calc(100dvh-4rem)] items-center py-14 tablet:min-h-[calc(100dvh-5rem)] tablet:grid-cols-12 tablet:py-20">
        <div className="tablet:col-span-8 tablet:col-start-2">
          <p className="record-label text-blueprint">PUBLIC INTERVIEW RECORDS · EST. 2026</p>
          <h1 className="mt-8 max-w-4xl font-serif text-[clamp(2.8rem,9vw,7.5rem)] font-semibold leading-[1.03] tracking-[-0.045em]">
            今天，<br />你会遇见谁？
          </h1>
          <p className="mt-8 max-w-xl font-serif text-base leading-8 text-ink-muted tablet:text-lg tablet:leading-9">
            这里没有重要人物，只有被认真保存的普通时刻。打开一份采访记录，遇见一个本不会认识的人。
          </p>
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={drift} className="button-secondary">
              <Compass size={17} aria-hidden="true" />捡起一个漂流瓶
            </button>
            <Link to="/studio/interview" className="button-primary sm:min-w-56">
              <MessageCircleQuestion size={17} aria-hidden="true" />开始自动采访
            </Link>
          </div>
        </div>
        <div className="mt-14 flex justify-end tablet:col-span-2 tablet:mt-0 tablet:self-end tablet:pb-14">
          <RecordMark>来过</RecordMark>
        </div>
      </section>

      <section className="border-y border-line bg-subtle/55 py-10" aria-label="采访记录网站规模">
        <div className="page-shell grid grid-cols-1 gap-y-8 sm:grid-cols-3">
          {[
            [meta?.records ?? "—", "RECORDS", "份采访记录"],
            [meta?.people ?? "—", "PEOPLE", "个普通人"],
            [meta?.years ?? "—", "YEARS", "年的痕迹"],
          ].map(([value, label, description]) => (
            <div key={label} className="border-l border-line pl-4 tablet:pl-6">
              <p className="font-mono text-2xl font-medium tablet:text-3xl">{value}</p>
              <p className="record-label mt-2 text-ink-muted">{label}</p>
              <p className="mt-1 text-xs text-ink-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="today" className="page-shell py-20 tablet:py-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="record-label text-blueprint">FROM THE CATALOG</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tablet:text-4xl">最近公开</h2>
          </div>
          <a href="/records" className="hidden items-center gap-2 text-sm text-ink-muted hover:text-ink sm:flex">查看索引 <ArrowRight size={15} /></a>
        </div>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {recordData && <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">{recordData.slice(0, 3).map((record) => <RecordCard key={record.id} record={record} />)}</div>}
      </section>
    </>
  );
}
