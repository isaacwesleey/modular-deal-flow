import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PASSWORD,
  SCHEMA_VERSION,
  defaultState,
  emptyTenantState,
  seedRootState,
  uid,
} from "./defaults";
import { brandForeground } from "./contrast";
import { captureAttribution } from "./attribution";
import { TRASH_DAYS } from "./roles";
import { makeToken, tokenStatus, TOKEN_MESSAGES } from "./tokens";
import type {
  ActivityEvent,
  AppNotification,
  AuthToken,
  CrmState,
  FieldDef,
  Membership,
  NotificationKind,
  RootState,
  Tenant,
  TenantRole,
  User,
  UserPrefs,
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

/** Tope de eventos guardados por organización (evita reventar la cuota de localStorage). */
export const MAX_EVENTS = 500;

/** Reexport para el resto de la app: la fuente de verdad vive en defaults.ts. */
export { SCHEMA_VERSION };

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
  if (!withAmount) {
    // Roles de contacto: email, teléfono y empresa por defecto según el tipo.
    const assign = (role: "email" | "phone" | "company", pick: (f: FieldDef) => boolean) => {
      if (list.some((f) => f.role === role)) return;
      const candidate = list.find((f) => !f.role && pick(f));
      if (candidate) list = list.map((f) => (f.id === candidate.id ? { ...f, role } : f));
    };
    assign("email", (f) => f.type === "email");
    assign("phone", (f) => f.type === "phone");
    assign("company", (f) => f.type === "text");
  }
  return list;
}

/**
 * Migración puntual (v1 → v2): en algunas organizaciones el rol `company` cayó
 * sobre un campo que no era la empresa (p. ej. "Ciudad"). Se libera ese campo y
 * se crea uno de empresa propio para que la cabecera de la ficha muestre lo
 * correcto.
 *
 * ⚠️ Solo se ejecuta una vez, al subir de versión de esquema. A partir de ahí
 * el rol `company` es decisión del usuario: puede llamar a ese campo "Cuenta",
 * "Cliente" o "Razón social" y nadie se lo va a cambiar en el siguiente
 * arranque.
 */
function fixCompanyRole(fields: FieldDef[]): FieldDef[] {
  const wrong = fields.find(
    (f) => f.role === "company" && !/empresa|compañ|company|negocio/i.test(f.label),
  );
  if (!wrong) return fields;
  const cleaned: FieldDef[] = fields.map((f) => {
    if (f.id !== wrong.id) return f;
    const { role: _drop, ...rest } = f;
    return rest;
  });
  const existing = cleaned.find((f) => /empresa|compañ|company/i.test(f.label));
  if (existing) return cleaned.map((f) => (f.id === existing.id ? { ...f, role: "company" as const } : f));
  const idx = cleaned.findIndex((f) => f.id === wrong.id);
  const empresa: FieldDef = {
    id: "empresa",
    label: "Empresa",
    type: "text",
    showInQuickView: true,
    role: "company",
  };
  if (cleaned.some((f) => f.id === "empresa")) return cleaned;
  return [...cleaned.slice(0, idx), empresa, ...cleaned.slice(idx)];
}

function migrateTenantState(s: CrmState): CrmState {
  const cutoff = Date.now() - TRASH_DAYS * 86400000;
  const version = s.schemaVersion ?? 1;
  const withRoles = ensureRoles(s.contactFields ?? [], false);
  const contactFields = version < 2 ? fixCompanyRole(withRoles) : withRoles;
  const contacts = (s.contacts ?? []).filter(
    (c) => !c.deletedAt || new Date(c.deletedAt).getTime() > cutoff,
  );
  const titleFieldId = contactFields.find((f) => f.role === "title")?.id;
  /**
   * Migración: los deals antiguos no tenían relación real con el contacto.
   * Se enlazan una única vez por coincidencia de texto y a partir de ahí
   * la relación vive en `contactId` (nunca se vuelve a adivinar).
   */
  const byTitle = new Map<string, string>();
  if (titleFieldId) {
    for (const c of contacts) {
      const t = String(c.values[titleFieldId] ?? "").trim().toLowerCase();
      if (t && !byTitle.has(t)) byTitle.set(t, c.id);
    }
  }
  const deals = (s.deals ?? []).map((d) => {
    if (d.contactId) return d;
    const match = Object.values(d.values).find(
      (v) => typeof v === "string" && byTitle.has(v.trim().toLowerCase()),
    );
    return match ? { ...d, contactId: byTitle.get(String(match).trim().toLowerCase())! } : d;
  });
  return {
    ...defaultState(),
    ...s,
    schemaVersion: SCHEMA_VERSION,
    contactFields,
    dealFields: ensureRoles(s.dealFields ?? [], true),
    events: (s.events ?? []).slice(0, MAX_EVENTS),
    savedViews: s.savedViews ?? [],
    deals,
    // Purga automática de la papelera pasado el plazo de retención.
    contacts,
  };
}

