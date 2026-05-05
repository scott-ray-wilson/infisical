import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lastSeenAnnouncementSlug";

const readSeenSlug = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const useAnnouncementSeen = () => {
  const [seenSlug, setSeenSlug] = useState<string | null>(() => readSeenSlug());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSeenSlug(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markSeen = useCallback((slug: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, slug);
    } catch {
      // localStorage may be unavailable (private mode, quota); fail open — modal will re-pop next visit.
    }
    setSeenSlug(slug);
  }, []);

  const hasUnseen = useCallback(
    (slug: string | null | undefined) => Boolean(slug && slug !== seenSlug),
    [seenSlug]
  );

  return { seenSlug, markSeen, hasUnseen };
};
