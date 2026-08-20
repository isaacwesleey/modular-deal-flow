import type { FieldDef, FieldValues } from "./types";

/**
 * Validación de campos personalizados.
 *
 * Es la única fuente de verdad: formularios, edición en línea de la ficha e
 * importación de CSV llaman aquí, así que un campo obligatorio o un email mal
 * escrito se rechazan igual entren por donde entren.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d][\d\s().-]{5,24}$/;

/** true si el valor cuenta como vacío para cualquier tipo de campo. */
export function isEmptyValue(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    v === "" ||
    (Array.isArray(v) && v.length === 0)
  );
}

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Devuelve el mensaje de error del campo, o null si el valor es válido. */
export function validateField(field: FieldDef, value: unknown): string | null {
  if (isEmptyValue(value)) {
    return field.required ? "Este campo es obligatorio." : null;
  }
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  const min = num(field.min);
  const max = num(field.max);

  switch (field.type) {
    case "email":
      if (!EMAIL_RE.test(text.trim())) return "Escribe un email válido (nombre@dominio.com).";
      break;
    case "phone":
      if (!PHONE_RE.test(text.trim())) return "Escribe un teléfono válido (solo dígitos, espacios y + ( ) - ).";
      break;
    case "url":
      try {
        const u = new URL(text.trim());
        if (!/^https?:$/.test(u.protocol)) return "La dirección debe empezar por http:// o https://";
      } catch {
        return "Escribe una dirección válida (https://…).";
      }
      break;
    case "number":
    case "currency": {
      const n = num(value);
      if (n === undefined) return "Escribe un número válido.";
      if (min !== undefined && n < min) return `El valor mínimo es ${min}.`;
      if (max !== undefined && n > max) return `El valor máximo es ${max}.`;
      return null;
    }
    case "date": {
      const d = String(value).slice(0, 10);
      if (Number.isNaN(new Date(d).getTime())) return "Fecha no válida.";
      if (field.min && d < String(field.min)) return `La fecha no puede ser anterior a ${field.min}.`;
      if (field.max && d > String(field.max)) return `La fecha no puede ser posterior a ${field.max}.`;
      return null;
    }
    case "select":
      if (field.options?.length && !field.options.includes(text))
        return "Elige una de las opciones disponibles.";
      return null;
    case "multiselect":
      if (field.options?.length && Array.isArray(value)) {
        const bad = (value as unknown[]).map(String).filter((v) => !field.options!.includes(v));
        if (bad.length) return `Opciones no válidas: ${bad.join(", ")}.`;
      }
      return null;
    case "checkbox":
    case "user":
      return null;
    default:
      break;
  }

  // Longitud para los campos de texto (incluye email, teléfono y url).
  if (min !== undefined && text.trim().length < min)
    return `Escribe al menos ${min} caracteres.`;
  if (max !== undefined && text.trim().length > max)
    return `No puede superar los ${max} caracteres.`;
  return null;
}

export type FieldErrors = Record<string, string>;

/** Valida un registro completo y devuelve los errores por id de campo. */
export function validateValues(fields: FieldDef[], values: FieldValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const f of fields) {
    const error = validateField(f, values[f.id]);
    if (error) errors[f.id] = error;
  }
  return errors;
}

export const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;

/** Resumen legible para avisos de importación. */
export function describeErrors(fields: FieldDef[], errors: FieldErrors): string {
  return Object.entries(errors)
    .map(([id, msg]) => `${fields.find((f) => f.id === id)?.label ?? id}: ${msg}`)
    .join(" · ");
}
