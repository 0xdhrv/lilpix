import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * useState backed by localStorage. Falls back to `initial` when nothing is
 * stored, the stored JSON is broken, or `isValid` rejects it (say, a
 * background that has since been removed).
 */
export function usePersistent<T>(
  key: string,
  initial: () => T,
  isValid: (value: unknown) => value is T = (value): value is T =>
    typeof value === typeof initial(),
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed: unknown = JSON.parse(stored);
        if (isValid(parsed)) return parsed;
      }
    } catch {
      // Storage blocked or unreadable: use the default.
    }
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: the setting just won't persist.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches);
}
