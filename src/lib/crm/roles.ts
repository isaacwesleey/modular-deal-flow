import type { Contact, CrmState, Deal, FieldDef, FieldValues } from "./types";

/** Campo marcado como título/nombre (con fallback al primer campo). */
export function titleField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "title") ?? fields[0];
}

/** Campo marcado como importe (solo si existe un rol explícito). */
export function amountField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "amount");
}

/** Campo marcado como estado del lead. */
export function statusField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "status");
}

/** Campo marcado como propietario asignado. */
export function ownerField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "owner");
}

/**
 * Campos de contacto identificados por rol explícito.
 * El fallback por tipo solo actúa en estados antiguos sin rol asignado;
 * la fuente de verdad es siempre el rol configurado en Ajustes.
 */
export function companyField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "company");
}

export function emailField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "email") ?? fields.find((f) => f.type === "email");
}

export function phoneField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "phone") ?? fields.find((f) => f.type === "phone");
}

/** Oportunidades vinculadas a un contacto por relación real (contactId). */
export function contactDeals(state: CrmState, contactId: string): Deal[] {
  return state.deals.filter((d) => d.contactId === contactId && !d.deletedAt);
}

/** Oportunidades activas (fuera de la papelera). */
export function activeDeals(state: CrmState): Deal[] {
  return state.deals.filter((d) => !d.deletedAt);
}

/** Oportunidades en la papelera. */
export function trashedDeals(state: CrmState): Deal[] {
  return state.deals.filter((d) => d.deletedAt);
}

/** Contactos activos (fuera de la papelera). */
export function activeContacts(state: CrmState): Contact[] {
  return state.contacts.filter((c) => !c.deletedAt);
}

/** Contactos en la papelera. */
export function trashedContacts(state: CrmState): Contact[] {
  return state.contacts.filter((c) => c.deletedAt);
}

/** Días que un registro permanece en la papelera antes del borrado definitivo. */
export const TRASH_DAYS = 30;

export function trashDaysLeft(deletedAt: string): number {
  const ms = new Date(deletedAt).getTime() + TRASH_DAYS * 86400000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function recordTitle(fields: FieldDef[], values: FieldValues, fallback = "Sin título"): string {
  const f = titleField(fields);
  const raw = f ? values[f.id] : undefined;
  const text = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "").trim();
  return text || fallback;
}

export function dealAmount(fields: FieldDef[], deal: Deal): number {
  const f = amountField(fields);
  if (!f) return 0;
  return Number(deal.values[f.id]) || 0;
}

export function sumDeals(fields: FieldDef[], deals: Deal[]): number {
  return deals.reduce((a, d) => a + dealAmount(fields, d), 0);
}

/** true si el campo no se puede borrar (core o con rol asignado). */
export function isProtectedField(f: FieldDef): boolean {
  return Boolean(f.core || f.role);
}

/** Deals cuyo stageId ya no corresponde a ninguna etapa existente. */
export function orphanDeals(state: CrmState): Deal[] {
  const ids = new Set(state.stages.map((s) => s.id));
  return state.deals.filter((d) => !ids.has(d.stageId) && !d.deletedAt);
}