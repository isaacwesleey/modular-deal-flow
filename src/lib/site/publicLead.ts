import { useCrm } from "@/lib/crm/store";
import { MAIN_TENANT } from "@/lib/crm/defaults";
import { getStoredAttribution, syncAttributionConsent } from "@/lib/crm/attribution";
import { applyLeadIntake } from "@/lib/crm/intake";

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
 * Crea un lead real desde la web pública (sin sesión iniciada).
 * Usa el mismo motor de entrada que el webhook y el alta manual, así que
 * también aplica la regla de conversión automática a oportunidad.
 * En producción esto sería un POST a la API; aquí escribe en localStorage.
 */
export function usePublicLead() {
  const { root, setRoot } = useCrm();

  return (input: PublicLeadInput): { ok: boolean; error?: string } => {
    const tenantId = root.tenants[MAIN_TENANT_ID] ? MAIN_TENANT_ID : Object.keys(root.tenants)[0];
    const tenant = tenantId ? root.tenants[tenantId] : undefined;
    if (!tenantId || !tenant)
      return {
        ok: false,
        error:
          "Ahora mismo no podemos recoger tu solicitud. Escríbenos a hola@ventia.app y te respondemos enseguida.",
      };

    // Si el visitante rechazó las cookies de marketing, el lead se crea sin origen.
    const attribution = getStoredAttribution() ?? syncAttributionConsent() ?? undefined;

    setRoot((r) => {
      const t = r.tenants[tenantId];
      if (!t) return r;
      const res = applyLeadIntake(
        t.state,
        {
          name: input.name,
          email: input.email,
          ...(input.company ? { company: input.company } : {}),
          ...(input.phone ? { phone: input.phone } : {}),
          ...(input.message ? { message: input.message } : {}),
          source: "Formulario web",
          ...(attribution ? { attribution } : {}),
        },
        { actorName: "Formulario web", logIntake: true },
      );
      return { ...r, tenants: { ...r.tenants, [tenantId]: { ...t, state: res.state } } };
    });

    return { ok: true };
  };
}
