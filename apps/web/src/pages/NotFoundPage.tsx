import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page-shell flex min-h-[65dvh] items-center justify-center py-20 text-center">
      <div>
        <p className="archive-label text-seal">404 / NOT CATALOGUED</p>
        <h1 className="mt-5 font-serif text-4xl font-semibold">这只抽屉是空的</h1>
        <p className="mt-4 text-sm text-ink-muted">路径没有对应档案。也许该让偶然重新带路。</p>
        <Link to="/drift" className="button-primary mt-8">捡起一个漂流瓶</Link>
      </div>
    </section>
  );
}
