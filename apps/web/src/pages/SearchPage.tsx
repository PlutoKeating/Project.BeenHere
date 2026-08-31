import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArchiveCard } from "../components/ArchiveCard";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const { data, error, loading } = useApi(() => query ? api.search(query) : Promise.resolve([]), [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    setParams(value ? { q: value } : {});
  }

  return (
    <section className="page-shell py-14 tablet:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="archive-label text-blueprint">FIND A TRACE</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tablet:text-6xl">寻找一份记录</h1>
        <p className="mt-5 text-sm leading-7 text-ink-muted">搜索编号、名字、采访正文或普通话题。搜索帮助寻找，随机仍负责相遇。</p>
        <form onSubmit={submit} role="search" className="mt-10 flex items-end gap-3 border-b border-line-strong">
          <label htmlFor="archive-search" className="sr-only">搜索档案</label>
          <Search size={20} className="mb-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <input id="archive-search" className="field border-0 text-lg" value={input} onChange={(event) => setInput(event.target.value)} placeholder="BH-000001 / 小林 / 地铁" autoComplete="off" />
          <button type="submit" className="mb-2 px-3 py-2 text-sm font-semibold">寻找</button>
        </form>
      </div>
      <div className="mt-14">
        {loading && query && <LoadingState label="正在查找保存过的痕迹…" />}
        {error && <ErrorState message={error} />}
        {data && query && data.length > 0 && <><p className="archive-label mb-6 text-ink-muted">{data.length} RECORDS FOUND</p><div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">{data.map((archive) => <ArchiveCard key={archive.id} archive={archive} />)}</div></>}
        {data && query && data.length === 0 && <EmptyState title="没有找到这份痕迹" body="换一个词，或者让随机带你去一份未曾寻找过的档案。" />}
        {!query && <EmptyState title="从一个词开始" body="名字、年份、话题或一句记得的话，都可以成为入口。" />}
      </div>
    </section>
  );
}
