import { uid } from "./defaults";
import {
  companyField,
  defaultPipelineId,
  emailField,
  ownerField,
  phoneField,
  pipelineStages,
  statusField,
  titleField,
} from "./roles";
import type {
  ActivityEvent,
  Attribution,
  Contact,
  CrmState,
  Deal,
  FieldValues,
  IntakeLog,
} from "./types";

/**
 * Motor único de entrada de leads.
 *
 * Todas las vías (formulario público de la web, simulador de webhook y alta
 * manual) acaban aquí, así que la atribución, el historial y la regla de
 * conversión automática se aplican siempre igual.
 *
 * ⚠️ SIMULACIÓN: en producción el webhook es un endpoint de servidor
 * (por ejemplo `POST /api/public/leads`) que valida la FIRMA de la petición
 * (HMAC con la clave de la organización) antes de tocar la base de datos.
 * Aquí todo ocurre en el navegador y la clave es visible: nunca lo lleves así
 * a producción.
 */
export interface LeadInput {
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  message?: string;
  status?: string;
  /** Origen legible: "Formulario web", "Webhook", "Manual"... */
  source?: string;
  attribution?: Attribution;
}

export interface IntakeResult {
  state: CrmState;
  ok: boolean;
  message: string;
  contactId?: string;
  dealId?: string;
}

/** Convierte un JSON arbitrario en un LeadInput validado. */
export function parseLeadPayload(raw: string): { ok: true; input: LeadInput } | { ok: false; error: string } {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "El JSON no es válido." };
  }
  if (!data || typeof data !== "object") return { ok: false, error: "El cuerpo debe ser un objeto JSON." };
  const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string).trim() : undefined);
  const name = str("name") ?? str("nombre");
  if (!name) return { ok: false, error: "Falta el campo obligatorio “name”." };
  const email = str("email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "El email recibido no es válido." };
  const utm = (data["utm"] ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof utm[k] === "string" ? (utm[k] as string) : undefined);
  const attribution: Attribution = {
    ...(pick("source") ? { utmSource: pick("source")! } : {}),
    ...(pick("medium") ? { utmMedium: pick("medium")! } : {}),
    ...(pick("campaign") ? { utmCampaign: pick("campaign")! } : {}),
    ...(pick("term") ? { utmTerm: pick("term")! } : {}),
    ...(pick("content") ? { utmContent: pick("content")! } : {}),
    ...(str("referrer") ? { referrer: str("referrer")! } : {}),
    ...(str("landingPage") ? { landingPage: str("landingPage")! } : {}),
    firstSeenAt: new Date().toISOString(),
  };
  return {
    ok: true,
    input: {
      name,
      ...(email ? { email } : {}),
      ...(str("company") ? { company: str("company")! } : {}),
      ...(str("phone") ? { phone: str("phone")! } : {}),
      ...(str("message") ? { message: str("message")! } : {}),
      ...(str("status") ? { status: str("status")! } : {}),
      source: str("source") ?? "Webhook",
      attribution,
    },
  };
}

/** Ejemplo de cuerpo que espera el endpoint (se muestra en Ajustes › Entradas). */
export const INTAKE_EXAMPLE = `{
  "name": "Marta Gil",
  "email": "marta@empresa.com",
  "phone": "+34 600 111 222",
  "company": "Empresa S.L.",
  "message": "Quiero una demo esta semana",
  "utm": { "source": "google", "medium": "cpc", "campaign": "marca" },
  "referrer": "https://www.google.com/",
  "landingPage": "/precios"
}`;

/** Valores de contacto a partir de los roles configurados en la organización. */
function valuesFromInput(state: CrmState, input: LeadInput): FieldValues {
  const fields = state.contactFields;
  const values: FieldValues = {};
  const set = (id: string | undefined, v: string | undefined) => {
    if (id && v) values[id] = v;
  };
  set(titleField(fields)?.id, input.name);
  set(emailField(fields)?.id, input.email);
  set(companyField(fields)?.id, input.company);
  set(phoneField(fields)?.id, input.phone);
  const status = statusField(fields);
  if (status) values[status.id] = input.status ?? status.options?.[0] ?? "";
  const owner = ownerField(fields);
  if (owner) values[owner.id] = "";
  return values;
}

/**
 * Regla configurable: si el estado del lead coincide con el de la regla,
 * devuelve la oportunidad que hay que crear (o null si no aplica).
 */
