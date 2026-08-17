"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

const ThemeCtx = createContext<{
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("najik-theme") as Theme | null;
    const next = stored === "light" ? "light" : "dark";
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem("najik-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  const value = useMemo(
    () => ({ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }),
    [theme],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
