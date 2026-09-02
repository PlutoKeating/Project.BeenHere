import type { ReactNode } from "react";

export function PolicyPage({ eyebrow, title, summary, updated = "2026 年 9 月 2 日", children }: { eyebrow: string; title: string; summary: string; updated?: string; children: ReactNode }) {
  return <section className="page-shell py-12 tablet:py-20">
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-line pb-8">
        <p className="record-label text-blueprint">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tablet:text-6xl">{title}</h1>
        <p className="mt-6 font-serif text-lg leading-9 text-ink-muted">{summary}</p>
        <p className="mt-5 text-xs text-ink-muted">生效及最近更新：{updated}</p>
      </header>
      <div className="policy-copy mt-10 space-y-10 text-sm leading-8 text-ink-muted">{children}</div>
    </article>
  </section>;
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section>
    <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
    <div className="mt-4 space-y-4">{children}</div>
  </section>;
}
