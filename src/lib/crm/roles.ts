import type { CrmState, Deal, FieldDef, FieldValues } from "./types";

/** Campo marcado como título/nombre (con fallback al primer campo). */
export function titleField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "title") ?? fields[0];
}

/** Campo marcado como importe (solo si existe un rol explícito). */
export function amountField(fields: FieldDef[]): FieldDef | undefined {
  return fields.find((f) => f.role === "amount");
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
  return state.deals.filter((d) => !ids.has(d.stageId));
}