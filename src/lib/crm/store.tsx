import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultState, demoRootState, emptyTenantState, uid } from "./defaults";
import { brandForeground } from "./contrast";
import type {
  CrmState,
  FieldDef,
  Membership,
  RootState,
  Tenant,
  TenantRole,
  User,
} from "./types";

const ROOT_KEY = "crm-remix-root-v2";
const LEGACY_KEY = "crm-remix-state-v1";

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

function migrateTenantState(s: CrmState): CrmState {
  return {
    ...defaultState(),
    ...s,
    contactFields: ensureRoles(s.contactFields ?? [], false),
    dealFields: ensureRoles(s.dealFields ?? [], true),
  };
}

/** Migración: el estado v1 (un solo CRM) se convierte en el primer tenant. */
function loadRoot(): RootState {
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RootState;
      const tenants: Record<string, Tenant> = {};
      for (const [id, t] of Object.entries(parsed.tenants ?? {})) {
        tenants[id] = { ...t, state: migrateTenantState(t.state) };
      }
      return { ...demoRootState(), ...parsed, tenants };
    }
  } catch {
    /* ignore */
  }

  const root = demoRootState();
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const state = migrateTenantState(JSON.parse(legacy) as CrmState);
      const id = "legacy";
      const tenant: Tenant = {
        id,
        name: state.branding.companyName || "Mi organización",
        createdAt: new Date().toISOString(),
        state,
      };
      const owner: User = {
        id: uid(),
        name: "Propietario",
        email: "propietario@miempresa.com",
        password: "demo1234",
        memberships: [{ tenantId: id, role: "admin" }],
      };
      root.tenants = { [id]: tenant, ...root.tenants };
      root.users = [...root.users, owner];
      root.currentUserId = owner.id;
      root.currentTenantId = id;
    }
  } catch {
    /* ignore */
  }
  return root;
}

interface Ctx {
  /** Estado del tenant activo (o uno vacío si no hay tenant). */
  state: CrmState;
  setState: (updater: (s: CrmState) => CrmState) => void;
  reset: () => void;
  hydrated: boolean;

  root: RootState;
  setRoot: (updater: (r: RootState) => RootState) => void;

  user: User | null;
  tenant: Tenant | null;
  role: TenantRole | "superadmin" | null;
  isSuperAdmin: boolean;
  canManageSettings: boolean;
  supportMode: boolean;
  myTenants: Tenant[];

  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginAs: (userId: string, tenantId?: string | null) => void;
  logout: () => void;
  register: (input: {
    company: string;
    name: string;
    email: string;
    password: string;
  }) => { ok: boolean; error?: string };
  switchTenant: (tenantId: string) => void;
  exitSupport: () => void;
  enterSupport: (tenantId: string) => void;
}

