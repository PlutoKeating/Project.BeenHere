import { useParams } from "react-router-dom";
import { ArchiveCard } from "../components/ArchiveCard";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function TopicPage() {
  const { slug = "" } = useParams();
  const { data, error, loading } = useApi(() => api.topic(slug), [slug]);
  if (loading) return <div className="page-shell py-20"><LoadingState /></div>;
  if (error || !data) return <div className="page-shell py-20"><ErrorState message={error ?? "话题不存在。"} /></div>;
  return (
    <section className="page-shell py-14 tablet:py-20">
      <header className="reading-column text-center">
        <p className="archive-label text-blueprint">TOPIC / {data.topic.slug}</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tablet:text-6xl">{data.topic.name}</h1>
        <p className="mx-auto mt-6 max-w-xl font-serif leading-8 text-ink-muted">{data.topic.description}</p>
      </header>
      <div className="mt-14 grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">{data.interviews.map((archive) => <ArchiveCard key={archive.id} archive={archive} />)}</div>
    </section>
  );
}
