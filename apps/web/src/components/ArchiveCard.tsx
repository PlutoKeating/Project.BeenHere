import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ArchiveSummary } from "../types";
import { ArchiveSeal } from "./ArchiveSeal";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });

export function ArchiveCard({ archive }: { archive: ArchiveSummary }) {
  return (
    <article className="paper-card group relative flex min-h-64 flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5 tablet:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="archive-label text-blueprint">{archive.archiveNumber}</p>
          <p className="mt-1 font-mono text-[11px] text-ink-muted">{dateFormatter.format(new Date(archive.conductedAt))}</p>
        </div>
        <ArchiveSeal small />
      </div>
      <div className="flex flex-1 flex-col pt-6">
        <p className="text-xs text-ink-muted">{archive.displayName}</p>
        <h2 className="mt-2 font-serif text-[1.4rem] font-semibold leading-snug tracking-[-0.01em]">{archive.title}</h2>
        <p className="mt-4 line-clamp-3 text-sm leading-7 text-ink-muted">{archive.excerpt}</p>
        <div className="mt-auto flex items-end justify-between gap-4 pt-7">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-blueprint-muted">
            {archive.topics.map((topic) => <span key={topic.slug}>#{topic.name}</span>)}
          </div>
          <Link
            to={`/archives/${archive.archiveNumber}`}
            className="flex size-11 shrink-0 items-center justify-center border border-line-strong text-ink transition-colors hover:bg-strong hover:text-inverse"
            aria-label={`阅读 ${archive.title}`}
          >
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
