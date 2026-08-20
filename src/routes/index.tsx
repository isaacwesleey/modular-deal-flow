import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GripVertical, X, Plus, TrendingUp } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { uid } from "@/lib/crm/defaults";
import { amountField, recordTitle, sumDeals } from "@/lib/crm/roles";
import { PageHeader } from "@/components/crm/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BlockKey, DashboardBlock } from "@/lib/crm/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — CRM Remix" },
      { name: "description", content: "Dashboard de bloques configurable de tu CRM." },
      { property: "og:title", content: "Inicio — CRM Remix" },
      { property: "og:description", content: "Dashboard de bloques configurable de tu CRM." },
    ],
  }),
  component: Dashboard,
});

const BLOCK_LABELS: Record<BlockKey, string> = {
  "pipeline-resumen": "Resumen del pipeline",
  "tareas-hoy": "Tareas de hoy",
  "ultimos-contactos": "Últimos contactos",
  actividad: "Actividad reciente",
  numero: "Número grande",
};

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function Dashboard() {
  const { state, setState } = useCrm();
  const [dragId, setDragId] = useState<string | null>(null);

  const addBlock = (type: BlockKey) =>
    setState((s) => ({
      ...s,
      blocks: [
        ...s.blocks,
        { id: uid(), type, ...(type === "numero" ? { config: { title: "Deals ganados", metric: "deals-ganados" as const } } : {}) },
      ],
    }));

  const removeBlock = (id: string) =>
    setState((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }));

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setState((s) => {
      const list = [...s.blocks];
      const from = list.findIndex((b) => b.id === dragId);
      const to = list.findIndex((b) => b.id === targetId);
      if (from < 0 || to < 0) return s;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved!);
      return { ...s, blocks: list };
    });
    setDragId(null);
  };

  return (
    <>
      <PageHeader
        title={`Hola, ${state.branding.companyName}`}
        subtitle="Arrastra los bloques para reordenar tu inicio."
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Añadir bloque
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(BLOCK_LABELS) as BlockKey[]).map((k) => (
                <DropdownMenuItem key={k} onClick={() => addBlock(k)}>
                  {BLOCK_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.blocks.map((block) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => setDragId(block.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(block.id)}
            className={`group relative rounded-xl border bg-card p-4 shadow-sm transition-opacity ${
              dragId === block.id ? "opacity-40" : ""
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {block.type === "numero" ? block.config?.title ?? "Número" : BLOCK_LABELS[block.type]}
              </h3>
              <button
                onClick={() => removeBlock(block.id)}
                className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Quitar bloque"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BlockBody block={block} />
          </div>
        ))}
        {!state.blocks.length && (
          <p className="text-sm text-muted-foreground">Añade tu primer bloque para empezar.</p>
        )}
      </div>
    </>
  );
}

function BlockBody({ block }: { block: DashboardBlock }) {
  const { state, setState } = useCrm();

  if (block.type === "pipeline-resumen") {
    if (!state.modules.pipeline) return <p className="text-sm text-muted-foreground">Pipeline desactivado.</p>;
    const hasAmount = Boolean(amountField(state.dealFields));
    const total = sumDeals(state.dealFields, state.deals);
    return (
      <div className="space-y-2">
        {state.stages.map((st) => {
          const deals = state.deals.filter((d) => d.stageId === st.id);
          const val = sumDeals(state.dealFields, deals);
          const pct = hasAmount
            ? total
              ? (val / total) * 100
              : 0
            : state.deals.length
              ? (deals.length / state.deals.length) * 100
              : 0;
          return (
            <div key={st.id}>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{st.name}</span>
                <span className="font-medium">
                  {hasAmount ? eur(val) : `${deals.length} oportunidades`}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: st.color }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (block.type === "tareas-hoy") {
    if (!state.modules.tareas) return <p className="text-sm text-muted-foreground">Tareas desactivado.</p>;
    const today = new Date().toISOString().slice(0, 10);
    const list = state.tasks.filter((t) => t.date.slice(0, 10) === today);
    return (
      <ul className="space-y-2">
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() =>
                setState((s) => ({
                  ...s,
                  tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                }))
              }
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.title}</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {t.date.slice(11, 16)}
            </Badge>
          </li>
        ))}
        {!list.length && <p className="text-sm text-muted-foreground">Nada para hoy 🎉</p>}
      </ul>
    );
  }

  if (block.type === "ultimos-contactos") {
    const list = [...state.contacts]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
    return (
      <ul className="space-y-2">
        {list.map((c) => {
          const name = recordTitle(state.contactFields, c.values, "Sin nombre");
          return (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {name.charAt(0)}
              </span>
              <span className="truncate">{name}</span>
            </li>
          );
        })}
        {!list.length && (
          <Link to="/contactos" className="text-sm text-primary underline">
            Añade tu primer contacto
          </Link>
        )}
      </ul>
    );
  }

  if (block.type === "actividad") {
    const items = [
      ...state.notes.map((n) => ({ at: n.createdAt, text: `Nota: ${n.text.slice(0, 60)}` })),
      ...state.contacts.map((c) => ({
        at: c.createdAt,
        text: `Contacto añadido: ${recordTitle(state.contactFields, c.values, "Sin nombre")}`,
      })),
      ...state.deals.map((d) => ({
        at: d.createdAt,
        text: `Oportunidad: ${recordTitle(state.dealFields, d.values)}`,
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 6);
    return (
      <ul className="space-y-2 text-sm">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="truncate">{i.text}</span>
          </li>
        ))}
      </ul>
    );
  }

  // numero
  const metric = block.config?.metric ?? "deals-ganados";
  const wonStage = state.stages.find((s) => /ganado/i.test(s.name));
  const value =
    metric === "deals-ganados"
      ? String(state.deals.filter((d) => d.stageId === wonStage?.id).length)
      : metric === "valor-pipeline"
        ? eur(sumDeals(state.dealFields, state.deals))
        : metric === "contactos"
          ? String(state.contacts.length)
          : String(state.tasks.filter((t) => !t.done).length);

  type Metric = "deals-ganados" | "valor-pipeline" | "contactos" | "tareas-pendientes";
  const metrics: { key: Metric; label: string }[] = [
    { key: "deals-ganados", label: "Deals ganados" },
    { key: "valor-pipeline", label: "Valor del pipeline" },
    { key: "contactos", label: "Contactos" },
    { key: "tareas-pendientes", label: "Tareas pendientes" },
  ];

  return (
    <div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tracking-tight">{value}</span>
        <TrendingUp className="mb-1.5 h-5 w-5 text-primary" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() =>
              setState((s) => ({
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id === block.id ? { ...b, config: { title: m.label, metric: m.key } } : b,
                ),
              }))
            }
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              metric === m.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}