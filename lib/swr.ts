"use client";

import { useCallback, type SetStateAction } from "react";
import useSWR from "swr";

/** Default SWR fetcher: JSON GET that throws on a non-2xx response (so stale cache is kept). */
export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

/**
 * useState backed by the SWR cache (stale-while-revalidate).
 * - A return visit renders the cached value immediately and revalidates in the background.
 * - `loading` is only true on a first load with nothing cached.
 * - The setter writes through to the cache (no refetch), so optimistic updates survive tab switches.
 * `fallback` must be a stable reference (e.g. a module-level constant).
 */
export function useCachedState<T>(key: string | null, fallback: T) {
  const { data, error, isLoading, mutate } = useSWR<T>(key);
  const setData = useCallback(
    (update: SetStateAction<T>) => {
      void mutate(
        (current) =>
          typeof update === "function"
            ? (update as (prev: T) => T)(current ?? fallback)
            : update,
        { revalidate: false }
      );
    },
    [mutate, fallback]
  );
  const revalidate = useCallback(() => mutate(), [mutate]);
  return {
    data: data ?? fallback,
    setData,
    loading: data === undefined && isLoading,
    error,
    revalidate,
  } as const;
}
