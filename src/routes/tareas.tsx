import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useDeferredValue } from "react";
import { Phone, Mail, Users, Circle, Plus, List, CalendarDays, Search } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { activeContacts, recordTitle, activeDeals } from "@/lib/crm/roles";
import { uid } from "@/lib/crm/defaults";
import { ModuleOff, PageHeader } from "@/components/crm/Layout";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE, Pagination } from "@/components/crm/Pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, TaskKind } from "@/lib/crm/types";

export const Route = createFileRoute("/tareas")({
  head: () => ({
    meta: [
      { title: "Tareas — Ventia" },
      { name: "description", content: "Tareas y actividades con vista lista y calendario." },
      { property: "og:title", content: "Tareas — Ventia" },
      { property: "og:description", content: "Tareas y actividades con vista lista y calendario." },
    ],
  }),
  component: TareasPage,
});

const KIND_META: Record<TaskKind, { label: string; icon: typeof Phone }> = {
  llamada: { label: "Llamada", icon: Phone },
  email: { label: "Email", icon: Mail },
  reunion: { label: "Reunión", icon: Users },
  otro: { label: "Otro", icon: Circle },
};

const emptyTask = (): Task => ({
  id: uid(),
  title: "",
  kind: "llamada",
  date: new Date().toISOString().slice(0, 16),
  done: false,
  linkType: "none",
});

function TareasPage() {
  const { state, setState, logEvents, user } = useCrm();
  const [q, setQ] = useState("");
  // Filtrar sobre un valor diferido mantiene el tecleo fluido con miles de filas.
  const dq = useDeferredValue(q);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [draft, setDraft] = useState<Task | null>(null);

  if (!state.modules.tareas) return <ModuleOff name="Tareas" />;

  const toggle = (id: string) =>
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));

  const saveDraft = () => {
    if (!draft || !draft.title.trim()) return setDraft(null);
    setState((s) => ({
      ...s,
      tasks: s.tasks.some((t) => t.id === draft.id)
        ? s.tasks.map((t) => (t.id === draft.id ? draft : t))
        : [...s.tasks, draft],
    }));
    setDraft(null);
  };

  const linkLabel = (t: Task) => {
    if (t.linkType === "contact") {
      const c = activeContacts(state).find((x) => x.id === t.linkId);
      return c ? recordTitle(state.contactFields, c.values, "Sin nombre") : "";
    }
    if (t.linkType === "deal") {
      const d = activeDeals(state).find((x) => x.id === t.linkId);
      return d ? recordTitle(state.dealFields, d.values) : "";
    }
    return "";
  };

  const sorted = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    const list = needle
      ? state.tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(needle) ||
            KIND_META[t.kind].label.toLowerCase().includes(needle) ||
            linkLabel(t).toLowerCase().includes(needle),
        )
      : [...state.tasks];
    return list.sort((a, b) => a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tasks, state.contacts, state.deals, dq]);

  const PAGE_SIZE = user?.prefs?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const paged = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Tareas"
        subtitle="Llamadas, emails, reuniones y pendientes."
        action={
          <div className="flex gap-2">
            <div className="flex rounded-lg border p-0.5">
              <button
                onClick={() => setView("lista")}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${view === "lista" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </button>
              <button
                onClick={() => setView("calendario")}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${view === "calendario" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Calendario
              </button>
            </div>
            <Button onClick={() => setDraft(emptyTask())}>
              <Plus className="mr-1 h-4 w-4" /> Nueva tarea
            </Button>
          </div>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar tareas..."
          className="pl-9"
        />
      </div>

      {view === "lista" ? (
        <ul className="space-y-2">
          {paged.map((t) => {
            const Icon = KIND_META[t.kind].icon;
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t.id)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <button className="text-left text-sm" onClick={() => setDraft(t)}>
                  <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.title}</span>
                  {linkLabel(t) && (
                    <span className="ml-2 text-xs text-muted-foreground">· {linkLabel(t)}</span>
                  )}
                </button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            );
          })}
          {!sorted.length && (
            <p className="text-sm text-muted-foreground">
              {q ? "Ninguna tarea coincide con la búsqueda." : "Sin tareas todavía."}
            </p>
          )}
        </ul>
      ) : (
        <CalendarView tasks={sorted} onPick={(t) => setDraft(t)} />
      )}

      {view === "lista" && (
        <Pagination
          page={current}
          pages={pages}
          total={sorted.length}
          onChange={setPage}
          label="tareas"
        />
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{state.tasks.some((t) => t.id === draft?.id) ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Título</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as TaskKind })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_META) as TaskKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_META[k].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fecha y hora</Label>
                  <Input
                    type="datetime-local"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Asociada a</Label>
                <Select
                  value={`${draft.linkType ?? "none"}:${draft.linkId ?? ""}`}
                  onValueChange={(v) => {
                    const [type, id] = v.split(":");
                    setDraft({
                      ...draft,
                      linkType: (type ?? "none") as "contact" | "deal" | "none",
                      linkId: id ?? "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none:">Nada</SelectItem>
                    {activeContacts(state).map((c) => (
                      <SelectItem key={c.id} value={`contact:${c.id}`}>
                        👤 {recordTitle(state.contactFields, c.values, "Sin nombre")}
                      </SelectItem>
                    ))}
                    {state.modules.pipeline &&
                      activeDeals(state).map((d) => (
                        <SelectItem key={d.id} value={`deal:${d.id}`}>
                          💼 {recordTitle(state.dealFields, d.values)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            {draft && state.tasks.some((t) => t.id === draft.id) ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== draft.id) }));
                  logEvents([
                    {
                      type: "task.deleted",
                      taskId: draft.id,
                      ...(draft.linkType === "contact" && draft.linkId
                        ? { contactId: draft.linkId }
                        : {}),
                      text: draft.title,
                    },
                  ]);
                  setDraft(null);
                }}
              >
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={saveDraft}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CalendarView({ tasks, onPick }: { tasks: Task[]; onPick: (t: Task) => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold capitalize">
        {now.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
      </h2>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d} className="pb-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const iso = new Date(year, month, day).toISOString().slice(0, 10);
          const dayTasks = tasks.filter((t) => t.date.slice(0, 10) === iso);
          const isToday = day === now.getDate();
          return (
            <div
              key={day}
              className={`min-h-20 rounded-lg border p-1.5 text-left ${isToday ? "border-primary" : ""}`}
            >
              <span className={`text-[11px] ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onPick(t)}
                    className="block w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[10px] text-primary"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}