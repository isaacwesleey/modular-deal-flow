import { useCrm } from "./store";
import { uid } from "./defaults";
import { diffValues } from "./activity";
import { toast } from "sonner";
import { ownerField, recordTitle, statusField } from "./roles";
import { applyLeadIntake, dealFromRule } from "./intake";
import type { Attribution, Contact, FieldValues } from "./types";

/**
 * Operaciones sobre contactos que registran siempre el historial.
 * Cualquier cambio de lead debe pasar por aquí para que el registro sea real.
 */
export function useContacts() {
  const { state, setState, logEvents, root, notify, tenantUsers, user } = useCrm();
  const fields = state.contactFields;

  const userName = (id: unknown) =>
    root.users.find((u) => u.id === String(id ?? ""))?.name ?? "Sin asignar";

  const contactTitleOf = (id: string) => {
    const c = state.contacts.find((x) => x.id === id);
    const titleField = fields.find((f) => f.role === "title");
    return String((titleField && c?.values[titleField.id]) ?? "un contacto");
  };

  /** Avisa al propietario de un lead cuando se le asigna. */
  const notifyOwner = (contactId: string, userId: string) => {
    if (!userId) return;
    notify([
      {
        userId,
        kind: "lead.assigned",
        title: `Te han asignado ${contactTitleOf(contactId)}`,
        body: "Ahora eres el propietario de este lead.",
        contactId,
      },
    ]);
  };

  /** Sustituye ids de usuario por nombres legibles en el historial. */
  const pretty = (fieldId: string | undefined, text: string | undefined) => {
    const f = fields.find((x) => x.id === fieldId);
    if (!f || f.type !== "user" || !text || text === "—") return text;
    return userName(text);
  };

  /**
   * Alta de contacto. Pasa SIEMPRE por el motor de entrada de leads
   * (`applyLeadIntake`), igual que el formulario público y el webhook, así que
   * el alta manual también registra su origen y dispara la regla de conversión.
   */
  const create = (values: FieldValues, attribution?: Attribution, source = "Manual"): Contact => {
    const res = applyLeadIntake(
      state,
      {
        name: recordTitle(fields, values, "Sin nombre"),
        values,
        source,
        ...(attribution ? { attribution } : {}),
      },
      { actorName: user?.name ?? source },
    );
    setState(() => res.state);
    if (res.dealId) toast.success("Oportunidad creada por la regla automática");
    return (
      res.state.contacts.find((c) => c.id === res.contactId) ?? {
        id: uid(),
        createdAt: new Date().toISOString(),
        values,
      }
    );
  };

  /**
   * Alta en lote (importación CSV): encadena el motor de entrada sobre un
   * único estado para no perder filas por escrituras solapadas.
   */
  const createMany = (rows: FieldValues[], source = "Importación CSV") => {
    let next = state;
    let deals = 0;
    for (const values of rows) {
      const res = applyLeadIntake(
        next,
        { name: recordTitle(fields, values, "Sin nombre"), values, source },
        { actorName: user?.name ?? source },
      );
      next = res.state;
      if (res.dealId) deals += 1;
    }
    setState(() => next);
    return { created: rows.length, deals };
  };

  /**
   * Punto ÚNICO de escritura de valores de contacto.
   *
   * Registra el historial, avisa al nuevo propietario y evalúa la regla de
   * conversión automática venga el cambio de donde venga (ficha, listado,
   * acciones en lote o edición en línea).
   */
  const writeValues = (ids: string[], next: (contact: Contact) => FieldValues) => {
    const sf = statusField(fields);
    const of = ownerField(fields);
    const targets = state.contacts.filter((c) => ids.includes(c.id));
    if (!targets.length) return;

    const changes = targets.map((c) => ({ contact: c, before: c.values, after: next(c) }));

    // Regla configurable: al entrar en el estado elegido se crea la oportunidad.
    const created: { contactId: string; deal: ReturnType<typeof dealFromRule>; label: string }[] = [];
    if (sf) {
      let scratch = state;
      for (const ch of changes) {
        const before = String(ch.before[sf.id] ?? "");
        const after = String(ch.after[sf.id] ?? "");
        if (!after || after === before) continue;
        const contact = { ...ch.contact, values: ch.after };
        const deal = dealFromRule(scratch, contact, after);
        if (!deal) continue;
        scratch = { ...scratch, deals: [deal, ...scratch.deals] };
        created.push({
          contactId: contact.id,
          deal,
          label: recordTitle(fields, ch.after),
        });
      }
    }

    const byId = new Map(changes.map((ch) => [ch.contact.id, ch.after]));
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => (byId.has(c.id) ? { ...c, values: byId.get(c.id)! } : c)),
      deals: created.length ? [...created.map((c) => c.deal!), ...s.deals] : s.deals,
    }));

    // Historial de cada campo tocado.
    logEvents(
      changes.flatMap((ch) =>
        diffValues(fields, ch.before, ch.after).map((d) => {
          const f = fields.find((x) => x.label === d.label);
          return {
            type: d.type,
            contactId: ch.contact.id,
            ...(d.label ? { label: d.label } : {}),
            ...(pretty(f?.id, d.from) ? { from: pretty(f?.id, d.from)! } : {}),
            ...(pretty(f?.id, d.to) ? { to: pretty(f?.id, d.to)! } : {}),
          };
        }),
      ),
    );

    // Aviso al nuevo propietario.
    if (of) {
      for (const ch of changes) {
        const owner = String(ch.after[of.id] ?? "");
        if (owner && owner !== String(ch.before[of.id] ?? "")) notifyOwner(ch.contact.id, owner);
      }
    }

    if (created.length) {
      logEvents(
        created.map((c) => ({
          type: "deal.auto" as const,
          contactId: c.contactId,
          dealId: c.deal!.id,
          label: c.label,
          to: state.stages.find((st) => st.id === c.deal!.stageId)?.name ?? "",
        })),
      );
      toast.success(
        created.length === 1
          ? `Oportunidad creada en “${state.stages.find((st) => st.id === created[0]!.deal!.stageId)?.name ?? ""}”`
          : `${created.length} oportunidades creadas por la regla`,
      );
    }
  };

  const update = (id: string, values: FieldValues) => writeValues([id], () => values);

  const setStatus = (ids: string[], value: string) => {
    const f = statusField(fields);
    if (!f) return;
    writeValues(ids, (c) => ({ ...c.values, [f.id]: value }));
  };

  const setOwner = (ids: string[], userId: string) => {
    const f = ownerField(fields);
    if (!f) return;
    writeValues(ids, (c) => ({ ...c.values, [f.id]: userId }));
  };

  /** Envía a la papelera (reversible). */
  const remove = (ids: string[]) => {
    const at = new Date().toISOString();
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => (ids.includes(c.id) ? { ...c, deletedAt: at } : c)),
    }));
    logEvents(ids.map((id) => ({ type: "contact.deleted" as const, contactId: id })));
  };

  const restore = (ids: string[]) => {
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => {
        if (!ids.includes(c.id)) return c;
        const { deletedAt: _omit, ...rest } = c;
        return rest;
      }),
    }));
    logEvents(ids.map((id) => ({ type: "contact.restored" as const, contactId: id })));
  };

  /** Borrado definitivo desde la papelera. */
  const purge = (ids: string[]) =>
    setState((s) => ({ ...s, contacts: s.contacts.filter((c) => !ids.includes(c.id)) }));

  const addNote = (contactId: string, text: string) => {
    const id = uid();
    setState((s) => ({
      ...s,
      notes: [
        { id, text, createdAt: new Date().toISOString(), linkType: "contact", linkId: contactId },
        ...s.notes,
      ],
    }));
    logEvents([{ type: "note.added", contactId, noteId: id, text }]);
    // Menciones tipo @Nombre: avisan a la persona mencionada.
    // El nombre se escapa antes de construir el patrón: un nombre con
    // paréntesis o signos raros reventaría el RegExp y tumbaría el guardado.
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mentioned = tenantUsers.filter((u) => {
      const first = u.name.trim().split(/\s+/)[0];
      if (!first) return false;
      return new RegExp(`@${escapeRe(first)}(?![\\p{L}\\p{N}_])`, "iu").test(text);
    });
    notify(
      mentioned.map((u) => ({
        userId: u.id,
        kind: "note.mention" as const,
        title: `${u.name.split(" ")[0]}, te han mencionado en ${contactTitleOf(contactId)}`,
        body: text.slice(0, 120),
        contactId,
      })),
    );
  };

  /** Aviso al propietario del lead cuando alguien le crea una tarea. */
  const notifyTaskAssigned = (contactId: string, taskTitle: string, taskId?: string) => {
    const of = ownerField(fields);
    const owner = of ? String(state.contacts.find((c) => c.id === contactId)?.values[of.id] ?? "") : "";
    if (!owner) return;
    notify([
      {
        userId: owner,
        kind: "task.assigned",
        title: `Nueva tarea en ${contactTitleOf(contactId)}`,
        body: taskTitle,
        contactId,
        ...(taskId ? { taskId } : {}),
      },
    ]);
  };

  return {
    create,
    createMany,
    update,
    setStatus,
    setOwner,
    remove,
    restore,
    purge,
    addNote,
    userName,
    notifyTaskAssigned,
  };
}
