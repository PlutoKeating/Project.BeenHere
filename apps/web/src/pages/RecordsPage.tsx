import { RecordCard } from "../components/RecordCard";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function RecordsPage() {
  const { data, error, loading } = useApi(api.records);
  return <section className="page-shell py-14 tablet:py-20">
    <div className="grid gap-8 border-b border-line pb-10 tablet:grid-cols-12 tablet:items-end"><div className="tablet:col-span-7"><p className="record-label text-blueprint">ALL INTERVIEW RECORDS</p><h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight tablet:text-6xl">全部采访记录</h1></div><p className="max-w-md text-sm leading-7 text-ink-muted tablet:col-span-5">每次陌生人之间真实发生的对话，都用相同规格被认真呈现。编号不代表价值与重要程度。</p></div>
    <div className="pt-10">{loading && <LoadingState/>}{error && <ErrorState message={error}/>} {data && data.length > 0 && <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">{data.map((record) => <RecordCard key={record.id} record={record}/>)}</div>}{data?.length === 0 && <p className="py-20 text-center font-serif text-ink-muted">第一条采访记录正在路上。</p>}</div>
  </section>;
}
