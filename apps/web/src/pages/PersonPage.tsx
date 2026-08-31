import { useParams } from "react-router-dom";
import { ArchiveCard } from "../components/ArchiveCard";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function PersonPage() {
  const { slug = "" } = useParams();
  const { data, error, loading } = useApi(() => api.person(slug), [slug]);
  if (loading) return <div className="page-shell py-20"><LoadingState /></div>;
  if (error || !data) return <div className="page-shell py-20"><ErrorState message={error ?? "人物档案不存在。"} /></div>;
  return (
    <section className="page-shell py-14 tablet:py-20">
      <div className="grid gap-8 border-b border-line pb-12 tablet:grid-cols-12">
        <div className="tablet:col-span-8">
          <p className="archive-label text-blueprint">PERSON RECORD / {data.person.identityMode}</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold tablet:text-7xl">{data.person.displayName}</h1>
          <p className="mt-6 max-w-xl font-serif text-base leading-8 text-ink-muted">{data.person.bio}</p>
        </div>
        <div className="flex items-end tablet:col-span-4 tablet:justify-end"><p className="archive-label text-ink-muted">{data.interviews.length} INTERVIEW{data.interviews.length === 1 ? "" : "S"}</p></div>
      </div>
      <div className="grid gap-4 pt-10 tablet:grid-cols-2 lg:grid-cols-3">{data.interviews.map((archive) => <ArchiveCard key={archive.id} archive={archive} />)}</div>
    </section>
  );
}
