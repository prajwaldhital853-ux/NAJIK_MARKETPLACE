import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSavedListings, toggleListingSave } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { useAuth } from "./AuthContext";

type SavedListingsValue = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  reload: () => Promise<void>;
};

const SavedListingsContext = createContext<SavedListingsValue | null>(null);

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);

  const reload = useCallback(async () => {
    if (!user) {
      setIds([]);
      return;
    }
    try {
      const rows = await fetchSavedListings();
      setIds(rows.map((row) => row.id));
    } catch {
      setIds([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void reload();
    return subscribeListingsChanged(() => void reload());
  }, [reload]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      const wasSaved = ids.includes(id);
      setIds((prev) => (wasSaved ? prev.filter((row) => row !== id) : [id, ...prev]));
      void toggleListingSave(id).catch(() => void reload());
    },
    [ids, reload],
  );

  const remove = useCallback(
    (id: string) => {
      if (!ids.includes(id)) return;
      setIds((prev) => prev.filter((row) => row !== id));
      void toggleListingSave(id).catch(() => void reload());
    },
    [ids, reload],
  );

  const value = useMemo(() => ({ ids, has, toggle, remove, reload }), [ids, has, toggle, remove, reload]);

  return <SavedListingsContext.Provider value={value}>{children}</SavedListingsContext.Provider>;
}

export function useSavedListings() {
  const ctx = useContext(SavedListingsContext);
  if (!ctx) {
    return {
      ids: [] as string[],
      has: () => false,
      toggle: () => {},
      remove: () => {},
      reload: async () => {},
    };
  }
  return ctx;
}
