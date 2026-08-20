import { describe, expect, it } from "vitest";
import {
  LEGACY_KEY,
  ROOT_KEY,
  ensureRoles,
  loadRootFrom,
  migrateTenantState,
  type StorageLike,
} from "./migrate";
import { canWriteSettings, touchesSettings, writeTenantState } from "./permissions";
import { SCHEMA_VERSION, defaultState, seedRootState } from "./defaults";
import type { CrmState, RootState } from "./types";

/** localStorage falso: las pruebas no necesitan navegador. */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  };
}

describe("migraciones", () => {
  it("un estado antiguo sin embudos ni roles se migra sin perder datos", () => {
    const antiguo = {
      branding: { companyName: "Vieja S.L.", logo: "🏢", brandHue: "oklch(0.55 0.19 268)", theme: "light" },
      modules: { pipeline: true, tareas: true, notas: true },
      contactFields: [
        { id: "nombre", label: "Nombre", type: "text" },
        { id: "email", label: "Email", type: "email" },
      ],
      dealFields: [
        { id: "titulo", label: "Título", type: "text" },
        { id: "valor", label: "Valor", type: "currency" },
      ],
      stages: [{ id: "s1", name: "Nuevo", color: "oklch(0.7 0.1 250)" }],
      contacts: [{ id: "c1", createdAt: "2024-01-01T00:00:00.000Z", values: { nombre: "Ana Ruiz" } }],
      deals: [{ id: "d1", createdAt: "2024-01-01T00:00:00.000Z", stageId: "s1", values: { titulo: "Ana Ruiz", valor: 100 } }],
      tasks: [],
      notes: [],
      blocks: [],
      events: [],
      savedViews: [],
    } as unknown as CrmState;

    const m = migrateTenantState(antiguo);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.contacts).toHaveLength(1);
    expect(m.pipelines).toHaveLength(1);
    expect(m.stages[0]!.pipelineId).toBe(m.pipelines[0]!.id);
    expect(m.deals[0]!.pipelineId).toBe(m.pipelines[0]!.id);
    // Roles asignados y vínculo real deal → contacto creado una sola vez.
    expect(m.contactFields.find((f) => f.role === "title")?.id).toBe("nombre");
    expect(m.contactFields.find((f) => f.role === "email")?.id).toBe("email");
    expect(m.dealFields.find((f) => f.role === "amount")?.id).toBe("valor");
    expect(m.deals[0]!.contactId).toBe("c1");
    expect(m.intake?.key).toBeTruthy();
  });

  it("no se vuelve a aplicar: migrar dos veces no cambia la configuración", () => {
    const once = migrateTenantState(defaultState());
    const twice = migrateTenantState(once);
    expect(twice.contactFields).toEqual(once.contactFields);
    expect(twice.stages).toEqual(once.stages);
    expect(twice.pipelines).toEqual(once.pipelines);
  });

  it("respeta el rol company elegido por el usuario a partir de la v2", () => {
    const s = {
      ...defaultState(),
      schemaVersion: 2,
      contactFields: [
        { id: "nombre", label: "Nombre", type: "text", role: "title" },
        { id: "cuenta", label: "Cuenta", type: "text", role: "company" },
      ],
    } as CrmState;
    expect(migrateTenantState(s).contactFields.find((f) => f.role === "company")?.id).toBe("cuenta");
  });

  it("ensureRoles no pisa un rol ya asignado", () => {
    const fields = [
      { id: "a", label: "A", type: "text" as const },
      { id: "b", label: "B", type: "text" as const, role: "title" as const },
    ];
    expect(ensureRoles(fields, false).find((f) => f.role === "title")?.id).toBe("b");
  });

  it("migra la clave anterior y la borra al terminar", () => {
    const antiguo = { ...defaultState(), branding: { ...defaultState().branding, companyName: "Vieja S.L." } };
    const storage = memoryStorage({ [LEGACY_KEY]: JSON.stringify(antiguo) });
    const root = loadRootFrom(storage);
    const tenant = root.tenants["legacy"]!;
    expect(tenant.state.branding.companyName).toBe("Vieja S.L.");
    expect(tenant.state.contacts.length).toBeGreaterThan(0);
    expect(storage.getItem(LEGACY_KEY)).toBeNull();
    expect(storage.getItem(ROOT_KEY)).toBeTruthy();
  });

  it("arranca en limpio si no hay nada guardado", () => {
    const root = loadRootFrom(memoryStorage());
    expect(Object.keys(root.tenants)).toHaveLength(1);
    expect(root.currentUserId).toBeNull();
  });
});

