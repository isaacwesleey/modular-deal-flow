import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { uid } from "@/lib/crm/defaults";
import { ModuleOff, PageHeader } from "@/components/crm/Layout";
import { RecordDialog } from "@/components/crm/RecordDialog";
import { FieldValueView } from "@/components/crm/fields";
import { Button } from "@/components/ui/button";
import type { Deal, FieldValues } from "@/lib/crm/types";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — CRM Remix" },
      { name: "description", content: "Kanban de oportunidades con etapas y campos editables." },
      { property: "og:title", content: "Pipeline — CRM Remix" },
      { property: "og:description", content: "Kanban de oportunidades con etapas y campos editables." },
    ],
  }),
  component: PipelinePage,
});

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function PipelinePage() {
  const { state, setState } = useCrm();
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [creatingStage, setCreatingStage] = useState<string | null>(null);

  if (!state.modules.pipeline) return <ModuleOff name="Pipeline" />;

  const fields = state.dealFields;
  const quick = fields.filter((f) => f.showInQuickView);

  const moveDeal = (dealId: string, stageId: string) =>
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => (d.id === dealId ? { ...d, stageId } : d)),
    }));

  const save = (values: FieldValues) => {
    if (editing) {
      setState((s) => ({ ...s, deals: s.deals.map((d) => (d.id === editing.id ? { ...d, values } : d)) }));
    } else if (creatingStage) {
      setState((s) => ({
        ...s,
        deals: [
          { id: uid(), createdAt: new Date().toISOString(), stageId: creatingStage, values },
          ...s.deals,
        ],
      }));
    }
  };

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Arrastra las tarjetas entre etapas. Configura las etapas en Ajustes."
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {state.stages.map((stage) => {
          const deals = state.deals.filter((d) => d.stageId === stage.id);
          const total = deals.reduce((a, d) => a + (Number(d.values["valor"]) || 0), 0);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragId && moveDeal(dragId, stage.id)}
              className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                <h2 className="text-sm font-semibold">{stage.name}</h2>
                <span className="ml-auto text-xs text-muted-foreground">{eur(total)}</span>
              </div>

              <div className="flex-1 space-y-2">
                {deals.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setEditing(d)}
                    className={`cursor-pointer rounded-lg border-l-4 bg-card p-3 shadow-sm transition hover:shadow-md ${
                      dragId === d.id ? "opacity-40" : ""
                    }`}
                    style={{ borderLeftColor: stage.color }}
                  >
                    {quick.map((f, i) => (
                      <div key={f.id} className={i === 0 ? "text-sm font-medium" : "mt-1 text-xs text-muted-foreground"}>
                        <FieldValueView field={f} value={d.values[f.id]} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-2 justify-start text-muted-foreground"
                onClick={() => {
                  setEditing(null);
                  setCreatingStage(stage.id);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Añadir
              </Button>
            </div>
          );
        })}
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
        values={editing?.values ?? {}}
        onSave={save}
        {...(editing
          ? { onDelete: () => setState((s) => ({ ...s, deals: s.deals.filter((d) => d.id !== editing.id) })) }
          : {})}
      />
    </>
  );
}