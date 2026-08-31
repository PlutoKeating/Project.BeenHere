import { useEffect, useState } from "react";

export function useApi<T>(loader: () => Promise<T>, dependencies: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((value) => { if (active) setData(value); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "加载失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Callers define stable primitive dependencies for each request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, error, loading };
}