const CrmContext = createContext<Ctx | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [root, setInternal] = useState<RootState>(() => demoRootState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setInternal(loadRoot());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ROOT_KEY, JSON.stringify(root));
    } catch {
      /* ignore */
    }
  }, [root, hydrated]);

  const setRoot = (updater: (r: RootState) => RootState) => setInternal((r) => updater(r));

  const user = useMemo(
    () => root.users.find((u) => u.id === root.currentUserId) ?? null,
    [root.users, root.currentUserId],
  );
  const tenant = root.currentTenantId ? (root.tenants[root.currentTenantId] ?? null) : null;

  const membership: Membership | undefined = user?.memberships.find(
    (m) => m.tenantId === root.currentTenantId,
  );
  const isSuperAdmin = Boolean(user?.superAdmin);
  const role: TenantRole | "superadmin" | null = isSuperAdmin
    ? "superadmin"
    : (membership?.role ?? null);
  const supportMode = Boolean(root.supportMode && isSuperAdmin && tenant);
  const canManageSettings = isSuperAdmin || membership?.role === "admin";

  const myTenants = useMemo(() => {
    if (!user) return [];
    if (user.superAdmin) return Object.values(root.tenants);
    return user.memberships
      .map((m) => root.tenants[m.tenantId])
      .filter((t): t is Tenant => Boolean(t));
  }, [user, root.tenants]);

  const fallback = useMemo(() => defaultState(), []);
  const state = tenant?.state ?? fallback;

  const setState = (updater: (s: CrmState) => CrmState) =>
    setInternal((r) => {
      const id = r.currentTenantId;
      const t = id ? r.tenants[id] : null;
      if (!id || !t) return r;
      return { ...r, tenants: { ...r.tenants, [id]: { ...t, state: updater(t.state) } } };
    });

  const reset = () =>
    setInternal((r) => {
      const id = r.currentTenantId;
      const t = id ? r.tenants[id] : null;
      if (!id || !t) return r;
      return { ...r, tenants: { ...r.tenants, [id]: { ...t, state: defaultState() } } };
    });

  // Tema + color de marca del tenant activo
  useEffect(() => {
    if (!hydrated) return;
    const b = state.branding;
    const el = document.documentElement;
    el.classList.toggle("dark", b.theme === "dark");
    el.style.setProperty("--brand", b.brandHue);
    const fg = brandForeground(b.brandHue);
    el.style.setProperty("--primary-foreground", fg);
    el.style.setProperty("--sidebar-primary-foreground", fg);
  }, [state.branding.theme, state.branding.brandHue, hydrated]);

  const login: Ctx["login"] = (email, password) => {
    const found = root.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!found) return { ok: false, error: "Email o contraseña incorrectos." };
    const first = found.superAdmin ? null : (found.memberships[0]?.tenantId ?? null);
    if (!found.superAdmin) {
      const t = first ? root.tenants[first] : null;
      if (t?.suspended) return { ok: false, error: "Tu organización está suspendida." };
    }
    setRoot((r) => ({ ...r, currentUserId: found.id, currentTenantId: first, supportMode: false }));
    return { ok: true };
  };

  const loginAs: Ctx["loginAs"] = (userId, tenantId) => {
    const found = root.users.find((u) => u.id === userId);
    if (!found) return;
    const t = tenantId ?? (found.superAdmin ? null : (found.memberships[0]?.tenantId ?? null));
    setRoot((r) => ({ ...r, currentUserId: found.id, currentTenantId: t, supportMode: false }));
  };

  const logout = () =>
    setRoot((r) => ({ ...r, currentUserId: null, currentTenantId: null, supportMode: false }));

  const register: Ctx["register"] = ({ company, name, email, password }) => {
    const mail = email.trim().toLowerCase();
    if (root.users.some((u) => u.email.toLowerCase() === mail))
      return { ok: false, error: "Ya existe un usuario con ese email." };
    const tenantId = uid();
    const tenant: Tenant = {
      id: tenantId,
      name: company.trim(),
      createdAt: new Date().toISOString(),
      state: emptyTenantState(company.trim(), Object.keys(root.tenants).length),
    };
    const admin: User = {
      id: uid(),
      name: name.trim() || mail,
      email: mail,
      password,
      memberships: [{ tenantId, role: "admin" }],
    };
    setRoot((r) => ({
      ...r,
      tenants: { ...r.tenants, [tenantId]: tenant },
      users: [...r.users, admin],
      currentUserId: admin.id,
      currentTenantId: tenantId,
      supportMode: false,
    }));
    return { ok: true };
  };

  const switchTenant = (tenantId: string) =>
    setRoot((r) => ({ ...r, currentTenantId: tenantId, supportMode: false }));

  const enterSupport = (tenantId: string) =>
    setRoot((r) => ({ ...r, currentTenantId: tenantId, supportMode: true }));

  const exitSupport = () => setRoot((r) => ({ ...r, currentTenantId: null, supportMode: false }));

  return (
    <CrmContext.Provider
      value={{
        state,
        setState,
        reset,
        hydrated,
        root,
        setRoot,
        user,
        tenant,
        role,
        isSuperAdmin,
        canManageSettings,
        supportMode,
        myTenants,
        login,
        loginAs,
        logout,
        register,
        switchTenant,
        enterSupport,
        exitSupport,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm debe usarse dentro de CrmProvider");
  return ctx;
}
