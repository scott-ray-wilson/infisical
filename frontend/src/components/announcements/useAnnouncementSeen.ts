import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lastSeenAnnouncementId";

const readSeenId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const useAnnouncementSeen = () => {
  const [seenId, setSeenId] = useState<string | null>(() => readSeenId());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSeenId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markSeen = useCallback((id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage may be unavailable (private mode, quota); fail open — modal will re-pop next visit.
    }
    setSeenId(id);
  }, []);

  const hasUnseen = useCallback(
    (id: string | null | undefined) => Boolean(id && id !== seenId),
    [seenId]
  );

  return { seenId, markSeen, hasUnseen };
};
