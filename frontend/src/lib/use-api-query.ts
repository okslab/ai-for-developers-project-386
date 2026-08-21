import { useCallback, useEffect, useState } from "react";

interface QueryResult<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  refetch: () => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<{ data?: T; error?: unknown }>,
  deps: ReadonlyArray<unknown>
): QueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
        } else {
          setData(result.data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, error, loading, refetch };
}
