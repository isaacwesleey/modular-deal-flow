import { useCrm } from "@/lib/crm/store";
import { MAIN_TENANT, uid } from "@/lib/crm/defaults";
import { getStoredAttribution, syncAttributionConsent } from "@/lib/crm/attribution";
import {
  companyField,
  emailField,
  ownerField,
  phoneField,
  statusField,
  titleField,
} from "@/lib/crm/roles";
import type { Contact, FieldValues } from "@/lib/crm/types";

/**
 * Organización que recibe los leads del formulario público de la web.
 * Si no existe (espacio de trabajo nuevo o eliminada), se usa la primera
 * organización disponible; si no hay ninguna, se avisa al visitante.
 */
export const MAIN_TENANT_ID = MAIN_TENANT;

export interface PublicLeadInput {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
}

/**
 * Crea un lead real desde la web pública (sin sesión iniciada) en la
 * organización principal, con la atribución capturada en la visita.
 * En producción esto sería un POST a la API; aquí escribe en localStorage.
 */
export function usePublicLead() {
  const { root, setRoot } = useCrm();

  return (input: PublicLeadInput): { ok: boolean; error?: string } => {
    const tenantId = root.tenants[MAIN_TENANT_ID] ? MAIN_TENANT_ID : Object.keys(root.tenants)[0];
    const tenant = tenantId ? root.tenants[tenantId] : undefined;
    if (!tenantId || !tenant) return {
        ok: false,
        error:
          "Ahora mismo no podemos recoger tu solicitud. Escríbenos a hola@ventia.app y te respondemos enseguida.",
      };

    const fields = tenant.state.contactFields;
    const values: FieldValues = {};
    const set = (id: string | undefined, v: string | undefined) => {
      if (id && v) values[id] = v;
    };
    set(titleField(fields)?.id, input.name);
    set(emailField(fields)?.id, input.email);
    set(companyField(fields)?.id, input.company);
    set(phoneField(fields)?.id, input.phone);

    const status = statusField(fields);
    if (status?.options?.length) values[status.id] = status.options[0]!;
    const owner = ownerField(fields);
    if (owner) values[owner.id] = "";

    // Si el visitante rechazó las cookies de marketing, el lead se crea sin origen.
    const attribution = getStoredAttribution() ?? syncAttributionConsent() ?? undefined;
    const contact: Contact = {
      id: uid(),
      createdAt: new Date().toISOString(),
      values,
      ...(attribution ? { attribution } : {}),
    };

    const note = input.message?.trim()
      ? {
          id: uid(),
          createdAt: contact.createdAt,
          text: `Mensaje desde la web: ${input.message.trim()}`,
          linkType: "contact" as const,
          linkId: contact.id,
        }
      : null;

    setRoot((r) => {
      const t = r.tenants[tenantId];
      if (!t) return r;
      return {
        ...r,
        tenants: {
          ...r.tenants,
          [tenantId]: {
            ...t,
            state: {
              ...t.state,
              contacts: [contact, ...t.state.contacts],
              ...(note ? { notes: [note, ...t.state.notes] } : {}),
              events: [
                {
                  id: uid(),
                  at: contact.createdAt,
                  type: "contact.created" as const,
                  actorName: "Formulario web",
                  contactId: contact.id,
                  text: "Alta automática desde la web de Ventia",
                },
                ...t.state.events,
              ],
            },
          },
        },
      };
    });

    return { ok: true };
  };
}
