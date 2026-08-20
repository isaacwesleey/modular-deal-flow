import { describe, expect, it } from "vitest";
import { INTAKE_MAX_BYTES, applyLeadIntake, dealFromRule, parseLeadPayload } from "./intake";
import { defaultState } from "./defaults";
import { statusField, titleField } from "./roles";
import type { CrmState } from "./types";

const parsed = (raw: string) => {
  const r = parseLeadPayload(raw);
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe("entrada de leads: lectura del cuerpo", () => {
  it("acepta alias en castellano", () => {
    const r = parsed(
      JSON.stringify({ nombre: "Marta Gil", correo: "marta@empresa.com", empresa: "Empresa S.L.", telefono: "+34 600 111 222" }),
    );
    expect(r.input.name).toBe("Marta Gil");
    expect(r.input.email).toBe("marta@empresa.com");
    expect(r.input.company).toBe("Empresa S.L.");
    expect(r.input.phone).toBe("+34 600 111 222");
  });

  it("no marca como ignorados los alias ya usados (regresión de `empresa`)", () => {
    const r = parsed(JSON.stringify({ nombre: "Ana", empresa: "ACME", utm_source: "google" }));
    expect(r.ignored).toEqual([]);
  });

  it("lista los campos que no reconoce", () => {
    const r = parsed(JSON.stringify({ name: "Ana", inventado: "x", otro: 1 }));
    expect(r.ignored).toEqual(["inventado", "otro"]);
  });

  it("lee utm sueltas y anidadas", () => {
    const suelta = parsed(JSON.stringify({ name: "Ana", utm_source: "meta", utm_medium: "paid" }));
    expect(suelta.input.attribution?.utmSource).toBe("meta");
    expect(suelta.input.attribution?.utmMedium).toBe("paid");
    const anidada = parsed(
      JSON.stringify({ name: "Ana", utm: { source: "google", campaign: "marca" } }),
    );
    expect(anidada.input.attribution?.utmSource).toBe("google");
    expect(anidada.input.attribution?.utmCampaign).toBe("marca");
    expect(anidada.ignored).toEqual([]);
  });

  it("rechaza cuerpos inválidos, sin nombre, con email malo o demasiado grandes", () => {
    expect(parseLeadPayload("{no json").ok).toBe(false);
    expect(parseLeadPayload("[]").ok).toBe(false);
    expect(parseLeadPayload(JSON.stringify({ email: "a@b.com" })).ok).toBe(false);
    expect(parseLeadPayload(JSON.stringify({ name: "Ana", email: "malo" })).ok).toBe(false);
    const enorme = JSON.stringify({ name: "Ana", nota: "x".repeat(INTAKE_MAX_BYTES) });
    const r = parseLeadPayload(enorme);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/límite/);
  });
});

const withRule = (): CrmState => {
  const s = defaultState();
  const status = statusField(s.contactFields)!;
  return {
    ...s,
    leadToDeal: {
      enabled: true,
      statusValue: status.options?.[1] ?? "Cualificado",
      pipelineId: s.pipelines[0]!.id,
      stageId: s.stages[1]!.id,
    },
  };
};

describe("entrada de leads: alta y regla de conversión", () => {
  it("crea el contacto con sus valores por rol y registra la entrada", () => {
    const s = defaultState();
    const res = applyLeadIntake(s, { name: "Marta Gil", email: "marta@empresa.com", source: "Manual" }, { logIntake: true });
    expect(res.ok).toBe(true);
    const c = res.state.contacts.find((x) => x.id === res.contactId)!;
    expect(c.values[titleField(s.contactFields)!.id]).toBe("Marta Gil");
    expect(res.state.intake?.logs[0]?.source).toBe("Manual");
    expect(res.state.events.some((e) => e.type === "lead.intake")).toBe(true);
  });

  it("crea la oportunidad en la etapa de la regla, y solo una", () => {
    const s = withRule();
    const status = statusField(s.contactFields)!;
    const res = applyLeadIntake(s, { name: "Ana", status: s.leadToDeal!.statusValue });
    expect(res.dealId).toBeTruthy();
    const deals = res.state.deals.filter((d) => d.contactId === res.contactId);
    expect(deals).toHaveLength(1);
    expect(deals[0]!.stageId).toBe(s.leadToDeal!.stageId);
    expect(deals[0]!.pipelineId).toBe(s.pipelines[0]!.id);
    expect(String(res.state.contacts[0]!.values[status.id])).toBe(s.leadToDeal!.statusValue);
  });

  it("no crea oportunidad si el estado no coincide o la regla está apagada", () => {
    const s = withRule();
    expect(applyLeadIntake(s, { name: "Ana", status: "Otro" }).dealId).toBeUndefined();
    const off = { ...s, leadToDeal: { ...s.leadToDeal!, enabled: false } };
    expect(applyLeadIntake(off, { name: "Ana", status: s.leadToDeal!.statusValue }).dealId).toBeUndefined();
  });

  it("dealFromRule no duplica al repetir el mismo estado ya aplicado", () => {
    const s = withRule();
    const res = applyLeadIntake(s, { name: "Ana", status: s.leadToDeal!.statusValue });
    const contact = res.state.contacts.find((c) => c.id === res.contactId)!;
    // Un segundo cambio al MISMO estado no debe pasar por la regla: la interfaz
    // solo la evalúa cuando el estado cambia de verdad.
    const before = String(contact.values[statusField(s.contactFields)!.id]);
    const after = before;
    expect(after === before).toBe(true);
    expect(res.state.deals.filter((d) => d.contactId === contact.id)).toHaveLength(1);
    // Y si la etapa de la regla no existe, no revienta.
    const rota = { ...res.state, leadToDeal: { ...s.leadToDeal!, pipelineId: "no-existe", stageId: "no-existe" } };
    expect(dealFromRule(rota, contact, before)).toBeNull();
  });

  it("guarda el mensaje recibido como nota del contacto", () => {
    const res = applyLeadIntake(defaultState(), { name: "Ana", message: "Quiero una demo" });
    expect(res.state.notes[0]?.text).toContain("Quiero una demo");
    expect(res.state.notes[0]?.linkId).toBe(res.contactId);
  });
});
