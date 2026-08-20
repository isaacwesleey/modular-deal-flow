import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GripVertical, Plus, Trash2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { BRAND_COLORS, FIELD_TYPE_LABELS, uid } from "@/lib/crm/defaults";
import { PageHeader } from "@/components/crm/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmState, FieldDef, FieldType, ModuleKey } from "@/lib/crm/types";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — CRM Remix" },
      { name: "description", content: "Activa módulos, edita campos personalizados, etapas y tu marca." },
      { property: "og:title", content: "Ajustes — CRM Remix" },
      { property: "og:description", content: "Activa módulos, edita campos personalizados, etapas y tu marca." },
    ],
  }),
  component: AjustesPage,
});

function AjustesPage() {
  const { state, setState, reset } = useCrm();

  const setModule = (k: ModuleKey, v: boolean) =>
    setState((s) => ({ ...s, modules: { ...s.modules, [k]: v } }));

  return (
    <>
      <PageHeader
        title="Ajustes"
        subtitle="Todo se guarda en tu navegador (localStorage). Sin backend."
        action={
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-1 h-4 w-4" /> Restaurar demo
          </Button>
        }
      />

      <Tabs defaultValue="modulos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="campos">Campos</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
          <TabsTrigger value="marca">Marca</TabsTrigger>
        </TabsList>

        <TabsContent value="modulos" className="space-y-3">
          {([
            ["pipeline", "Pipeline / Kanban", "Oportunidades en columnas arrastrables."],
            ["tareas", "Tareas y actividades", "Llamadas, emails y reuniones."],
            ["notas", "Notas", "Timeline de notas libres."],
          ] as [ModuleKey, string, string][]).map(([k, title, desc]) => (
            <div key={k} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                className="ml-auto"
                checked={state.modules[k]}
                onCheckedChange={(v) => setModule(k, v)}
              />
            </div>
          ))}
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Contactos es el módulo base y siempre está activo.
          </div>
        </TabsContent>

        <TabsContent value="campos">
          <div className="grid gap-6 lg:grid-cols-2">
            <FieldEditor entity="contactFields" title="Campos de Contacto" />
            <FieldEditor entity="dealFields" title="Campos de Oportunidad" />
          </div>
        </TabsContent>

        <TabsContent value="etapas">
          <StageEditor />
        </TabsContent>

        <TabsContent value="marca">
          <BrandEditor />
        </TabsContent>
      </Tabs>
    </>
  );
}

