import { useCrm } from "./store";
import { uid } from "./defaults";
import { diffValues } from "./activity";
import { ownerField, statusField } from "./roles";
import type { Attribution, Contact, FieldValues } from "./types";

/**
 * Operaciones sobre contactos que registran siempre el historial.
 * Cualquier cambio de lead debe pasar por aquí para que el registro sea real.
 */
export function useContacts() {
  const { state, setState, logEvents, root, notify, tenantUsers } = useCrm();
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

  const create = (values: FieldValues, attribution?: Attribution): Contact => {
    const contact: Contact = {
      id: uid(),
      createdAt: new Date().toISOString(),
      values,
      ...(attribution ? { attribution } : {}),
    };
    setState((s) => ({ ...s, contacts: [contact, ...s.contacts] }));
    logEvents([{ type: "contact.created", contactId: contact.id }]);
    return contact;
  };

  const update = (id: string, values: FieldValues) => {
    const before = state.contacts.find((c) => c.id === id)?.values ?? {};
    const of = ownerField(fields);
    if (of && values[of.id] && values[of.id] !== before[of.id])
      notifyOwner(id, String(values[of.id]));
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => (c.id === id ? { ...c, values } : c)),
    }));
    const changes = diffValues(fields, before, values);
    logEvents(
      changes.map((ch) => {
        const f = fields.find((x) => x.label === ch.label);
        return {
          type: ch.type,
          contactId: id,
          ...(ch.label ? { label: ch.label } : {}),
          ...(pretty(f?.id, ch.from) ? { from: pretty(f?.id, ch.from)! } : {}),
          ...(pretty(f?.id, ch.to) ? { to: pretty(f?.id, ch.to)! } : {}),
        };
      }),
    );
  };

  const setStatus = (ids: string[], value: string) => {
    const f = statusField(fields);
    if (!f) return;
    const before = new Map(ids.map((id) => [id, String(state.contacts.find((c) => c.id === id)?.values[f.id] ?? "—")]));
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) =>
        ids.includes(c.id) ? { ...c, values: { ...c.values, [f.id]: value } } : c,
      ),
    }));
    logEvents(
      ids
        .filter((id) => before.get(id) !== value)
        .map((id) => ({
          type: "contact.status" as const,
          contactId: id,
          label: f.label,
          from: before.get(id) || "—",
          to: value,
        })),
    );
  };

  const setOwner = (ids: string[], userId: string) => {
    const f = ownerField(fields);
    if (!f) return;
    const before = new Map(ids.map((id) => [id, userName(state.contacts.find((c) => c.id === id)?.values[f.id])]));
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) =>
        ids.includes(c.id) ? { ...c, values: { ...c.values, [f.id]: userId } } : c,
      ),
    }));
    logEvents(
      ids
        .filter((id) => before.get(id) !== userName(userId))
        .map((id) => ({
          type: "contact.owner" as const,
          contactId: id,
          label: f.label,
          from: before.get(id) || "Sin asignar",
          to: userName(userId),
        })),
    );
    ids
      .filter((id) => before.get(id) !== userName(userId))
      .forEach((id) => notifyOwner(id, userId));
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
