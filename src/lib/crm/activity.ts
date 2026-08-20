import type { ActivityEvent, ActivityType, FieldDef, FieldValues } from "./types";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  "contact.created": "Lead creado",
  "contact.status": "Cambio de estado",
  "contact.owner": "Cambio de propietario",
  "contact.field": "Campo modificado",
  "contact.deleted": "Enviado a la papelera",
  "contact.restored": "Restaurado desde la papelera",
  "note.added": "Nota añadida",
  "task.created": "Tarea creada",
  "task.done": "Tarea completada",
  "task.deleted": "Tarea eliminada",
  "note.deleted": "Nota eliminada",
  "deal.linked": "Oportunidad vinculada",
  "deal.stage": "Cambio de etapa",
};

const asText = (v: unknown): string => {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ") || "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
};

/** Compara dos juegos de valores y devuelve los eventos correspondientes. */
export function diffValues(
  fields: FieldDef[],
  before: FieldValues,
  after: FieldValues,
): Pick<ActivityEvent, "type" | "label" | "from" | "to">[] {
  const out: Pick<ActivityEvent, "type" | "label" | "from" | "to">[] = [];
  for (const f of fields) {
    const a = asText(before[f.id]);
    const b = asText(after[f.id]);
    if (a === b) continue;
    const type: ActivityType =
      f.role === "status" ? "contact.status" : f.role === "owner" ? "contact.owner" : "contact.field";
    out.push({ type, label: f.label, from: a, to: b });
  }
  return out;
}
