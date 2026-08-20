import {
  DEFAULT_PASSWORD,
  DEFAULT_PIPELINE_ID,
  SCHEMA_VERSION,
  defaultState,
  seedRootState,
  uid,
} from "./defaults";
import { TRASH_DAYS } from "./roles";
import type { CrmState, FieldDef, RootState, Tenant, User } from "./types";

/**
 * Migraciones puras del estado guardado.
 *
 * Vive fuera del store para poder probarse sin interfaz ni navegador: las
 * funciones no tocan `localStorage`, se les pasa el almacenamiento.
 */

export const ROOT_KEY = "ventia-root-v1";
/** Claves de versiones anteriores de la plantilla; se migran una sola vez. */
export const LEGACY_ROOT_KEYS = ["crm-remix-root-v2"];
export const LEGACY_KEY = "crm-remix-state-v1";

/** Tope de eventos guardados por organización (evita reventar la cuota). */
export const MAX_EVENTS = 500;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Asegura que existan los roles de campo en estados guardados antes de esta versión. */
export function ensureRoles(fields: FieldDef[], withAmount: boolean): FieldDef[] {
  let list = fields;
  if (list.length && !list.some((f) => f.role === "title")) {
    list = list.map((f, i) => (i === 0 ? { ...f, role: "title" as const } : f));
  }
  if (withAmount && !list.some((f) => f.role === "amount")) {
    const candidate = list.find((f) => f.type === "currency" || f.type === "number");
    if (candidate) list = list.map((f) => (f.id === candidate.id ? { ...f, role: "amount" as const } : f));
  }
  if (!withAmount) {
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
 * sobre un campo que no era la empresa. Solo se ejecuta una vez.
 */
export function fixCompanyRole(fields: FieldDef[]): FieldDef[] {
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

export function migrateTenantState(s: CrmState): CrmState {
  const cutoff = Date.now() - TRASH_DAYS * 86400000;
  const version = s.schemaVersion ?? 1;
  const withRoles = ensureRoles(s.contactFields ?? [], false);
  const contactFields = version < 2 ? fixCompanyRole(withRoles) : withRoles;
  const contacts = (s.contacts ?? []).filter(
    (c) => !c.deletedAt || new Date(c.deletedAt).getTime() > cutoff,
  );
  const purgedDeals = (s.deals ?? []).filter(
    (d) => !d.deletedAt || new Date(d.deletedAt).getTime() > cutoff,
  );
  const titleFieldId = contactFields.find((f) => f.role === "title")?.id;
  /** Los deals antiguos no tenían relación real: se enlazan una sola vez por texto. */
  const byTitle = new Map<string, string>();
  if (titleFieldId) {
    for (const c of contacts) {
      const t = String(c.values[titleFieldId] ?? "").trim().toLowerCase();
      if (t && !byTitle.has(t)) byTitle.set(t, c.id);
    }
  }
  const deals = purgedDeals.map((d) => {
    if (d.contactId) return d;
    const match = Object.values(d.values).find(
      (v) => typeof v === "string" && byTitle.has(v.trim().toLowerCase()),
    );
    return match ? { ...d, contactId: byTitle.get(String(match).trim().toLowerCase())! } : d;
  });
  /** Migración a varios embudos: lo existente pasa al pipeline por defecto. */
  const pipelines = s.pipelines?.length ? s.pipelines : [{ id: DEFAULT_PIPELINE_ID, name: "Ventas" }];
  const firstPipeline = pipelines[0]!.id;
  const stages = (s.stages ?? []).map((st) =>
    st.pipelineId ? st : { ...st, pipelineId: firstPipeline },
  );
  const stageById = new Map(stages.map((st) => [st.id, st]));
  const dealsWithPipeline = deals.map((d) =>
    d.pipelineId ? d : { ...d, pipelineId: stageById.get(d.stageId)?.pipelineId ?? firstPipeline },
  );
  return {
    ...defaultState(),
    ...s,
    schemaVersion: SCHEMA_VERSION,
    contactFields,
    dealFields: ensureRoles(s.dealFields ?? [], true),
    events: (s.events ?? []).slice(0, MAX_EVENTS),
    savedViews: s.savedViews ?? [],
    pipelines,
    stages,
    deals: dealsWithPipeline,
    intake: s.intake ?? { key: `vk_${uid()}${uid()}`, logs: [] },
    contacts,
  };
}

/** Migra todas las organizaciones de un estado raíz ya parseado. */
export function migrateRootState(parsed: RootState): RootState {
  const tenants: Record<string, Tenant> = {};
  for (const [id, t] of Object.entries(parsed.tenants ?? {})) {
    const state = migrateTenantState(t.state);
    tenants[id] = { ...t, name: state.branding.companyName.trim() || t.name, state };
  }
  return { ...seedRootState(), ...parsed, tenants };
}

/** Borra las claves de versiones anteriores una vez migradas con éxito. */
export function dropLegacyKeys(storage: StorageLike) {
  try {
    for (const k of [...LEGACY_ROOT_KEYS, LEGACY_KEY]) storage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/**
 * Carga el estado raíz desde un almacenamiento (localStorage en la app, un
 * objeto en memoria en las pruebas), migrando claves antiguas una sola vez.
 */
export function loadRootFrom(storage: StorageLike): RootState {
  try {
    const current = storage.getItem(ROOT_KEY);
    const raw = current ?? LEGACY_ROOT_KEYS.map((k) => storage.getItem(k)).find(Boolean) ?? null;
    if (raw) {
      const next = migrateRootState(JSON.parse(raw) as RootState);
      try {
        storage.setItem(ROOT_KEY, JSON.stringify(next));
        dropLegacyKeys(storage);
      } catch {
        /* si no cabe, se conserva la clave antigua como respaldo */
      }
      return next;
    }
  } catch {
    /* ignore */
  }

  const root = seedRootState();
  try {
    const legacy = storage.getItem(LEGACY_KEY);
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
      try {
        storage.setItem(ROOT_KEY, JSON.stringify(root));
        dropLegacyKeys(storage);
      } catch {
        /* si no cabe, se conserva la clave antigua como respaldo */
      }
    }
  } catch {
    /* ignore */
  }
  return root;
}
