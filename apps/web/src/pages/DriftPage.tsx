import { ArrowRight, Compass } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { RecordMark } from "../components/RecordMark";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function DriftPage() {
  const [seen, setSeen] = useState<string[]>(() => JSON.parse(sessionStorage.getItem("beenhere-seen") ?? "[]") as string[]);
  const [cycle, setCycle] = useState(0);
  const loader = useCallback(() => api.drift(seen), [seen]);
  const { data, error, loading } = useApi(loader, [cycle]);

  function driftAgain() {
    if (data) {
      const next = [...seen, data.recordNumber].slice(-12);
      setSeen(next);
      sessionStorage.setItem("beenhere-seen", JSON.stringify(next));
    }
    setCycle((value) => value + 1);
  }

  return (
    <section className="page-shell flex min-h-[calc(100dvh-4rem)] items-center py-12 tablet:min-h-[calc(100dvh-5rem)]">
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <p className="record-label text-blueprint">DRIFT / RANDOM ENCOUNTER</p>
          <h1 className="mt-4 font-serif text-3xl font-semibold tablet:text-5xl">一份采访记录漂到了这里</h1>
        </div>
        {loading && <LoadingState label="漂流瓶正在靠岸…" />}
        {error && <div className="mt-10"><ErrorState message={error} /></div>}
        {data && !loading && (
          <article className="paper-card relative mt-10 overflow-hidden p-6 tablet:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="record-label text-blueprint">{data.recordNumber}</p>
                <p className="mt-2 font-mono text-xs text-ink-muted">{data.displayName} · {new Date(data.conductedAt).toLocaleDateString("zh-CN")}</p>
              </div>
              <RecordMark small />
            </div>
            <div className="my-10 border-y border-line py-10 tablet:my-14 tablet:py-14">
              <h2 className="font-serif text-3xl font-semibold leading-tight tablet:text-5xl">{data.title}</h2>
              <p className="mt-6 max-w-xl font-serif text-base leading-8 text-ink-muted tablet:text-lg">{data.excerpt}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={`/records/${data.recordNumber}`} className="button-primary flex-1">打开这份采访记录 <ArrowRight size={16} /></Link>
              <button type="button" onClick={driftAgain} className="button-secondary"><Compass size={16} />让它继续漂流</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
