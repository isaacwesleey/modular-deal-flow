import type { CrmState, RootState } from "./types";

/**
 * Permisos en la capa de datos (puros, testeables sin interfaz).
 *
 * ⚠️ En producción esto NO es una garantía: cualquiera puede editar el estado
 * del navegador. La misma regla tiene que estar respaldada por permisos en el
 * servidor (RLS / políticas de backend).
 */

/** Claves de CrmState que forman la CONFIGURACIÓN de la organización. */
export const SETTINGS_KEYS = ["branding", "modules", "contactFields", "dealFields", "stages"] as const;

export function touchesSettings(before: CrmState, after: CrmState): boolean {
  return SETTINGS_KEYS.some((k) => before[k] !== after[k]);
}

/** ¿El usuario activo puede escribir la configuración de la organización? */
export function canWriteSettings(r: RootState): boolean {
  const u = r.users.find((x) => x.id === r.currentUserId);
  if (!u) return false;
  if (u.superAdmin) return true;
  return u.memberships.some((m) => m.tenantId === r.currentTenantId && m.role === "admin");
}

/**
 * Escritura del estado de la organización activa: aísla los datos por tenant y
 * descarta los cambios de configuración si el usuario no es administrador.
 */
export function writeTenantState(r: RootState, updater: (s: CrmState) => CrmState): RootState {
  const id = r.currentTenantId;
  const t = id ? r.tenants[id] : null;
  if (!id || !t) return r;
  const next = updater(t.state);
  if (!canWriteSettings(r) && touchesSettings(t.state, next)) {
    if (typeof console !== "undefined") {
      console.warn("[crm] Cambio de configuración rechazado: se requiere rol de administrador.");
    }
    return r;
  }
  // Fuente de verdad única: el nombre vive en branding.companyName.
  const name = next.branding.companyName.trim() || t.name;
  return { ...r, tenants: { ...r.tenants, [id]: { ...t, name, state: next } } };
}
