import { describe, expect, it } from "vitest";
import { describeErrors, hasErrors, isEmptyValue, validateField, validateValues } from "./validation";
import type { FieldDef } from "./types";

const f = (p: Partial<FieldDef>): FieldDef => ({ id: "x", label: "X", type: "text", ...p });

describe("validación de campos", () => {
  it("detecta valores vacíos de cualquier tipo", () => {
    expect(isEmptyValue("")).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(false)).toBe(false);
  });

  it("obligatorio: falla vacío y pasa con contenido", () => {
    expect(validateField(f({ required: true }), "")).toMatch(/obligatorio/);
    expect(validateField(f({ required: true }), "hola")).toBeNull();
    expect(validateField(f({}), "")).toBeNull();
  });

  it("email, teléfono y url comprueban el formato", () => {
    expect(validateField(f({ type: "email" }), "ana@dominio.com")).toBeNull();
    expect(validateField(f({ type: "email" }), "ana@dominio")).toMatch(/email/);
    expect(validateField(f({ type: "phone" }), "+34 611 223 344")).toBeNull();
    expect(validateField(f({ type: "phone" }), "12")).toMatch(/teléfono/);
    expect(validateField(f({ type: "url" }), "https://ventia.io")).toBeNull();
    expect(validateField(f({ type: "url" }), "ftp://ventia.io")).toMatch(/http/);
    expect(validateField(f({ type: "url" }), "ventia")).toMatch(/válida/);
  });

  it("números y moneda respetan mínimo y máximo, incluidos los límites", () => {
    const campo = f({ type: "number", min: 10, max: 20 });
    expect(validateField(campo, 10)).toBeNull();
    expect(validateField(campo, 20)).toBeNull();
    expect(validateField(campo, 9)).toMatch(/mínimo/);
    expect(validateField(campo, 21)).toMatch(/máximo/);
    expect(validateField(campo, "abc")).toMatch(/número/);
  });

  it("las fechas comparan contra el rango configurado", () => {
    const campo = f({ type: "date", min: "2026-01-01", max: "2026-12-31" });
    expect(validateField(campo, "2026-06-15")).toBeNull();
    expect(validateField(campo, "2026-01-01")).toBeNull();
    expect(validateField(campo, "2025-12-31")).toMatch(/anterior/);
    expect(validateField(campo, "2027-01-01")).toMatch(/posterior/);
    expect(validateField(campo, "no-es-fecha")).toMatch(/no válida/);
  });

  it("selectores y etiquetas solo admiten opciones existentes", () => {
    const sel = f({ type: "select", options: ["Nuevo", "Cliente"] });
    expect(validateField(sel, "Cliente")).toBeNull();
    expect(validateField(sel, "Inventado")).toMatch(/opciones/);
    const multi = f({ type: "multiselect", options: ["VIP", "Web"] });
    expect(validateField(multi, ["VIP"])).toBeNull();
    expect(validateField(multi, ["VIP", "Otra"])).toMatch(/Otra/);
  });

  it("min y max miden longitud en los campos de texto", () => {
    const campo = f({ min: 3, max: 5 });
    expect(validateField(campo, "abc")).toBeNull();
    expect(validateField(campo, "ab")).toMatch(/al menos 3/);
    expect(validateField(campo, "abcdef")).toMatch(/superar los 5/);
  });

  it("valida un registro completo y lo resume", () => {
    const fields = [
      f({ id: "nombre", label: "Nombre", required: true }),
      f({ id: "email", label: "Email", type: "email" }),
    ];
    const errors = validateValues(fields, { nombre: "", email: "malo" });
    expect(hasErrors(errors)).toBe(true);
    expect(Object.keys(errors)).toEqual(["nombre", "email"]);
    expect(describeErrors(fields, errors)).toContain("Nombre:");
    expect(hasErrors(validateValues(fields, { nombre: "Ana", email: "a@b.com" }))).toBe(false);
  });
});
