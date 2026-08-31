import { ArchiveCard } from "../components/ArchiveCard";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function ArchivesPage() {
  const { data, error, loading } = useApi(api.archives);
  return (
    <section className="page-shell py-14 tablet:py-20">
      <div className="grid gap-8 border-b border-line pb-10 tablet:grid-cols-12 tablet:items-end">
        <div className="tablet:col-span-7">
          <p className="archive-label text-blueprint">CATALOG / ALL RECORDS</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight tablet:text-6xl">档案索引</h1>
        </div>
        <p className="max-w-md text-sm leading-7 text-ink-muted tablet:col-span-5">每一份档案使用相同规格。这里按编号排列，不代表先后、价值或重要程度。</p>
      </div>
      <div className="pt-10">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {data && <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">{data.items.map((archive) => <ArchiveCard key={archive.id} archive={archive} />)}</div>}
      </div>
    </section>
  );
}
