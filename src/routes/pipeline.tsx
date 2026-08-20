import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, MoreHorizontal, ChevronLeft, ChevronRight, Trash2, RotateCcw } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { uid } from "@/lib/crm/defaults";
import {
  amountField,
  defaultPipelineId,
  pipelineStages,
  pipelines as allPipelines,
  recordTitle,
  sumDeals,
} from "@/lib/crm/roles";
import { ModuleOff, PageHeader } from "@/components/crm/Layout";
import { RecordDialog } from "@/components/crm/RecordDialog";
import { ContactPicker } from "@/components/crm/ContactPicker";
import { FieldValueView } from "@/components/crm/fields";
import { STAGE_COLORS, StageDeleteDialog } from "@/components/crm/stages";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { trashDaysLeft } from "@/lib/crm/roles";
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

function isEmptyValue(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

const NO_STAGE = "__sin_etapa__";

/** Aplica (o retira) la relación con el contacto en un deal. */
function applyContact(deal: Deal, contactId: string | undefined): Deal {
  const { contactId: _omit, ...rest } = deal;
  return contactId ? { ...rest, contactId } : rest;
}

function PipelinePage() {
  const { state, setState, logEvents, canManageSettings } = useCrm();
  const [trashOpen, setTrashOpen] = useState(false);
  const [newStage, setNewStage] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [creatingStage, setCreatingStage] = useState<string | null>(null);
  const [linkedContact, setLinkedContact] = useState<string | undefined>(undefined);
  const [newPipeline, setNewPipeline] = useState("");
  const [pipelineDialog, setPipelineDialog] = useState(false);
  const [renamePipeline, setRenamePipeline] = useState(false);
  const [pipelineName2, setPipelineName2] = useState("");
  const [deletePipeline, setDeletePipeline] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [activePipeline, setActivePipeline] = useState<string | null>(null);

  const fields = state.dealFields;
  const quick = useMemo(() => fields.filter((f) => f.showInQuickView), [fields]);
  const amount = amountField(fields);
  const dialogValues = useMemo(() => editing?.values ?? {}, [editing]);

  const pipelineList = allPipelines(state);
  const pipelineId =
    activePipeline && pipelineList.some((p) => p.id === activePipeline)
      ? activePipeline
      : defaultPipelineId(state);
  const stages = useMemo(() => pipelineStages(state, pipelineId), [state, pipelineId]);
  const stageIds = useMemo(() => new Set(stages.map((s) => s.id)), [stages]);
  const allStageIds = useMemo(() => new Set(state.stages.map((s) => s.id)), [state.stages]);
  // Solo las oportunidades de este embudo (o las huérfanas, que caen aquí).
  const liveDeals = useMemo(
    () =>
      state.deals.filter(
        (d) =>
          !d.deletedAt &&
          (stageIds.has(d.stageId) || (!allStageIds.has(d.stageId) && pipelineId === defaultPipelineId(state))),
      ),
    [state.deals, stageIds, allStageIds, pipelineId, state],
  );
  const trashed = useMemo(() => state.deals.filter((d) => d.deletedAt), [state.deals]);
  const orphans = liveDeals.filter((d) => !stageIds.has(d.stageId));

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
    ...stages.map((st) => ({
      id: st.id,
      name: st.name,
      color: st.color,
      deals: liveDeals.filter((d) => d.stageId === st.id),
      canAdd: true,
    })),
    ...(orphans.length
      ? [{ id: NO_STAGE, name: "Sin etapa", color: "oklch(0.6 0.02 260)", deals: orphans, canAdd: false }]
      : []),
  ];

  const firstStageId = stages[0]?.id;

  const addStage = () => {
    const name = newStage.trim();
    if (!name) return;
    setState((s) => ({
      ...s,
      stages: [
        ...s.stages,
        { id: uid(), name, color: STAGE_COLORS[s.stages.length % STAGE_COLORS.length]!, pipelineId },
      ],
    }));
    setNewStage("");
  };

  /** Crea un embudo nuevo con una primera etapa para que no nazca vacío. */
  const addPipeline = () => {
    const name = newPipeline.trim();
    if (!name) return;
    const id = uid();
    setState((s) => ({
      ...s,
      pipelines: [...allPipelines(s), { id, name }],
      stages: [...s.stages, { id: uid(), name: "Nueva etapa", color: STAGE_COLORS[0]!, pipelineId: id }],
    }));
    setActivePipeline(id);
    setNewPipeline("");
    setPipelineDialog(false);
  };

  /** Renombra el embudo activo. */
  const doRenamePipeline = () => {
    const name = pipelineName2.trim();
    if (!name) return;
    setState((s) => ({
      ...s,
      pipelines: allPipelines(s).map((p) => (p.id === pipelineId ? { ...p, name } : p)),
    }));
    setRenamePipeline(false);
  };

  /**
   * Elimina el embudo activo. Nunca se puede quedar el CRM sin embudos:
   * las oportunidades y sus etapas se mueven al embudo elegido.
   */
  const doDeletePipeline = () => {
    if (pipelineList.length < 2 || !moveTarget) return;
    const movedStageIds = new Set(pipelineStages(state, pipelineId).map((s) => s.id));
    setState((s) => ({
      ...s,
      pipelines: allPipelines(s).filter((p) => p.id !== pipelineId),
      stages: s.stages.map((st) =>
        movedStageIds.has(st.id) ? { ...st, pipelineId: moveTarget } : st,
      ),
      deals: s.deals.map((d) =>
        movedStageIds.has(d.stageId) ? { ...d, pipelineId: moveTarget } : d,
      ),
    }));
    setActivePipeline(moveTarget);
    setDeletePipeline(false);
  };

  const restoreDeal = (deal: Deal) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => {
        if (d.id !== deal.id) return d;
        const { deletedAt: _drop, ...rest } = d;
        return stageIds.has(rest.stageId) || !firstStageId ? rest : { ...rest, stageId: firstStageId };
      }),
    }));
    logEvents([
      {
        type: "deal.restored",
        dealId: deal.id,
        ...(deal.contactId ? { contactId: deal.contactId } : {}),
        label: recordTitle(state.dealFields, deal.values),
      },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Arrastra las tarjetas entre etapas o reordénalas dentro de una columna."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={pipelineId} onValueChange={setActivePipeline}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelineList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageSettings && (
              <Button variant="outline" size="sm" onClick={() => setPipelineDialog(true)}>
                <Plus className="mr-1 h-4 w-4" /> Nuevo embudo
              </Button>
            )}
            {canManageSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="Opciones del embudo">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setPipelineName2(pipelineList.find((p) => p.id === pipelineId)?.name ?? "");
                      setRenamePipeline(true);
                    }}
                  >
                    Renombrar embudo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={pipelineList.length < 2}
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoveTarget(pipelineList.find((p) => p.id !== pipelineId)?.id ?? "");
                      setDeletePipeline(true);
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Eliminar embudo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {trashed.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Papelera ({trashed.length})
              </Button>
            )}
          </div>
        }
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
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.color }} />
              <h2 className="truncate text-sm font-semibold">{col.name}</h2>
              {amount && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {eur(sumDeals(fields, col.deals))}
                </span>
              )}
              {col.id !== NO_STAGE && canManageSettings && (
                <StageMenu stageId={col.id} pipelineId={pipelineId} className={amount ? "" : "ml-auto"} />
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
                    Mover todas a “{stages[0]?.name}”
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
                  {/* En la tarjeta no pintamos campos vacíos: evita filas de guiones. */}
                  {quick
                    .filter((f, i) => i === 0 || !isEmptyValue(d.values[f.id]))
                    .map((f, i) => (
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
        {canManageSettings ? (
          <div className="flex w-64 shrink-0 flex-col rounded-xl border border-dashed p-3">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Añadir etapa</h2>
            <Input
              value={newStage}
              placeholder="Nombre de la etapa"
              onChange={(e) => setNewStage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addStage();
              }}
              className="h-9"
            />
            <Button size="sm" className="mt-2" onClick={addStage} disabled={!newStage.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Crear etapa
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              También puedes gestionarlas en Ajustes › Etapas.
            </p>
          </div>
        ) : (
          !state.stages.length && (
            <p className="text-sm text-muted-foreground">
              Aún no hay etapas. Pide a un administrador que las cree.
            </p>
          )
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
        entity="dealFields"
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
          ? {
              deleteConfirm:
                "La oportunidad irá a la papelera y podrás restaurarla durante 30 días.",
              onDelete: () => {
                setState((s) => ({
                  ...s,
                  deals: s.deals.map((d) =>
                    d.id === editing.id ? { ...d, deletedAt: new Date().toISOString() } : d,
                  ),
                }));
                logEvents([
                  {
                    type: "deal.deleted",
                    dealId: editing.id,
                    ...(editing.contactId ? { contactId: editing.contactId } : {}),
                    label: recordTitle(state.dealFields, editing.values),
                  },
                ]);
              },
            }
          : {})}
      />

      <Dialog open={pipelineDialog} onOpenChange={setPipelineDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo embudo</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Nombre</Label>
            <Input
              value={newPipeline}
              onChange={(e) => setNewPipeline(e.target.value)}
              placeholder="Postventa"
              onKeyDown={(e) => e.key === "Enter" && addPipeline()}
            />
            <p className="text-xs text-muted-foreground">
              Se creará con una primera etapa que podrás renombrar en el tablero.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={addPipeline} disabled={!newPipeline.trim()}>
              Crear embudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renamePipeline} onOpenChange={setRenamePipeline}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renombrar embudo</DialogTitle>
          </DialogHeader>
          <Input
            value={pipelineName2}
            autoFocus
            onChange={(e) => setPipelineName2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doRenamePipeline()}
          />
          <DialogFooter>
            <Button onClick={doRenamePipeline} disabled={!pipelineName2.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePipeline} onOpenChange={setDeletePipeline}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Eliminar “{pipelineList.find((p) => p.id === pipelineId)?.name}”
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sus {pipelineStages(state, pipelineId).length} etapas y sus oportunidades pasarán al
            embudo que elijas. Siempre debe quedar al menos un embudo.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mover todo a</Label>
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelineList
                  .filter((p) => p.id !== pipelineId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={doDeletePipeline} disabled={!moveTarget}>
              Eliminar embudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Papelera de oportunidades</DialogTitle>
          </DialogHeader>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {trashed.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                <span className="truncate">{recordTitle(state.dealFields, d.values)}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {trashDaysLeft(d.deletedAt!)} días
                </span>
                <Button size="sm" variant="ghost" onClick={() => restoreDeal(d)}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restaurar
                </Button>
              </li>
            ))}
            {!trashed.length && (
              <p className="text-sm text-muted-foreground">La papelera está vacía.</p>
            )}
          </ul>
          <p className="text-xs text-muted-foreground">
            Las oportunidades se borran definitivamente 30 días después de eliminarlas.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Menú de la columna: renombrar, color, mover y eliminar la etapa desde el propio tablero. */
function StageMenu({
  stageId,
  pipelineId,
  className,
}: {
  stageId: string;
  pipelineId: string;
  className?: string;
}) {
  const { state, setState } = useCrm();
  const [renaming, setRenaming] = useState(false);
  const stage = state.stages.find((s) => s.id === stageId);
  const [name, setName] = useState(stage?.name ?? "");
  if (!stage) return null;

  // El orden se calcula dentro del embudo, no sobre la lista global de etapas.
  const siblings = pipelineStages(state, pipelineId);
  const index = siblings.findIndex((s) => s.id === stageId);
  const move = (dir: -1 | 1) =>
    setState((s) => {
      const list = [...s.stages];
      const target = siblings[index + dir];
      if (!target) return s;
      const from = list.findIndex((x) => x.id === stageId);
      const to = list.findIndex((x) => x.id === target.id);
      if (from < 0 || to < 0) return s;
      const [m] = list.splice(from, 1);
      list.splice(to, 0, m!);
      return { ...s, stages: list };
    });

  const setColor = (color: string) =>
    setState((s) => ({
      ...s,
      stages: s.stages.map((x) => (x.id === stageId ? { ...x, color } : x)),
    }));

  const rename = () => {
    const value = name.trim();
    if (value)
      setState((s) => ({
        ...s,
        stages: s.stages.map((x) => (x.id === stageId ? { ...x, name: value } : x)),
      }));
    setRenaming(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`shrink-0 rounded p-1 text-muted-foreground hover:bg-accent ${className ?? ""}`}
            aria-label={`Opciones de la etapa ${stage.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setName(stage.name);
              setRenaming(true);
            }}
          >
            Renombrar etapa
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === 0} onSelect={() => move(-1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Mover a la izquierda
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === siblings.length - 1}
            onSelect={() => move(1)}
          >
            <ChevronRight className="mr-1 h-4 w-4" /> Mover a la derecha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex gap-1.5 px-2 py-1.5">
            {STAGE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-popover ${stage.color === c ? "ring-2 ring-foreground" : ""}`}
                style={{ background: c }}
                aria-label="Color de la etapa"
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <StageDeleteDialog
            stage={stage}
            trigger={
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Eliminar etapa
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renombrar etapa</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && rename()}
          />
          <Button onClick={rename}>Guardar</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
