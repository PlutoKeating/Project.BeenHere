import { useParams } from "react-router-dom";
import { RecordCard } from "../components/RecordCard";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function YearPage() {
  const { year = "" } = useParams();
  const { data, error, loading } = useApi(() => api.year(year), [year]);
  return (
    <section className="page-shell py-14 tablet:py-20">
      <header className="border-b border-line pb-10">
        <p className="record-label text-blueprint">RECORDS BY YEAR</p>
        <h1 className="mt-3 font-mono text-6xl font-medium tracking-[-0.05em] tablet:text-8xl">{year}</h1>
        <p className="mt-5 max-w-lg font-serif leading-8 text-ink-muted">这一年，一些普通人在普通日子里留下的声音。</p>
      </header>
      <div className="pt-10">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {data && data.length > 0 && <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">{data.map((record) => <RecordCard key={record.id} record={record} />)}</div>}
        {data && data.length === 0 && <EmptyState title="这一年的架子还是空的" body="空白也属于采访记录网站。记录会在发生后抵达。" />}
      </div>
    </section>
  );
}
