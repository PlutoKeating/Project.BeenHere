export function RecordMark({ children = "已公开", small = false }: { children?: React.ReactNode; small?: boolean }) {
  return <span className={`inline-flex rotate-[-2deg] items-center justify-center rounded-full border-2 border-seal font-serif font-semibold text-seal ${small ? "px-3 py-1 text-xs" : "size-24 text-lg"}`} aria-label={`采访记录状态：${String(children)}`}>{children}</span>;
}
