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
  /**
   * Valores ya montados sobre los campos personalizados (alta manual e
   * importación de CSV). Mandan sobre los derivados de los roles.
   */
  values?: FieldValues;
}

export interface IntakeResult {
  state: CrmState;
  ok: boolean;
  message: string;
  contactId?: string;
  dealId?: string;
}

/**
 * Tamaño máximo del cuerpo aceptado (10 KB).
 * ⚠️ En producción este límite lo aplica el servidor ANTES de leer el cuerpo,
 * junto con la validación de firma y un límite de peticiones por minuto.
 */
export const INTAKE_MAX_BYTES = 10 * 1024;

/** Nombres alternativos aceptados en el cuerpo (castellano e inglés). */
const ALIASES: Record<string, string[]> = {
  name: ["name", "nombre", "fullname", "full_name", "nombre_completo"],
  email: ["email", "correo", "mail", "e-mail"],
  company: ["company", "empresa", "organizacion", "organización"],
  phone: ["phone", "telefono", "teléfono", "tel", "movil", "móvil"],
  message: ["message", "mensaje", "comentario", "comentarios", "notas"],
  status: ["status", "estado"],
  source: ["source", "origen"],
  referrer: ["referrer", "referer", "referencia"],
  landingPage: ["landingPage", "landing_page", "pagina", "página", "landing"],
};

const UTM_ALIASES: Record<string, string[]> = {
  utmSource: ["utm_source", "utmSource"],
  utmMedium: ["utm_medium", "utmMedium"],
  utmCampaign: ["utm_campaign", "utmCampaign"],
  utmTerm: ["utm_term", "utmTerm"],
  utmContent: ["utm_content", "utmContent"],
};

/**
 * Convierte un JSON arbitrario en un LeadInput validado.
 * Acepta alias en castellano y utm sueltas (`utm_source`) o anidadas (`utm.source`),
 * y devuelve la lista de claves que ha ignorado para poder avisar de erratas.
 */
export function parseLeadPayload(
  raw: string,
): { ok: true; input: LeadInput; ignored: string[] } | { ok: false; error: string } {
  if (raw.length > INTAKE_MAX_BYTES)
    return {
      ok: false,
      error: `El cuerpo supera el límite de ${Math.round(INTAKE_MAX_BYTES / 1024)} KB.`,
    };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "El JSON no es válido." };
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    return { ok: false, error: "El cuerpo debe ser un objeto JSON." };

  const used = new Set<string>();
  /** Primer alias presente con valor de texto. */
  const pickAlias = (names: string[]): string | undefined => {
    for (const n of names) {
      const key = Object.keys(data).find((k) => k.toLowerCase() === n.toLowerCase());
      if (!key) continue;
      used.add(key);
      const v = data[key];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    return undefined;
  };
  const get = (field: keyof typeof ALIASES) => pickAlias(ALIASES[field]!);

  const name = get("name");
  if (!name) return { ok: false, error: "Falta el campo obligatorio “name”." };
  const email = get("email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "El email recibido no es válido." };

  // utm anidadas (`"utm": { "source": ... }`) o sueltas (`"utm_source": ...`).
  const utmObj =
    data["utm"] && typeof data["utm"] === "object" && !Array.isArray(data["utm"])
      ? (data["utm"] as Record<string, unknown>)
      : undefined;
  if (utmObj) used.add(Object.keys(data).find((k) => k.toLowerCase() === "utm")!);
  const nested = (k: string) =>
    utmObj && typeof utmObj[k] === "string" && (utmObj[k] as string).trim()
      ? (utmObj[k] as string).trim()
      : undefined;
  const utmValue = (key: keyof typeof UTM_ALIASES, short: string) =>
    nested(short) ?? pickAlias(UTM_ALIASES[key]!);

  const attribution: Attribution = {
    ...(utmValue("utmSource", "source") ? { utmSource: utmValue("utmSource", "source")! } : {}),
    ...(utmValue("utmMedium", "medium") ? { utmMedium: utmValue("utmMedium", "medium")! } : {}),
    ...(utmValue("utmCampaign", "campaign") ? { utmCampaign: utmValue("utmCampaign", "campaign")! } : {}),
    ...(utmValue("utmTerm", "term") ? { utmTerm: utmValue("utmTerm", "term")! } : {}),
    ...(utmValue("utmContent", "content") ? { utmContent: utmValue("utmContent", "content")! } : {}),
    ...(get("referrer") ? { referrer: get("referrer")! } : {}),
    ...(get("landingPage") ? { landingPage: get("landingPage")! } : {}),
    firstSeenAt: new Date().toISOString(),
  };

  // Leemos todos los campos ANTES de calcular los ignorados: `used` se llena
  // dentro de pickAlias, así que cualquier lectura posterior daría un falso
  // positivo de "campo ignorado".
  const company = get("company");
  const phone = get("phone");
  const message = get("message");
  const status = get("status");
  const source = get("source");
  const ignored = Object.keys(data).filter((k) => !used.has(k));
  return {
    ok: true,
    ignored,
    input: {
      name,
      ...(email ? { email } : {}),
      ...(company ? { company } : {}),
      ...(phone ? { phone } : {}),
      ...(message ? { message } : {}),
      ...(status ? { status } : {}),
      source: source ?? "Webhook",
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
  const values: FieldValues = { ...(input.values ?? {}) };
  const set = (id: string | undefined, v: string | undefined) => {
    if (id && v) values[id] = v;
  };
  set(titleField(fields)?.id, input.name);
  set(emailField(fields)?.id, input.email);
  set(companyField(fields)?.id, input.company);
  set(phoneField(fields)?.id, input.phone);
  const status = statusField(fields);
  if (status && !values[status.id]) values[status.id] = input.status ?? status.options?.[0] ?? "";
  const owner = ownerField(fields);
  if (owner && values[owner.id] === undefined) values[owner.id] = "";
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
