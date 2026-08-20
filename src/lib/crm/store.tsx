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

/**
 * ⚠️ AUTENTICACIÓN SIMULADA — SOLO PARA LA DEMO/PLANTILLA.
 * Los usuarios y sus contraseñas se guardan EN TEXTO PLANO en localStorage:
 * cualquiera con acceso al navegador puede leerlas y modificarlas, y no hay
 * ninguna verificación en servidor (los roles y la suspensión de tenants son
 * puramente de cliente).
 * Antes de llevar esto a producción, sustituye todo este módulo de sesión por
 * un proveedor real (Supabase Auth / Lovable Cloud, Auth0, Clerk...) con
 * hashing de contraseñas, sesiones firmadas y RLS/permisos en el backend.
 */

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
        const state = migrateTenantState(t.state);
        tenants[id] = { ...t, name: state.branding.companyName.trim() || t.name, state };
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
  loginAs: (userId: string, tenantId?: string | null) => { ok: boolean; error?: string };
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
      const next = updater(t.state);
      // Fuente de verdad única: el nombre de la organización vive en
      // branding.companyName y se propaga a tenant.name (panel del super admin).
      const name = next.branding.companyName.trim() || t.name;
      return { ...r, tenants: { ...r.tenants, [id]: { ...t, name, state: next } } };
    });

  const reset = () =>
    setInternal((r) => {
      const id = r.currentTenantId;
      const t = id ? r.tenants[id] : null;
      if (!id || !t) return r;
      // Restaura los datos de ejemplo pero conserva la identidad del tenant
      // (nombre, logo, color de marca y tema).
      const fresh = defaultState();
      return {
        ...r,
        tenants: {
          ...r.tenants,
          [id]: { ...t, state: { ...fresh, branding: { ...t.state.branding } } },
        },
      };
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
    // ⚠️ Comparación de contraseña en texto plano: simulación, no usar en real.
    const found = root.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!found) return { ok: false, error: "Email o contraseña incorrectos." };
    let target: string | null = null;
    if (!found.superAdmin) {
      const mine = found.memberships
        .map((m) => root.tenants[m.tenantId])
        .filter((t): t is Tenant => Boolean(t));
      if (!mine.length) return { ok: false, error: "Tu usuario no pertenece a ninguna organización." };
      const active = mine.find((t) => !t.suspended);
      if (!active)
        return {
          ok: false,
          error:
            mine.length > 1
              ? "Todas tus organizaciones están suspendidas. Contacta con el soporte del SaaS."
              : "Tu organización está suspendida. Contacta con el soporte del SaaS.",
        };
      target = active.id;
    }
    setRoot((r) => ({ ...r, currentUserId: found.id, currentTenantId: target, supportMode: false }));
    return { ok: true };
  };

  const loginAs: Ctx["loginAs"] = (userId, tenantId) => {
    const found = root.users.find((u) => u.id === userId);
    if (!found) return { ok: false, error: "Usuario no encontrado." };
    let t = tenantId ?? null;
    if (!t && !found.superAdmin) {
      const mine = found.memberships
        .map((m) => root.tenants[m.tenantId])
        .filter((x): x is Tenant => Boolean(x));
      t = (mine.find((x) => !x.suspended) ?? null)?.id ?? null;
      if (!t)
        return { ok: false, error: "Tu organización está suspendida. Contacta con el soporte del SaaS." };
    }
    setRoot((r) => ({
      ...r,
      currentUserId: found.id,
      currentTenantId: t,
      supportMode: Boolean(found.superAdmin && t),
    }));
    return { ok: true };
  };

  const logout = () =>
    setRoot((r) => ({ ...r, currentUserId: null, currentTenantId: null, supportMode: false }));

  const register: Ctx["register"] = ({ company, name, email, password }) => {
    const mail = email.trim().toLowerCase();
    if (!company.trim()) return { ok: false, error: "Indica el nombre de la organización." };
    if (!name.trim()) return { ok: false, error: "Indica tu nombre." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
      return { ok: false, error: "El email no es válido." };
    if (!password || password.length < 4)
      return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };
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
      // ⚠️ Contraseña sin hashear: simulación en localStorage.
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
    setInternal((r) => {
      const t = r.tenants[tenantId];
      if (!t) return r;
      const su = Boolean(r.users.find((u) => u.id === r.currentUserId)?.superAdmin);
      // Un usuario normal nunca puede entrar en una organización suspendida.
      if (t.suspended && !su) return r;
      // Cualquier acceso del super admin a un tenant es modo soporte.
      return { ...r, currentTenantId: tenantId, supportMode: su };
    });

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
