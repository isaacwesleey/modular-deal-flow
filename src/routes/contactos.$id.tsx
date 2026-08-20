import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckSquare,
  KanbanSquare,
  Mail,
  Phone,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { useContacts } from "@/lib/crm/useContacts";
import { uid } from "@/lib/crm/defaults";
import { ACTIVITY_LABELS } from "@/lib/crm/activity";
import { ATTRIBUTION_LABELS } from "@/lib/crm/attribution";
import { dealAmount, ownerField, recordTitle, statusField } from "@/lib/crm/roles";
import { FieldInput, FieldValueView, UserFieldInput, formatValue } from "@/components/crm/fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordDialog } from "@/components/crm/RecordDialog";
import type { Attribution, FieldValues } from "@/lib/crm/types";

export const Route = createFileRoute("/contactos/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de lead — CRM Remix" },
      { name: "description", content: "Actividad, historial, tareas, oportunidades y origen del lead." },
      { property: "og:title", content: "Ficha de lead — CRM Remix" },
      { property: "og:description", content: "Actividad, historial, tareas, oportunidades y origen del lead." },
    ],
  }),
  component: LeadPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });

function LeadPage() {
  const { id } = Route.useParams();
  const { state, setState, tenantUsers, logEvents } = useCrm();
  const { update, setStatus, setOwner, remove, addNote } = useContacts();
  const navigate = useNavigate();

  const contact = state.contacts.find((c) => c.id === id);
  const fields = state.contactFields;
  const status = statusField(fields);
  const owner = ownerField(fields);

  const [noteText, setNoteText] = useState("");
  const [newTask, setNewTask] = useState("");
  const [dealOpen, setDealOpen] = useState(false);

  const notes = useMemo(
    () => state.notes.filter((n) => n.linkType === "contact" && n.linkId === id),
    [state.notes, id],
  );
  const tasks = useMemo(
    () => state.tasks.filter((t) => t.linkType === "contact" && t.linkId === id),
    [state.tasks, id],
  );
  const events = useMemo(
    () => state.events.filter((e) => e.contactId === id),
    [state.events, id],
  );
  const title = contact ? recordTitle(fields, contact.values) : "";
  const deals = useMemo(() => {
    if (!contact) return [];
    const linkedIds = new Set(
      state.events.filter((e) => e.contactId === id && e.dealId).map((e) => e.dealId!),
    );
    return state.deals.filter(
      (d) =>
        linkedIds.has(d.id) ||
        Object.values(d.values).some((v) => typeof v === "string" && v === title),
    );
  }, [state.deals, state.events, contact, id, title]);

  if (!contact) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed p-10 text-center">
        <h1 className="text-lg font-semibold">Este lead ya no existe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Puede que se haya eliminado. Búscalo en la papelera del listado.
        </p>
        <Button asChild className="mt-4">
          <Link to="/contactos">Volver a contactos</Link>
        </Button>
      </div>
    );
  }

  const email = fields.find((f) => f.type === "email");
  const phone = fields.find((f) => f.type === "phone");
  const emailValue = email ? String(contact.values[email.id] ?? "") : "";
  const phoneValue = phone ? String(contact.values[phone.id] ?? "") : "";
  const company = fields.find((f) => f.id !== status?.id && f.type === "text" && f.role !== "title");
  const companyValue = company ? String(contact.values[company.id] ?? "") : "";

  const setValue = (fieldId: string, value: unknown) =>
    update(contact.id, { ...contact.values, [fieldId]: value });

  const createTask = () => {
    if (!newTask.trim()) return;
    const taskId = uid();
    const date = new Date();
    date.setHours(date.getHours() + 24);
    setState((s) => ({
      ...s,
      tasks: [
        {
          id: taskId,
          title: newTask.trim(),
          kind: "otro",
          date: date.toISOString().slice(0, 16),
          done: false,
          linkType: "contact",
          linkId: contact.id,
        },
        ...s.tasks,
      ],
    }));
    logEvents([{ type: "task.created", contactId: contact.id, taskId, text: newTask.trim() }]);
    setNewTask("");
    toast.success("Tarea creada");
  };

  const toggleTask = (taskId: string, done: boolean, taskTitle: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)),
    }));
    if (done) logEvents([{ type: "task.done", contactId: contact.id, taskId, text: taskTitle }]);
  };

  const createDeal = (values: FieldValues) => {
    const dealId = uid();
    setState((s) => ({
      ...s,
      deals: [
        { id: dealId, createdAt: new Date().toISOString(), stageId: s.stages[0]?.id ?? "", values },
        ...s.deals,
      ],
    }));
    logEvents([
      {
        type: "deal.linked",
        contactId: contact.id,
        dealId,
        text: recordTitle(state.dealFields, values),
      },
    ]);
    toast.success("Oportunidad creada y vinculada");
  };

  return (
    <div className="space-y-6">
      <Link
        to="/contactos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Contactos
      </Link>

      {/* Cabecera */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground">
            {title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {companyValue || "Sin empresa"} · alta {new Date(contact.createdAt).toLocaleDateString("es-ES")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {status && (
                <div className="flex flex-wrap gap-1.5">
                  {(status.options ?? []).map((o) => {
                    const on = String(contact.values[status.id] ?? "") === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setStatus([contact.id], o)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-accent"
                        }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              )}
              {owner && (
                <div className="w-52">
                  <UserFieldInput
                    value={contact.values[owner.id]}
                    onChange={(v) => setOwner([contact.id], String(v ?? ""))}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild={Boolean(emailValue)} disabled={!emailValue}>
              {emailValue ? (
                <a href={`mailto:${emailValue}`}>
                  <Mail className="mr-1 h-4 w-4" /> Email
                </a>
              ) : (
                <span>
                  <Mail className="mr-1 h-4 w-4" /> Email
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" asChild={Boolean(phoneValue)} disabled={!phoneValue}>
              {phoneValue ? (
                <a href={`tel:${phoneValue}`}>
                  <Phone className="mr-1 h-4 w-4" /> Llamar
                </a>
              ) : (
                <span>
                  <Phone className="mr-1 h-4 w-4" /> Llamar
                </span>
              )}
            </Button>
            {state.modules.pipeline && (
              <Button variant="outline" size="sm" onClick={() => setDealOpen(true)}>
                <KanbanSquare className="mr-1 h-4 w-4" /> Oportunidad
              </Button>
            )}
            {state.modules.tareas && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("nueva-tarea")?.focus()}
              >
                <CheckSquare className="mr-1 h-4 w-4" /> Tarea
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                remove([contact.id]);
                toast.success("Lead enviado a la papelera");
                navigate({ to: "/contactos" });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Actividad */}
        <div className="rounded-xl border bg-card p-4">
          <Tabs defaultValue="notas">
            <TabsList>
              {state.modules.notas && <TabsTrigger value="notas">Notas</TabsTrigger>}
              <TabsTrigger value="historial">Historial</TabsTrigger>
              {state.modules.tareas && <TabsTrigger value="tareas">Tareas</TabsTrigger>}
              {state.modules.pipeline && <TabsTrigger value="deals">Oportunidades</TabsTrigger>}
            </TabsList>

            {state.modules.notas && (
              <TabsContent value="notas" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escribe una nota sobre este lead..."
                    rows={3}
                  />
                  <Button
                    size="sm"
                    disabled={!noteText.trim()}
                    onClick={() => {
                      addNote(contact.id, noteText.trim());
                      setNoteText("");
                      toast.success("Nota añadida");
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Añadir nota
                  </Button>
                </div>
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg border p-3">
                      <p className="text-sm">{n.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.createdAt)}</p>
                    </div>
                  ))}
                  {!notes.length && (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Todavía no hay notas. Escribe la primera arriba.
                    </p>
                  )}
                </div>
              </TabsContent>
            )}

            <TabsContent value="historial" className="pt-4">
              <ol className="relative space-y-4 border-l pl-5">
                {events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm">
                      <span className="font-medium">{ACTIVITY_LABELS[e.type]}</span>
                      {e.label ? <span className="text-muted-foreground"> · {e.label}</span> : null}
                    </p>
                    {(e.from || e.to) && (
                      <p className="text-xs text-muted-foreground">
                        <span className="line-through">{e.from ?? "—"}</span> → <strong>{e.to ?? "—"}</strong>
                      </p>
                    )}
                    {e.text && <p className="text-xs text-muted-foreground">“{e.text}”</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.actorName} · {fmtDate(e.at)}
                    </p>
                  </li>
                ))}
                {!events.length && (
                  <li className="text-sm text-muted-foreground">Sin actividad registrada.</li>
                )}
              </ol>
            </TabsContent>

            {state.modules.tareas && (
              <TabsContent value="tareas" className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input
                    id="nueva-tarea"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Nueva tarea para este lead"
                    onKeyDown={(e) => e.key === "Enter" && createTask()}
                  />
                  <Button onClick={createTask} disabled={!newTask.trim()}>
                    Crear
                  </Button>
                </div>
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={(e) => toggleTask(t.id, e.target.checked, t.title)}
                      />
                      <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("es-ES")}
                      </span>
                    </label>
                  ))}
                  {!tasks.length && (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Sin tareas. Crea la primera arriba.
                    </p>
                  )}
                </div>
              </TabsContent>
            )}

            {state.modules.pipeline && (
              <TabsContent value="deals" className="space-y-3 pt-4">
                {deals.map((d) => {
                  const stage = state.stages.find((s) => s.id === d.stageId);
                  return (
                    <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="text-sm font-medium">
                        {recordTitle(state.dealFields, d.values)}
                      </span>
                      {stage && (
                        <Badge variant="secondary" style={{ backgroundColor: stage.color, color: "#111" }}>
                          {stage.name}
                        </Badge>
                      )}
                      <span className="ml-auto text-sm">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(dealAmount(state.dealFields, d))}
                      </span>
                    </div>
                  );
                })}
                {!deals.length && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Sin oportunidades vinculadas.
                  </p>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/pipeline">
                    <KanbanSquare className="mr-1 h-4 w-4" /> Ver Kanban
                  </Link>
                </Button>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Datos */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="h-4 w-4" /> Datos del lead
            </h2>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                  <FieldInput
                    field={f}
                    value={contact.values[f.id]}
                    onChange={(v) => setValue(f.id, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          <AttributionCard attribution={contact.attribution} />
        </div>
      </div>

      <RecordDialog
        open={dealOpen}
        onOpenChange={setDealOpen}
        title="Nueva oportunidad"
        fields={state.dealFields}
        values={useMemo(() => ({}), [])}
        recordId={`deal-${contact.id}`}
        onSave={createDeal}
      />
    </div>
  );
}

function AttributionCard({ attribution }: { attribution?: Attribution }) {
  const keys: (keyof Attribution)[] = [
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmTerm",
    "utmContent",
    "referrer",
    "landingPage",
    "device",
    "firstSeenAt",
  ];
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Origen y atribución</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Capturado en la primera visita. Solo lectura.
      </p>
      {attribution ? (
        <dl className="space-y-2 text-sm">
          {keys.map((k) => {
            const raw = attribution[k];
            const value =
              k === "firstSeenAt" && raw ? fmtDate(String(raw)) : raw ? String(raw) : "—";
            return (
              <div key={k} className="flex gap-3">
                <dt className="w-32 shrink-0 text-xs text-muted-foreground">
                  {ATTRIBUTION_LABELS[k]}
                </dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          Este lead se creó manualmente, sin datos de origen.
        </p>
      )}
    </div>
  );
}

export { formatValue, FieldValueView };
