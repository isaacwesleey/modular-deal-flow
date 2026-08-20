import { describe, expect, it } from "vitest";
import {
  amountField,
  companyField,
  dealAmount,
  emailField,
  isProtectedField,
  ownerField,
  phoneField,
  recordTitle,
  statusField,
  sumDeals,
  titleField,
} from "./roles";
import { defaultState } from "./defaults";
import type { Deal, FieldDef } from "./types";

const contactFields = (): FieldDef[] => [
  { id: "nombre", label: "Nombre", type: "text", role: "title" },
  { id: "email", label: "Email", type: "email", role: "email" },
  { id: "telefono", label: "Teléfono", type: "phone", role: "phone" },
  { id: "empresa", label: "Empresa", type: "text", role: "company" },
  { id: "estado", label: "Estado", type: "select", role: "status", options: ["Nuevo"] },
  { id: "owner", label: "Propietario", type: "user", role: "owner" },
];

describe("motor de campos y roles", () => {
  it("resuelve los siete roles por su rol, no por su posición", () => {
    const f = contactFields();
    expect(titleField(f)?.id).toBe("nombre");
    expect(emailField(f)?.id).toBe("email");
    expect(phoneField(f)?.id).toBe("telefono");
    expect(companyField(f)?.id).toBe("empresa");
    expect(statusField(f)?.id).toBe("estado");
    expect(ownerField(f)?.id).toBe("owner");
    expect(amountField(defaultState().dealFields)).toBeDefined();
  });

  it("renombrar un campo no rompe la resolución de roles", () => {
    const f = contactFields().map((x) =>
      x.id === "empresa" ? { ...x, label: "Razón social" } : x,
    );
    expect(companyField(f)?.id).toBe("empresa");
    expect(recordTitle(f, { nombre: "Ana Ruiz" })).toBe("Ana Ruiz");
  });

  it("reordenar los campos no cambia el título ni el importe", () => {
    const f = [...contactFields()].reverse();
    expect(titleField(f)?.id).toBe("nombre");
    expect(recordTitle(f, { nombre: "Ana" })).toBe("Ana");
  });

  it("el título cae al primer campo si nadie tiene el rol", () => {
    const f: FieldDef[] = [
      { id: "a", label: "A", type: "text" },
      { id: "b", label: "B", type: "text" },
    ];
    expect(titleField(f)?.id).toBe("a");
    expect(recordTitle(f, {}, "Sin nombre")).toBe("Sin nombre");
  });

  it("suma importes solo por el campo con rol amount", () => {
    const fields: FieldDef[] = [
      { id: "t", label: "T", type: "text", role: "title" },
      { id: "valor", label: "Valor", type: "currency", role: "amount" },
      { id: "otro", label: "Otro", type: "number" },
    ];
    const deals: Deal[] = [
      { id: "d1", createdAt: "", stageId: "s1", values: { valor: 100, otro: 999 } },
      { id: "d2", createdAt: "", stageId: "s1", values: { valor: "250" } },
    ];
    expect(dealAmount(fields, deals[0]!)).toBe(100);
    expect(sumDeals(fields, deals)).toBe(350);
    expect(sumDeals([{ id: "t", label: "T", type: "text" }], deals)).toBe(0);
  });

  it("protege los campos con rol o core frente al borrado", () => {
    expect(isProtectedField({ id: "a", label: "A", type: "text", role: "title" })).toBe(true);
    expect(isProtectedField({ id: "a", label: "A", type: "text", core: true })).toBe(true);
    expect(isProtectedField({ id: "a", label: "A", type: "text" })).toBe(false);
  });
});