/** Migración: el estado v1 (un solo CRM) se convierte en el primer tenant. */
/**
 * Claves de CrmState que forman la CONFIGURACIÓN de la organización: solo un
 * administrador puede escribirlas (ver comentario en `setState`).
 */
const SETTINGS_KEYS = ["branding", "modules", "contactFields", "dealFields", "stages"] as const;

function touchesSettings(before: CrmState, after: CrmState): boolean {
  return SETTINGS_KEYS.some((k) => before[k] !== after[k]);
}

/** ¿El usuario activo puede escribir la configuración de la organización? */
function canWriteSettings(r: RootState): boolean {
  const u = r.users.find((x) => x.id === r.currentUserId);
  if (!u) return false;
  if (u.superAdmin) return true;
  return u.memberships.some((m) => m.tenantId === r.currentTenantId && m.role === "admin");
}

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
      return { ...seedRootState(), ...parsed, tenants };
    }
  } catch {
    /* ignore */
  }

  const root = seedRootState();
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
        password: DEFAULT_PASSWORD,
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
  /** Usuarios que pertenecen a la organización activa. */
  tenantUsers: User[];
  /** Registra una o varias entradas en el historial de la organización. */
  logEvents: (
    entries: Array<Omit<ActivityEvent, "id" | "at" | "actorId" | "actorName"> & { at?: string }>,
  ) => void;

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
  }) => { ok: boolean; error?: string; token?: string };
  switchTenant: (tenantId: string) => void;
  exitSupport: () => void;
  enterSupport: (tenantId: string) => void;

  /* ---- Cuenta: tokens simulados (ver aviso en tokens.ts) ---- */
  tokens: AuthToken[];
  requestPasswordReset: (email: string) => { ok: boolean; error?: string; token?: string };
  resetPassword: (token: string, password: string) => { ok: boolean; error?: string };
  requestVerification: (userId?: string) => { ok: boolean; error?: string; token?: string };
  verifyEmail: (token: string) => { ok: boolean; error?: string };
  createInvite: (input: { email: string; role: TenantRole }) => {
    ok: boolean;
    error?: string;
    token?: string;
  };
  revokeInvite: (token: string) => void;
  acceptInvite: (
    token: string,
    input: { name: string; password: string },
  ) => { ok: boolean; error?: string };
  pendingInvites: AuthToken[];
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  updateProfile: (patch: Partial<Pick<User, "name" | "email">>) => { ok: boolean; error?: string };
  updatePrefs: (patch: Partial<UserPrefs>) => void;

  /* ---- Notificaciones ---- */
  notifications: AppNotification[];
  notify: (
    entries: Array<
      Omit<AppNotification, "id" | "at" | "tenantId" | "read"> & { tenantId?: string }
    >,
    opts?: { allowSelf?: boolean },
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const CrmContext = createContext<Ctx | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [root, setInternal] = useState<RootState>(() => seedRootState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setInternal(loadRoot());
    setHydrated(true);
    // Captura de origen (UTMs, referrer, página de entrada) al llegar el visitante.
    captureAttribution();
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

  const tenantUsers = useMemo(() => {
    if (!tenant) return [];
    return root.users.filter((u) => u.memberships.some((m) => m.tenantId === tenant.id));
  }, [root.users, tenant]);

  const fallback = useMemo(() => defaultState(), []);
  const state = tenant?.state ?? fallback;

  const setState = (updater: (s: CrmState) => CrmState) =>
    setInternal((r) => {
      const id = r.currentTenantId;
      const t = id ? r.tenants[id] : null;
      if (!id || !t) return r;
      const next = updater(t.state);
      /**
       * Permisos en la capa de datos, no solo en la interfaz: la configuración
       * de la organización (marca, módulos, campos y etapas) solo la puede
       * escribir un administrador (o el super admin en modo soporte). Da igual
       * desde dónde venga la llamada: si no hay permiso, el cambio se descarta.
       *
       * ⚠️ En producción esto NO es una garantía: cualquiera puede editar el
       * estado del navegador. La misma regla tiene que estar respaldada por
       * permisos en el servidor (RLS / políticas de backend); la comprobación
       * de cliente solo evita errores de la propia interfaz.
       */
      if (!canWriteSettings(r) && touchesSettings(t.state, next)) {
        if (typeof console !== "undefined") {
          console.warn("[crm] Cambio de configuración rechazado: se requiere rol de administrador.");
        }
        return r;
      }
      // Fuente de verdad única: el nombre de la organización vive en
      // branding.companyName y se propaga a tenant.name (panel del super admin).
      const name = next.branding.companyName.trim() || t.name;
      return { ...r, tenants: { ...r.tenants, [id]: { ...t, name, state: next } } };
    });

  /** Historial: siempre sella quién y cuándo, nunca es decorativo. */
  const logEvents: Ctx["logEvents"] = (entries) => {
    if (!entries.length) return;
    setInternal((r) => {
      const id = r.currentTenantId;
      const t = id ? r.tenants[id] : null;
      if (!id || !t) return r;
      const actor = r.users.find((u) => u.id === r.currentUserId);
      const now = new Date().toISOString();
      const events: ActivityEvent[] = entries.map((e) => ({
        ...e,
        id: uid(),
        at: e.at ?? now,
        ...(actor ? { actorId: actor.id } : {}),
        actorName: actor?.name ?? "Sistema",
      }));
      return {
        ...r,
        tenants: {
          ...r.tenants,
          [id]: {
            ...t,
            state: {
              ...t.state,
              // Tope por organización: se descartan los eventos más antiguos.
              events: [...events, ...t.state.events].slice(0, MAX_EVENTS),
            },
          },
        },
      };
    });
  };

  const reset = () =>
    setInternal((r) => {
      const id = r.currentTenantId;
      const t = id ? r.tenants[id] : null;
      if (!id || !t) return r;
      // Restablece los datos base pero conserva la identidad del tenant
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
    const pref = user?.prefs?.theme ?? "auto";
    const dark =
      pref === "auto"
        ? b.theme === "dark"
        : pref === "dark";
    el.classList.toggle("dark", dark);
    el.style.setProperty("--brand", b.brandHue);
    const fg = brandForeground(b.brandHue);
    el.style.setProperty("--primary-foreground", fg);
    el.style.setProperty("--sidebar-primary-foreground", fg);
  }, [state.branding.theme, state.branding.brandHue, user?.prefs?.theme, hydrated]);

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
    if (!password || password.length < 6)
      return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
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
      emailVerified: false,
      memberships: [{ tenantId, role: "admin" }],
    };
    // ⚠️ SIMULACIÓN: el token de verificación se guarda en el cliente y se
    // muestra en pantalla porque no hay servidor de correo. Ver tokens.ts.
    const vt = makeToken("verify", mail, { userId: admin.id });
    setRoot((r) => ({
      ...r,
      tenants: { ...r.tenants, [tenantId]: tenant },
      users: [...r.users, admin],
      tokens: [...(r.tokens ?? []), vt],
      currentUserId: admin.id,
      currentTenantId: tenantId,
      supportMode: false,
    }));
    return { ok: true, token: vt.token };
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

  /* ------------------------------------------------------------------ */
  /* Cuenta: recuperación, verificación e invitaciones (SIMULADAS)       */
  /* ------------------------------------------------------------------ */
  const tokens = root.tokens ?? [];
  const findToken = (token: string) => tokens.find((t) => t.token === token);
  const useToken = (token: string) =>
    setRoot((r) => ({
      ...r,
      tokens: (r.tokens ?? []).map((t) =>
        t.token === token ? { ...t, usedAt: new Date().toISOString() } : t,
      ),
    }));

  const requestPasswordReset: Ctx["requestPasswordReset"] = (email) => {
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, error: "El email no es válido." };
    const found = root.users.find((u) => u.email.toLowerCase() === mail);
    // No revelamos si el email existe (buena práctica también en real).
    if (!found) return { ok: true };
    const t = makeToken("reset", mail, { userId: found.id });
    setRoot((r) => ({ ...r, tokens: [...(r.tokens ?? []), t] }));
    return { ok: true, token: t.token };
  };

  const resetPassword: Ctx["resetPassword"] = (token, password) => {
    const t = findToken(token);
    const st = tokenStatus(t);
    if (st !== "ok" || t?.kind !== "reset") return { ok: false, error: TOKEN_MESSAGES[st === "ok" ? "missing" : st] };
    if (!password || password.length < 6)
      return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
    setRoot((r) => ({
      ...r,
      users: r.users.map((u) => (u.id === t.userId ? { ...u, password } : u)),
      tokens: (r.tokens ?? []).map((x) =>
        x.token === token ? { ...x, usedAt: new Date().toISOString() } : x,
      ),
    }));
    return { ok: true };
  };

  const requestVerification: Ctx["requestVerification"] = (userId) => {
    const target = root.users.find((u) => u.id === (userId ?? root.currentUserId));
    if (!target) return { ok: false, error: "No hay ninguna cuenta activa." };
    if (target.emailVerified) return { ok: false, error: "Tu email ya está verificado." };
    const t = makeToken("verify", target.email, { userId: target.id });
    setRoot((r) => ({ ...r, tokens: [...(r.tokens ?? []), t] }));
    return { ok: true, token: t.token };
  };

  const verifyEmail: Ctx["verifyEmail"] = (token) => {
    const t = findToken(token);
    const st = tokenStatus(t);
    if (st !== "ok" || t?.kind !== "verify")
      return { ok: false, error: TOKEN_MESSAGES[st === "ok" ? "missing" : st] };
    setRoot((r) => ({
      ...r,
      users: r.users.map((u) => (u.id === t.userId ? { ...u, emailVerified: true } : u)),
      tokens: (r.tokens ?? []).map((x) =>
        x.token === token ? { ...x, usedAt: new Date().toISOString() } : x,
      ),
    }));
    return { ok: true };
  };

  const pendingInvites = useMemo(
    () =>
      (root.tokens ?? []).filter(
        (t) => t.kind === "invite" && t.tenantId === root.currentTenantId && tokenStatus(t) === "ok",
      ),
    [root.tokens, root.currentTenantId],
  );

  const createInvite: Ctx["createInvite"] = ({ email, role: inviteRole }) => {
    const mail = email.trim().toLowerCase();
    if (!tenant) return { ok: false, error: "No hay organización activa." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, error: "El email no es válido." };
    const existing = root.users.find((u) => u.email.toLowerCase() === mail);
    if (existing?.memberships.some((m) => m.tenantId === tenant.id))
      return { ok: false, error: "Ese usuario ya pertenece a la organización." };
    if (pendingInvites.some((t) => t.email === mail))
      return { ok: false, error: "Ya hay una invitación pendiente para ese email." };
    const t = makeToken("invite", mail, {
      tenantId: tenant.id,
      role: inviteRole,
      invitedByName: user?.name ?? "Un administrador",
    });
    setRoot((r) => ({ ...r, tokens: [...(r.tokens ?? []), t] }));
    return { ok: true, token: t.token };
  };

  const revokeInvite: Ctx["revokeInvite"] = (token) =>
    setRoot((r) => ({
      ...r,
      tokens: (r.tokens ?? []).map((t) =>
        t.token === token ? { ...t, revokedAt: new Date().toISOString() } : t,
      ),
    }));

  const acceptInvite: Ctx["acceptInvite"] = (token, { name, password }) => {
    const t = findToken(token);
    const st = tokenStatus(t);
    if (st !== "ok" || t?.kind !== "invite" || !t.tenantId)
      return { ok: false, error: TOKEN_MESSAGES[st === "ok" ? "missing" : st] };
    const tenantId = t.tenantId;
    if (!root.tenants[tenantId]) return { ok: false, error: "La organización ya no existe." };
    const existing = root.users.find((u) => u.email.toLowerCase() === t.email);
    if (!existing) {
      if (!name.trim()) return { ok: false, error: "Indica tu nombre." };
      if (!password || password.length < 6)
        return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }
    const newUser: User | null = existing
      ? null
      : {
          id: uid(),
          name: name.trim(),
          email: t.email,
          // ⚠️ Contraseña sin hashear: simulación en localStorage.
          password,
          emailVerified: true,
          memberships: [{ tenantId, role: t.role ?? "user" }],
        };
    setRoot((r) => ({
      ...r,
      users: existing
        ? r.users.map((u) =>
            u.id === existing.id
              ? { ...u, memberships: [...u.memberships, { tenantId, role: t.role ?? "user" }] }
              : u,
          )
        : [...r.users, newUser!],
      tokens: (r.tokens ?? []).map((x) =>
        x.token === token ? { ...x, usedAt: new Date().toISOString() } : x,
      ),
      currentUserId: existing?.id ?? newUser!.id,
      currentTenantId: tenantId,
      supportMode: false,
    }));
    return { ok: true };
  };

  const changePassword: Ctx["changePassword"] = (current, next) => {
    if (!user) return { ok: false, error: "No hay sesión activa." };
    // ⚠️ Comparación en texto plano: simulación.
    if (user.password !== current) return { ok: false, error: "La contraseña actual no es correcta." };
    if (!next || next.length < 6) return { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
    if (next === current) return { ok: false, error: "La nueva contraseña debe ser distinta de la actual." };
    setRoot((r) => ({
      ...r,
      users: r.users.map((u) => (u.id === user.id ? { ...u, password: next } : u)),
    }));
    return { ok: true };
  };

  const updateProfile: Ctx["updateProfile"] = (patch) => {
    if (!user) return { ok: false, error: "No hay sesión activa." };
    const mail = patch.email?.trim().toLowerCase();
    if (patch.name !== undefined && !patch.name.trim())
      return { ok: false, error: "El nombre no puede estar vacío." };
    if (mail !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, error: "El email no es válido." };
      if (root.users.some((u) => u.id !== user.id && u.email.toLowerCase() === mail))
        return { ok: false, error: "Ya existe otro usuario con ese email." };
    }
    const emailChanged = mail !== undefined && mail !== user.email.toLowerCase();
    setRoot((r) => ({
      ...r,
      users: r.users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
              ...(mail !== undefined ? { email: mail } : {}),
              ...(emailChanged ? { emailVerified: false } : {}),
            }
          : u,
      ),
      tokens: emailChanged
        ? [...(r.tokens ?? []), makeToken("verify", mail!, { userId: user.id })]
        : (r.tokens ?? []),
    }));
    return { ok: true };
  };

  const updatePrefs: Ctx["updatePrefs"] = (patch) =>
    setRoot((r) => ({
      ...r,
      users: r.users.map((u) =>
        u.id === r.currentUserId ? { ...u, prefs: { ...(u.prefs ?? {}), ...patch } } : u,
      ),
    }));

  /* ---- Notificaciones ---- */
  const notifications = useMemo(
    () =>
      (root.notifications ?? []).filter(
        (n) => n.userId === root.currentUserId && n.tenantId === root.currentTenantId,
      ),
    [root.notifications, root.currentUserId, root.currentTenantId],
  );

  const notify: Ctx["notify"] = (entries, opts) => {
    if (!entries.length) return;
    setRoot((r) => {
      const now = new Date().toISOString();
      const list: AppNotification[] = entries
        // Por defecto no te avisas a ti mismo; los recordatorios automáticos
        // (tareas que vencen) sí necesitan llegarte aunque los dispares tú.
        .filter((e) => e.userId && (opts?.allowSelf || e.userId !== r.currentUserId))
        .map((e) => ({
          ...e,
          tenantId: e.tenantId ?? r.currentTenantId ?? "",
          id: uid(),
          at: now,
          read: false,
        }));
      if (!list.length) return r;
      return { ...r, notifications: [...list, ...(r.notifications ?? [])].slice(0, 200) };
    });
  };

  const markNotificationRead: Ctx["markNotificationRead"] = (id) =>
    setRoot((r) => ({
      ...r,
      notifications: (r.notifications ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));

  const markAllNotificationsRead = () =>
    setRoot((r) => ({
      ...r,
      notifications: (r.notifications ?? []).map((n) =>
        n.userId === r.currentUserId && n.tenantId === r.currentTenantId ? { ...n, read: true } : n,
      ),
    }));

  return (
    <CrmContext.Provider
      value={{
        state,
        setState,
        reset,
        hydrated,
        root,
        setRoot,
        tenantUsers,
        logEvents,
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
        tokens,
        requestPasswordReset,
        resetPassword,
        requestVerification,
        verifyEmail,
        createInvite,
        revokeInvite,
        acceptInvite,
        pendingInvites,
        changePassword,
        updateProfile,
        updatePrefs,
        notifications,
        notify,
        markNotificationRead,
        markAllNotificationsRead,
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