/* ------------------------- Aislamiento y permisos ------------------------- */

function rootWith(currentUserId: string, currentTenantId = "t1"): RootState {
  const base = seedRootState();
  return {
    ...base,
    tenants: {
      t1: { id: "t1", name: "Uno", createdAt: "", state: { ...defaultState(), branding: { ...defaultState().branding, companyName: "Uno" } } },
      t2: { id: "t2", name: "Dos", createdAt: "", state: { ...defaultState(), branding: { ...defaultState().branding, companyName: "Dos" } } },
    },
    users: [
      { id: "admin", name: "Admin", email: "a@a.com", password: "x", memberships: [{ tenantId: "t1", role: "admin" }] },
      { id: "user", name: "Usuario", email: "u@u.com", password: "x", memberships: [{ tenantId: "t1", role: "user" }] },
      { id: "super", name: "Super", email: "s@s.com", password: "x", superAdmin: true, memberships: [] },
    ],
    currentUserId,
    currentTenantId,
  };
}

describe("aislamiento entre organizaciones", () => {
  it("escribir en una organización no toca la otra", () => {
    const r = rootWith("admin");
    const antes = r.tenants["t2"]!.state;
    const next = writeTenantState(r, (s) => ({ ...s, contacts: [] }));
    expect(next.tenants["t1"]!.state.contacts).toHaveLength(0);
    expect(next.tenants["t2"]!.state).toBe(antes);
    expect(next.tenants["t2"]!.state.contacts.length).toBeGreaterThan(0);
  });

  it("el nombre de la organización sale de branding.companyName", () => {
    const r = rootWith("admin");
    const next = writeTenantState(r, (s) => ({ ...s, branding: { ...s.branding, companyName: "Renombrada" } }));
    expect(next.tenants["t1"]!.name).toBe("Renombrada");
  });

  it("sin organización activa no se escribe nada", () => {
    const r = { ...rootWith("admin"), currentTenantId: null };
    expect(writeTenantState(r, (s) => ({ ...s, contacts: [] }))).toBe(r);
  });
});

describe("permisos de configuración", () => {
  it("solo administradores y super admin pueden escribir configuración", () => {
    expect(canWriteSettings(rootWith("admin"))).toBe(true);
    expect(canWriteSettings(rootWith("super"))).toBe(true);
    expect(canWriteSettings(rootWith("user"))).toBe(false);
    expect(canWriteSettings({ ...rootWith("user"), currentUserId: null })).toBe(false);
    // Un admin de t1 no lo es en t2.
    expect(canWriteSettings(rootWith("admin", "t2"))).toBe(false);
  });

  it("detecta qué claves son configuración", () => {
    const a = defaultState();
    expect(touchesSettings(a, { ...a, contacts: [] })).toBe(false);
    expect(touchesSettings(a, { ...a, stages: [] })).toBe(true);
    expect(touchesSettings(a, { ...a, branding: { ...a.branding } })).toBe(true);
  });

  it("un usuario sin rol admin no puede cambiar campos ni etapas, pero sí datos", () => {
    const r = rootWith("user");
    const rechazado = writeTenantState(r, (s) => ({ ...s, contactFields: [] }));
    expect(rechazado).toBe(r);
    const aceptado = writeTenantState(r, (s) => ({ ...s, contacts: [] }));
    expect(aceptado.tenants["t1"]!.state.contacts).toHaveLength(0);
  });
});
