import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { uid } from "@/lib/crm/defaults";
import { amountField, recordTitle, sumDeals } from "@/lib/crm/roles";
import { ModuleOff, PageHeader } from "@/components/crm/Layout";
import { RecordDialog } from "@/components/crm/RecordDialog";
import { ContactPicker } from "@/components/crm/ContactPicker";
import { FieldValueView } from "@/components/crm/fields";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Deal, FieldValues } from "@/lib/crm/types";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Ventia" },
      { name: "description", content: "Kanban de oportunidades con etapas y campos editables." },
      { property: "og:title", content: "Pipeline — Ventia" },
      { property: "og:description", content: "Kanban de oportunidades con etapas y campos editables." },
    ],
  }),
  component: PipelinePage,
});

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const NO_STAGE = "__sin_etapa__";

/** Aplica (o retira) la relación con el contacto en un deal. */
function applyContact(deal: Deal, contactId: string | undefined): Deal {
  const { contactId: _omit, ...rest } = deal;
  return contactId ? { ...rest, contactId } : rest;
}

function PipelinePage() {
  const { state, setState, logEvents } = useCrm();
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [creatingStage, setCreatingStage] = useState<string | null>(null);
  const [linkedContact, setLinkedContact] = useState<string | undefined>(undefined);

  const fields = state.dealFields;
  const quick = useMemo(() => fields.filter((f) => f.showInQuickView), [fields]);
  const amount = amountField(fields);
  const dialogValues = useMemo(() => editing?.values ?? {}, [editing]);

  const stageIds = useMemo(() => new Set(state.stages.map((s) => s.id)), [state.stages]);
  const orphans = state.deals.filter((d) => !stageIds.has(d.stageId));

  const contactName = (contactId?: string) => {
    const c = contactId ? state.contacts.find((x) => x.id === contactId) : undefined;
    return c ? recordTitle(state.contactFields, c.values, "Sin nombre") : "";
  };

  if (!state.modules.pipeline) return <ModuleOff name="Pipeline" />;

  /** Mueve un deal a otra etapa y, opcionalmente, lo coloca antes de otra tarjeta. */
  const moveDeal = (dealId: string, stageId: string, beforeId?: string) => {
    const deal = state.deals.find((d) => d.id === dealId);
    // El cambio de etapa queda registrado en el historial (y en el del contacto vinculado).
    if (deal && deal.stageId !== stageId) {
      const stageName = (id: string) =>
        state.stages.find((s) => s.id === id)?.name ?? "Sin etapa";
      logEvents([
        {
          type: "deal.stage",
          dealId,
          ...(deal.contactId ? { contactId: deal.contactId } : {}),
          label: recordTitle(state.dealFields, deal.values),
          from: stageName(deal.stageId),
          to: stageName(stageId),
        },
      ]);
    }
    setState((s) => {
      if (dealId === beforeId) return s;
      const list = [...s.deals];
      const from = list.findIndex((d) => d.id === dealId);
      if (from < 0) return s;
      const [moved] = list.splice(from, 1);
      const next = { ...moved!, stageId };
      const to = beforeId ? list.findIndex((d) => d.id === beforeId) : -1;
      if (to < 0) list.push(next);
      else list.splice(to, 0, next);
      return { ...s, deals: list };
    });
  };

  const save = (values: FieldValues) => {
    if (editing) {
      setState((s) => ({
        ...s,
        deals: s.deals.map((d) =>
          d.id === editing.id ? applyContact({ ...d, values }, linkedContact) : d,
        ),
      }));
      if (linkedContact && linkedContact !== editing.contactId) {
        logEvents([
          {
            type: "deal.linked",
            dealId: editing.id,
            contactId: linkedContact,
            text: recordTitle(state.dealFields, values),
          },
        ]);
      }
    } else if (creatingStage) {
      const id = uid();
      setState((s) => ({
        ...s,
        deals: [
          applyContact(
            { id, createdAt: new Date().toISOString(), stageId: creatingStage, values },
            linkedContact,
          ),
          ...s.deals,
        ],
      }));
      if (linkedContact) {
        logEvents([
          {
            type: "deal.linked",
            dealId: id,
            contactId: linkedContact,
            text: recordTitle(state.dealFields, values),
          },
        ]);
      }
    }
  };

  const columns = [
    ...state.stages.map((st) => ({
      id: st.id,
      name: st.name,
      color: st.color,
      deals: state.deals.filter((d) => d.stageId === st.id),
      canAdd: true,
    })),
    ...(orphans.length
      ? [{ id: NO_STAGE, name: "Sin etapa", color: "oklch(0.6 0.02 260)", deals: orphans, canAdd: false }]
      : []),
  ];

  const firstStageId = state.stages[0]?.id;

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Arrastra las tarjetas entre etapas o reordénalas dentro de una columna."
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId && col.id !== NO_STAGE) moveDeal(dragId, col.id);
              setDragId(null);
            }}
            className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 p-3"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
              <h2 className="text-sm font-semibold">{col.name}</h2>
              {amount && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {eur(sumDeals(fields, col.deals))}
                </span>
              )}
            </div>

            {col.id === NO_STAGE && (
              <div className="mb-2 rounded-lg border border-dashed p-2 text-[11px] text-muted-foreground">
                Estas oportunidades apuntan a una etapa que ya no existe.
                {firstStageId && (
                  <button
                    className="mt-1 block font-medium text-primary underline"
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        deals: s.deals.map((d) =>
                          stageIds.has(d.stageId) ? d : { ...d, stageId: firstStageId },
                        ),
                      }))
                    }
                  >
                    Mover todas a “{state.stages[0]?.name}”
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 space-y-2">
              {col.deals.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={() => setDragId(d.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    if (dragId && col.id !== NO_STAGE) moveDeal(dragId, col.id, d.id);
                    setDragId(null);
                  }}
                  onClick={() => {
                    setEditing(d);
                    setLinkedContact(d.contactId);
                  }}
                  className={`cursor-pointer rounded-lg border-l-4 bg-card p-3 shadow-sm transition hover:shadow-md ${
                    dragId === d.id ? "opacity-40" : ""
                  }`}
                  style={{ borderLeftColor: col.color }}
                >
                  {quick.map((f, i) => (
                    <div key={f.id} className={i === 0 ? "text-sm font-medium" : "mt-1 text-xs text-muted-foreground"}>
                      <FieldValueView field={f} value={d.values[f.id]} />
                    </div>
                  ))}
                  {contactName(d.contactId) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      👤 {contactName(d.contactId)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {col.canAdd && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 justify-start text-muted-foreground"
                onClick={() => {
                  setEditing(null);
                  setLinkedContact(undefined);
                  setCreatingStage(col.id);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Añadir
              </Button>
            )}
          </div>
        ))}
        {!state.stages.length && (
          <p className="text-sm text-muted-foreground">Crea etapas desde Ajustes.</p>
        )}
      </div>

      <RecordDialog
        open={!!editing || !!creatingStage}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setCreatingStage(null);
          }
        }}
        title={editing ? "Editar oportunidad" : "Nueva oportunidad"}
        fields={fields}
        values={dialogValues}
        recordId={editing?.id ?? `nuevo-${creatingStage ?? ""}`}
        onSave={save}
        extra={
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Contacto vinculado</Label>
            <ContactPicker value={linkedContact} onChange={setLinkedContact} />
          </div>
        }
        {...(editing
          ? { onDelete: () => setState((s) => ({ ...s, deals: s.deals.filter((d) => d.id !== editing.id) })) }
          : {})}
      />
    </>
  );
}
