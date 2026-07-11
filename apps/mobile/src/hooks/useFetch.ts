import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Replaces the repeated `useState` + `useFocusEffect(() => api.X().then(setX))` pattern
 * used across list/detail screens. `loading` is only true on the very first load (drives
 * skeleton placeholders); `refresh()` (pull-to-refresh) uses `refreshing` instead so
 * existing content stays visible while refetching.
 */
export function useFetch<T>(fetchFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const attempted = useRef(false);

  const load = useCallback(() => {
    if (!attempted.current) setLoading(true);
    attempted.current = true;
    fetchFn()
      .then(setData)
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(load);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, loading, refreshing, refresh };
}
