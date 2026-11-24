"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type ThemePref = "dark" | "light" | "auto";
export type ResolvedTheme = "dark" | "light";

export const THEME_KEY = "coopenhouse-theme";
export const DEFAULT_THEME: ThemePref = "dark";

/** Runs before first paint (see layout.tsx) so there is no flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"${DEFAULT_THEME}";var d=p==="dark"||(p==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

const prefListeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "light" || v === "auto" ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
function subscribePref(cb: () => void) {
  prefListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    prefListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const MQ = "(prefers-color-scheme: dark)";
function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const systemDark = () => window.matchMedia(MQ).matches;

interface ThemeValue {
  pref: ThemePref;
  resolved: ResolvedTheme;
  setPref: (p: ThemePref) => void;
}
const ThemeContext = createContext<ThemeValue>({ pref: DEFAULT_THEME, resolved: "dark", setPref: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useSyncExternalStore(subscribePref, readPref, () => DEFAULT_THEME);
  const sysDark = useSyncExternalStore(subscribeSystem, systemDark, () => true);
  const resolved: ResolvedTheme = pref === "auto" ? (sysDark ? "dark" : "light") : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPref = useCallback((p: ThemePref) => {
    try {
      window.localStorage.setItem(THEME_KEY, p);
    } catch {
      // storage unavailable: preference lasts only until reload
    }
    prefListeners.forEach((l) => l());
  }, []);

  const value = useMemo(() => ({ pref, resolved, setPref }), [pref, resolved, setPref]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
