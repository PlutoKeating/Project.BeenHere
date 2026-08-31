export function LoadingState({ label = "正在翻找采访记录…" }: { label?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center" role="status">
      <div className="text-center">
        <span className="mx-auto block size-7 animate-spin rounded-full border border-line-strong border-t-seal" />
        <p className="mt-4 font-serif text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="paper-card mx-auto max-w-lg border-danger/30 bg-danger-surface/30 p-6 text-center" role="alert">
      <p className="font-serif text-lg">这页暂时没有打开</p>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{message}</p>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-y border-line py-16 text-center">
      <p className="font-serif text-xl">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-muted">{body}</p>
    </div>
  );
}
