export function ArchiveSeal({ children = "已入馆", small = false }: { children?: React.ReactNode; small?: boolean }) {
  return (
    <span
      className={`inline-flex -rotate-2 items-center justify-center border-2 border-double border-seal font-serif font-bold tracking-[0.16em] text-seal ${small ? "h-8 px-2 text-[10px]" : "h-12 px-3 text-xs"}`}
      aria-label={`档案状态：${String(children)}`}
    >
      {children}
    </span>
  );
}
