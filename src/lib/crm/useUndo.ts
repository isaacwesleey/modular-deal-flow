import { toast } from "sonner";
import { useCrm } from "./store";
import type { Contact, CrmState, Deal } from "./types";

/**
 * Deshacer con ventana corta.
 *
 * Guarda SOLO el estado anterior de lo tocado (los contactos u oportunidades
 * afectados), nunca una copia del estado entero: así una acción en bloque sobre
 * cuarenta registros no duplica toda la organización en memoria.
 */
export const UNDO_MS = 8000;

export function useUndo() {
  const { setState } = useCrm();

  const offer = (message: string, restore: (s: CrmState) => CrmState) => {
    toast(message, {
      duration: UNDO_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          setState(restore);
          toast.success("Acción deshecha");
        },
      },
    });
  };

  /** Instantánea de los contactos afectados (se restauran tal cual estaban). */
  const offerContacts = (message: string, before: Contact[]) => {
    const snapshot = before.map((c) => ({ ...c, values: { ...c.values } }));
    if (!snapshot.length) return;
    offer(message, (s) => {
      const byId = new Map(snapshot.map((c) => [c.id, c]));
      return { ...s, contacts: s.contacts.map((c) => byId.get(c.id) ?? c) };
    });
  };

  /** Instantánea de una oportunidad y su posición en la lista. */
  const offerDeal = (message: string, before: Deal, index: number) => {
    const snapshot = { ...before, values: { ...before.values } };
    offer(message, (s) => {
      const rest = s.deals.filter((d) => d.id !== snapshot.id);
      const at = Math.min(Math.max(index, 0), rest.length);
      return { ...s, deals: [...rest.slice(0, at), snapshot, ...rest.slice(at)] };
    });
  };

  return { offer, offerContacts, offerDeal };
}
