import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultState } from "./defaults";
import { brandForeground } from "./contrast";
import type { CrmState, FieldDef } from "./types";

const KEY = "crm-remix-state-v1";

/** Asegura que existan los roles de campo en estados guardados antes de esta versión. */
function ensureRoles(fields: FieldDef[], withAmount: boolean): FieldDef[] {
  let list = fields;
  if (list.length && !list.some((f) => f.role === "title")) {
    list = list.map((f, i) => (i === 0 ? { ...f, role: "title" as const } : f));
  }
  if (withAmount && !list.some((f) => f.role === "amount")) {
    const candidate = list.find((f) => f.type === "currency" || f.type === "number");
    if (candidate) list = list.map((f) => (f.id === candidate.id ? { ...f, role: "amount" as const } : f));
  }
  return list;
}

function migrate(s: CrmState): CrmState {
  return {
    ...s,
    contactFields: ensureRoles(s.contactFields ?? [], false),
    dealFields: ensureRoles(s.dealFields ?? [], true),
  };
}

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
      if (raw) setInternal(migrate({ ...defaultState(), ...(JSON.parse(raw) as CrmState) }));
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
    const fg = brandForeground(state.branding.brandHue);
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--sidebar-primary-foreground", fg);
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