export function dealFromRule(
  state: CrmState,
  contact: Contact,
  statusValue: string,
): Deal | null {
  const rule = state.leadToDeal;
  if (!rule?.enabled || !rule.statusValue) return null;
  if (statusValue.trim().toLowerCase() !== rule.statusValue.trim().toLowerCase()) return null;
  const pipelineId = rule.pipelineId || defaultPipelineId(state);
  const stages = pipelineStages(state, pipelineId);
  const stageId = stages.find((s) => s.id === rule.stageId)?.id ?? stages[0]?.id;
  if (!stageId) return null;
  const title = titleField(state.contactFields);
  const name = title ? String(contact.values[title.id] ?? "Oportunidad") : "Oportunidad";
  const dealTitle = titleField(state.dealFields);
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    stageId,
    pipelineId,
    contactId: contact.id,
    values: dealTitle ? { [dealTitle.id]: name } : {},
  };
}

/**
 * Crea el lead (y su oportunidad si la regla lo pide) sobre un estado de
 * organización, devolviendo el nuevo estado. Es una función pura: sirve tanto
 * dentro de la app como desde la web pública, donde no hay sesión iniciada.
 */
export function applyLeadIntake(
  state: CrmState,
  input: LeadInput,
  opts: { actorName?: string; logIntake?: boolean; payload?: string } = {},
): IntakeResult {
  const name = input.name?.trim();
  if (!name) {
    return { state, ok: false, message: "Falta el nombre del lead." };
  }
  const actorName = opts.actorName ?? input.source ?? "Entrada automática";
  const now = new Date().toISOString();
  const values = valuesFromInput(state, input);
  const contact: Contact = {
    id: uid(),
    createdAt: now,
    values,
    ...(input.attribution ? { attribution: input.attribution } : {}),
  };

  const statusValue = String(values[statusField(state.contactFields)?.id ?? ""] ?? "");
  const deal = dealFromRule({ ...state, contacts: [contact, ...state.contacts] }, contact, statusValue);

  const events: ActivityEvent[] = [
    {
      id: uid(),
      at: now,
      type: "contact.created",
      actorName,
      contactId: contact.id,
      text: `Alta desde ${input.source ?? "entrada automática"}`,
    },
  ];
  if (opts.logIntake) {
    events.unshift({
      id: uid(),
      at: now,
      type: "lead.intake",
      actorName,
      contactId: contact.id,
      text: input.source ?? "Webhook",
    });
  }
  if (deal) {
    events.unshift({
      id: uid(),
      at: now,
      type: "deal.auto",
      actorName,
      contactId: contact.id,
      dealId: deal.id,
      label: name,
      to: state.stages.find((s) => s.id === deal.stageId)?.name ?? "",
    });
  }

  const notes = input.message?.trim()
    ? [
        {
          id: uid(),
          createdAt: now,
          text: `Mensaje recibido: ${input.message.trim()}`,
          linkType: "contact" as const,
          linkId: contact.id,
        },
        ...state.notes,
      ]
    : state.notes;

  const log: IntakeLog = {
    id: uid(),
    at: now,
    source: input.source ?? "Webhook",
    ok: true,
    message: deal ? "Lead creado y oportunidad generada por la regla" : "Lead creado",
    contactId: contact.id,
    ...(deal ? { dealId: deal.id } : {}),
    ...(opts.payload ? { payload: opts.payload.slice(0, 400) } : {}),
  };

  return {
    state: {
      ...state,
      contacts: [contact, ...state.contacts],
      deals: deal ? [deal, ...state.deals] : state.deals,
      notes,
      events: [...events, ...state.events].slice(0, 500),
      ...(opts.logIntake
        ? {
            intake: {
              key: state.intake?.key ?? "",
              logs: [log, ...(state.intake?.logs ?? [])].slice(0, 20),
            },
          }
        : {}),
    },
    ok: true,
    message: log.message,
    contactId: contact.id,
    ...(deal ? { dealId: deal.id } : {}),
  };
}

/** Registra un intento fallido en el log de entradas. */
export function logIntakeError(state: CrmState, source: string, message: string, payload?: string): CrmState {
  const log: IntakeLog = {
    id: uid(),
    at: new Date().toISOString(),
    source,
    ok: false,
    message,
    ...(payload ? { payload: payload.slice(0, 400) } : {}),
  };
  return {
    ...state,
    intake: { key: state.intake?.key ?? "", logs: [log, ...(state.intake?.logs ?? [])].slice(0, 20) },
  };
}
