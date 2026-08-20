import { useEffect, useRef } from "react";
import { useCrm } from "./store";
import { ownerField } from "./roles";

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Recordatorios de tareas: avisa al propietario del lead vinculado (o al
 * usuario activo si la tarea no tiene dueño) de lo que vence hoy y de lo que ya
 * está vencido sin completar.
 *
 * Se ejecuta al cargar la app y de nuevo al cambiar el día, y nunca repite el
 * aviso de una misma tarea para el mismo día.
 */
export function useDueTaskNotifications() {
  const { state, hydrated, notify, root, user, tenant } = useCrm();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fecha del último barrido: evita relanzarlo en cada render.
  const lastRun = useRef<string>("");

  useEffect(() => {
    if (!hydrated || !user || !tenant) return;

    const run = () => {
      const now = new Date();
      const today = dayKey(now);
      if (lastRun.current === `${tenant.id}:${today}`) return;
      lastRun.current = `${tenant.id}:${today}`;

      const of = ownerField(state.contactFields);
      const already = new Set(
        (root.notifications ?? [])
          .filter((n) => n.kind === "task.due" && n.tenantId === tenant.id && n.taskId)
          .map((n) => `${n.taskId}:${dayKey(new Date(n.at))}`),
      );

      const entries = state.tasks
        .filter((t) => !t.done && t.date)
        .map((t) => {
          const due = new Date(t.date);
          if (Number.isNaN(due.getTime())) return null;
          const dueDay = dayKey(due);
          if (dueDay > today) return null; // aún no toca
          if (already.has(`${t.id}:${today}`)) return null; // ya avisado hoy
          const owner =
            (of && t.linkType === "contact" && t.linkId
              ? String(state.contacts.find((c) => c.id === t.linkId)?.values[of.id] ?? "")
              : "") || user.id;
          const overdue = dueDay < today;
          return {
            userId: owner,
            kind: "task.due" as const,
            title: overdue ? `Tarea vencida: ${t.title}` : `Tarea para hoy: ${t.title}`,
            body: overdue
              ? `Vencía el ${due.toLocaleDateString("es-ES")} y sigue pendiente.`
              : `Vence hoy a las ${due.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`,
            taskId: t.id,
            ...(t.linkType === "contact" && t.linkId ? { contactId: t.linkId } : {}),
          };
        })
        .filter((e): e is NonNullable<typeof e> => Boolean(e));

      if (entries.length) notify(entries, { allowSelf: true });
    };

    run();

    // Al cambiar el día se vuelve a revisar (sesiones que quedan abiertas).
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0);
    timer.current = setTimeout(run, midnight.getTime() - Date.now());
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id, tenant?.id, state.tasks]);
}
