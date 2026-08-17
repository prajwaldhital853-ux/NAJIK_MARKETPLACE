import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type SavedListingsValue = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
};

const SavedListingsContext = createContext<SavedListingsValue | null>(null);

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [id, ...prev]));
  }, []);

  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((row) => row !== id));
  }, []);

  const value = useMemo(() => ({ ids, has, toggle, remove }), [ids, has, toggle, remove]);

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
    };
  }
  return ctx;
}
