import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultState } from "./defaults";
import type { CrmState } from "./types";

const KEY = "crm-remix-state-v1";

interface Ctx {
  state: CrmState;
  setState: (updater: (s: CrmState) => CrmState) => void;
  reset: () => void;
  hydrated: boolean;
}

const CrmContext = createContext<Ctx | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [state, setInternal] = useState<CrmState>(() => defaultState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setInternal({ ...defaultState(), ...(JSON.parse(raw) as CrmState) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("dark", state.branding.theme === "dark");
    root.style.setProperty("--brand", state.branding.brandHue);
  }, [state.branding.theme, state.branding.brandHue, hydrated]);

  const setState = (updater: (s: CrmState) => CrmState) => setInternal((s) => updater(s));
  const reset = () => setInternal(defaultState());

  return (
    <CrmContext.Provider value={{ state, setState, reset, hydrated }}>{children}</CrmContext.Provider>
  );
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm debe usarse dentro de CrmProvider");
  return ctx;
}