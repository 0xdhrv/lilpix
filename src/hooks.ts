import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react";

/**
 * useState backed by localStorage. Falls back to `initial` when nothing is
 * stored, the stored JSON is broken, or `isValid` rejects it (say, a
 * background that has since been removed). Only values set through the
 * returned setter are saved, so an unchosen default can change later.
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
  // Set once the value has been chosen here, as opposed to loaded or synced.
  const chosen = useRef(false);

  // Follow changes made in other tabs and pages (the about page, the anatomy
  // figure), so every open page shows the same theme and settings.
  const onStorage = useEffectEvent((event: StorageEvent) => {
    if (event.key !== key || event.newValue === null) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      if (isValid(parsed)) setValue(parsed);
    } catch {
      // Ignore unreadable values.
    }
  });
  useEffect(() => {
    const listener = (event: StorageEvent) => onStorage(event);
    addEventListener("storage", listener);
    return () => removeEventListener("storage", listener);
  }, []);

  useEffect(() => {
    if (!chosen.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: the setting just won't persist.
    }
  }, [key, value]);

  const choose = useCallback((next: SetStateAction<T>) => {
    chosen.current = true;
    setValue(next);
  }, []);

  return [value, choose] as const;
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