function FieldEditor({
  entity,
  title,
}: {
  entity: "contactFields" | "dealFields";
  title: string;
}) {
  const { state, setState } = useCrm();
  const fields = state[entity];
  const [dragId, setDragId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");

  const update = (fn: (list: FieldDef[]) => FieldDef[]) =>
    setState((s: CrmState) => ({ ...s, [entity]: fn(s[entity]) }));

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    update((list) => {
      const copy = [...list];
      const from = copy.findIndex((f) => f.id === dragId);
      const to = copy.findIndex((f) => f.id === targetId);
      if (from < 0 || to < 0) return list;
      const [m] = copy.splice(from, 1);
      copy.splice(to, 0, m!);
      return copy;
    });
    setDragId(null);
  };

  const add = () => {
    if (!newLabel.trim()) return;
    update((list) => [
      ...list,
      {
        id: uid(),
        label: newLabel.trim(),
        type: newType,
        showInQuickView: false,
        ...(newType === "select" || newType === "multiselect" ? { options: ["Opción 1", "Opción 2"] } : {}),
      },
    ]);
    setNewLabel("");
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-2">
        {fields.map((f) => (
          <div
            key={f.id}
            draggable
            onDragStart={() => setDragId(f.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(f.id)}
            className={`rounded-lg border p-2.5 ${dragId === f.id ? "opacity-40" : ""}`}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <Input
                value={f.label}
                onChange={(e) =>
                  update((list) => list.map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)))
                }
                className="h-8 flex-1"
              />
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                {FIELD_TYPE_LABELS[f.type]}
              </span>
              <button
                title="Mostrar en vista rápida"
                onClick={() =>
                  update((list) =>
                    list.map((x) => (x.id === f.id ? { ...x, showInQuickView: !x.showInQuickView } : x)),
                  )
                }
                className={f.showInQuickView ? "text-primary" : "text-muted-foreground"}
              >
                {f.showInQuickView ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              {f.core ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">core</span>
              ) : (
                <button
                  onClick={() => update((list) => list.filter((x) => x.id !== f.id))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Borrar campo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {(f.type === "select" || f.type === "multiselect") && (
              <Input
                value={(f.options ?? []).join(", ")}
                onChange={(e) =>
                  update((list) =>
                    list.map((x) =>
                      x.id === f.id
                        ? { ...x, options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) }
                        : x,
                    ),
                  )
                }
                placeholder="Opciones separadas por comas"
                className="mt-2 h-8 text-xs"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nombre del campo"
          className="h-9 flex-1 min-w-40"
        />
        <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const STAGE_COLORS = [
  "oklch(0.72 0.13 250)",
  "oklch(0.72 0.13 200)",
  "oklch(0.75 0.14 90)",
  "oklch(0.72 0.15 60)",
  "oklch(0.68 0.15 155)",
  "oklch(0.62 0.17 25)",
  "oklch(0.65 0.18 320)",
];

function StageEditor() {
  const { state, setState } = useCrm();
  const [dragId, setDragId] = useState<string | null>(null);

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setState((s) => {
      const copy = [...s.stages];
      const from = copy.findIndex((x) => x.id === dragId);
      const to = copy.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0) return s;
      const [m] = copy.splice(from, 1);
      copy.splice(to, 0, m!);
      return { ...s, stages: copy };
    });
    setDragId(null);
  };

  return (
    <div className="max-w-2xl rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Etapas del pipeline</h2>
      <div className="space-y-2">
        {state.stages.map((st) => (
          <div
            key={st.id}
            draggable
            onDragStart={() => setDragId(st.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(st.id)}
            className={`flex flex-wrap items-center gap-2 rounded-lg border p-2.5 ${dragId === st.id ? "opacity-40" : ""}`}
          >
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
            <Input
              value={st.name}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  stages: s.stages.map((x) => (x.id === st.id ? { ...x, name: e.target.value } : x)),
                }))
              }
              className="h-8 flex-1 min-w-32"
            />
            <div className="flex gap-1">
              {STAGE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      stages: s.stages.map((x) => (x.id === st.id ? { ...x, color: c } : x)),
                    }))
                  }
                  className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-card ${st.color === c ? "ring-2 ring-foreground" : ""}`}
                  style={{ background: c }}
                  aria-label="Color"
                />
              ))}
            </div>
            <button
              onClick={() =>
                setState((s) => ({
                  ...s,
                  stages: s.stages.filter((x) => x.id !== st.id),
                  deals: s.deals.filter((d) => d.stageId !== st.id),
                }))
              }
              className="text-muted-foreground hover:text-destructive"
              aria-label="Borrar etapa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() =>
          setState((s) => ({
            ...s,
            stages: [...s.stages, { id: uid(), name: "Nueva etapa", color: STAGE_COLORS[0]! }],
          }))
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Añadir etapa
      </Button>
    </div>
  );
}

function BrandEditor() {
  const { state, setState } = useCrm();
  const b = state.branding;
  const set = (patch: Partial<typeof b>) =>
    setState((s) => ({ ...s, branding: { ...s.branding, ...patch } }));

  return (
    <div className="max-w-lg space-y-5 rounded-xl border bg-card p-5">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Nombre de la empresa</Label>
        <Input value={b.companyName} onChange={(e) => set({ companyName: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Logo (emoji o URL de imagen)</Label>
        <Input value={b.logo} onChange={(e) => set({ logo: e.target.value })} placeholder="◆ o https://..." />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color de marca</Label>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => set({ brandHue: c.value })}
              className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-card ${b.brandHue === c.value ? "ring-2 ring-foreground" : ""}`}
              style={{ background: c.value }}
              aria-label={c.name}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Modo oscuro</Label>
        <Switch
          checked={b.theme === "dark"}
          onCheckedChange={(v) => set({ theme: v ? "dark" : "light" })}
        />
      </div>
    </div>
  );
}