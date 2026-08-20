import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GripVertical, Plus, Trash2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { STAGE_COLORS, StageDeleteDialog } from "@/components/crm/stages";
import { useCrm } from "@/lib/crm/store";
import { BRAND_COLORS, FIELD_TYPE_LABELS, uid } from "@/lib/crm/defaults";
import { tokenLink } from "@/lib/crm/tokens";
import {
  defaultPipelineId,
  isProtectedField,
  pipelineStages,
  pipelines,
  statusField,
} from "@/lib/crm/roles";
import {
  INTAKE_EXAMPLE,
  applyLeadIntake,
  logIntakeError,
  parseLeadPayload,
} from "@/lib/crm/intake";
import { AccessDenied, PageHeader } from "@/components/crm/Layout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmState, FieldDef, FieldRole, FieldType, ModuleKey, Stage } from "@/lib/crm/types";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Ventia" },
      { name: "description", content: "Activa módulos, edita campos personalizados, etapas y tu marca." },
      { property: "og:title", content: "Ajustes — Ventia" },
      { property: "og:description", content: "Activa módulos, edita campos personalizados, etapas y tu marca." },
    ],
  }),
  component: AjustesPage,
});

function AjustesPage() {
  const { state, setState, reset, canManageSettings } = useCrm();

  const setModule = (k: ModuleKey, v: boolean) =>
    setState((s) => ({ ...s, modules: { ...s.modules, [k]: v } }));

  if (!canManageSettings)
    return (
      <AccessDenied message="Solo los administradores de la organización pueden abrir Ajustes." />
    );

  return (
    <>
      <PageHeader
        title="Ajustes"
        subtitle="Configura módulos, campos, etapas, marca y equipo de tu organización."
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RotateCcw className="mr-1 h-4 w-4" /> Restablecer espacio de trabajo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restablecer el espacio de trabajo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borrarán todos tus contactos, oportunidades, tareas, notas, campos
                  personalizados y ajustes de marca. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={reset}>Sí, restablecer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <Tabs defaultValue="modulos" className="space-y-6">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="campos">Campos</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="marca">Marca</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
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

        <TabsContent value="entradas" className="space-y-6">
          <LeadRuleEditor />
          <IntakeEditor />
        </TabsContent>

        <TabsContent value="marca">
          <BrandEditor />
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersEditor />
        </TabsContent>
      </Tabs>
    </>
  );
}

function UsersEditor() {
  const { root, setRoot, tenant, user, createInvite, revokeInvite, pendingInvites } = useCrm();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [lastLink, setLastLink] = useState<{ email: string; link: string } | null>(null);
  if (!tenant) return null;

  const members = root.users.filter((u) => u.memberships.some((m) => m.tenantId === tenant.id));

  const invite = () => {
    const res = createInvite({ email, role });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo enviar la invitación.");
      return;
    }
    setLastLink({ email: email.trim().toLowerCase(), link: tokenLink("/invitacion", res.token!) });
    setEmail("");
    toast.success("Invitación enviada");
  };

  const changeRole = (userId: string, newRole: "admin" | "user") =>
    setRoot((r) => ({
      ...r,
      users: r.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              memberships: u.memberships.map((m) =>
                m.tenantId === tenant.id ? { ...m, role: newRole } : m,
              ),
            }
          : u,
      ),
    }));

  const removeUser = (userId: string) =>
    setRoot((r) => ({
      ...r,
      users: r.users.map((u) =>
        u.id === userId
          ? { ...u, memberships: u.memberships.filter((m) => m.tenantId !== tenant.id) }
          : u,
      ),
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label htmlFor="inv-email">Invitar por email</Label>
          <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />
        </div>
        <div className="w-[150px] space-y-1.5">
          <Label>Rol</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuario</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={invite}><Plus className="mr-1 h-4 w-4" /> Invitar</Button>
        {lastLink && (
          <div className="w-full space-y-1 rounded-lg border border-dashed bg-muted/40 p-3">
            <p className="text-xs font-medium">Enlace enviado a {lastLink.email}</p>
            <a href={lastLink.link} className="block break-all text-xs text-primary underline">
              {lastLink.link}
            </a>
          </div>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <div className="divide-y rounded-xl border bg-card">
          <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Invitaciones pendientes
          </p>
          {pendingInvites.map((t) => (
            <div key={t.token} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.email}</p>
                <p className="text-xs text-muted-foreground">
                  {t.role === "admin" ? "Admin" : "Usuario"} · caduca el{" "}
                  {new Date(t.expiresAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard?.writeText(tokenLink("/invitacion", t.token));
                    toast.success("Enlace copiado");
                  }}
                >
                  Copiar enlace
                </Button>
                <Button variant="ghost" size="sm" onClick={() => revokeInvite(t.token)}>
                  Anular
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="divide-y rounded-xl border bg-card">
        {members.map((m) => {
          const mRole = m.memberships.find((x) => x.tenantId === tenant.id)!.role;
          const isMe = m.id === user?.id;
          return (
            <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.name} {isMe && <span className="text-xs text-muted-foreground">(tú)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Select value={mRole} onValueChange={(v) => changeRole(m.id, v as "admin" | "user")} disabled={isMe}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isMe} aria-label={`Eliminar ${m.email}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar a {m.name} de {tenant.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Perderá el acceso a los datos de esta organización.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeUser(m.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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

  const isDeal = entity === "dealFields";

  /** Un rol es exclusivo: se retira del campo que lo tuviera. */
  const setRole = (fieldId: string, role: FieldRole | "none") =>
    update((list) =>
      list.map((x) => {
        if (x.id === fieldId) {
          if (role === "none") {
            const { role: _omit, ...rest } = x;
            return rest;
          }
          return { ...x, role };
        }
        if (role !== "none" && x.role === role) {
          const { role: _omit, ...rest } = x;
          return rest;
        }
        return x;
      }),
    );

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
              {f.core && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">core</span>
              )}
              {isProtectedField(f) ? (
                <span
                  className="text-muted-foreground/40"
                  title={f.core ? "Campo core: no se puede borrar" : "Campo con rol asignado: no se puede borrar"}
                >
                  <Trash2 className="h-4 w-4" />
                </span>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-destructive" aria-label="Borrar campo">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Borrar el campo “{f.label}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se perderán los datos guardados en este campo en todos los registros.
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => update((list) => list.filter((x) => x.id !== f.id))}
                      >
                        Borrar campo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 pl-6">
              <span className="text-[11px] text-muted-foreground">Rol</span>
              <Select value={f.role ?? "none"} onValueChange={(v) => setRole(f.id, v as FieldRole | "none")}>
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin rol</SelectItem>
                  <SelectItem value="title">Título / nombre</SelectItem>
                  {isDeal && (
                    <SelectItem value="amount" disabled={f.type !== "currency" && f.type !== "number"}>
                      Importe
                    </SelectItem>
                  )}
                  {!isDeal && (
                    <SelectItem value="status" disabled={f.type !== "select"}>
                      Estado del lead
                    </SelectItem>
                  )}
                  {!isDeal && (
                    <SelectItem value="owner" disabled={f.type !== "user"}>
                      Propietario
                    </SelectItem>
                  )}
                  {!isDeal && (
                    <SelectItem value="company" disabled={f.type !== "text"}>
                      Empresa
                    </SelectItem>
                  )}
                  {!isDeal && (
                    <SelectItem value="email" disabled={f.type !== "email"}>
                      Email principal
                    </SelectItem>
                  )}
                  {!isDeal && (
                    <SelectItem value="phone" disabled={f.type !== "phone"}>
                      Teléfono principal
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {(f.type === "select" || f.type === "multiselect") && (
              <OptionsManager field={f} isDeal={isDeal} update={update} />
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


/**
 * Gestión de las opciones de un selector o campo de etiquetas: añadir,
 * renombrar, reordenar y eliminar avisando de a cuántos registros afecta.
 * Renombrar y eliminar actualizan también los registros ya guardados.
 */
function OptionsManager({
  field,
  isDeal,
  update,
}: {
  field: FieldDef;
  isDeal: boolean;
  update: (fn: (list: FieldDef[]) => FieldDef[]) => void;
}) {
  const { state, setState } = useCrm();
  const [adding, setAdding] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const options = field.options ?? [];

  const usageOf = (option: string) =>
    (isDeal ? state.deals : state.contacts).filter((r) => {
      const v = r.values[field.id];
      return Array.isArray(v) ? v.includes(option) : v === option;
    }).length;

  /** Reescribe el valor en todos los registros (renombrar o vaciar). */
  const rewriteRecords = (from: string, to: string | null) =>
    setState((s) => {
      const map = <T extends { values: Record<string, unknown> }>(rows: T[]): T[] =>
        rows.map((r) => {
          const v = r.values[field.id];
          if (Array.isArray(v)) {
            if (!v.includes(from)) return r;
            const next = to ? v.map((x) => (x === from ? to : x)) : v.filter((x) => x !== from);
            return { ...r, values: { ...r.values, [field.id]: next } };
          }
          if (v !== from) return r;
          return { ...r, values: { ...r.values, [field.id]: to ?? "" } };
        });
      return isDeal ? { ...s, deals: map(s.deals) } : { ...s, contacts: map(s.contacts) };
    });

  const rename = (from: string, to: string) => {
    const value = to.trim();
    if (!value || value === from || options.includes(value)) return;
    update((list) =>
      list.map((x) =>
        x.id === field.id ? { ...x, options: (x.options ?? []).map((o) => (o === from ? value : o)) } : x,
      ),
    );
    rewriteRecords(from, value);
  };

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= options.length) return;
    const list = [...options];
    const [m] = list.splice(index, 1);
    list.splice(to, 0, m!);
    update((all) => all.map((x) => (x.id === field.id ? { ...x, options: list } : x)));
  };

  const removeOption = (option: string) => {
    update((all) =>
      all.map((x) => (x.id === field.id ? { ...x, options: (x.options ?? []).filter((o) => o !== option) } : x)),
    );
    rewriteRecords(option, null);
    setConfirm(null);
    toast.success("Opción eliminada");
  };

  const add = () => {
    const value = adding.trim();
    if (!value || options.some((o) => o.toLowerCase() === value.toLowerCase())) return;
    update((all) => all.map((x) => (x.id === field.id ? { ...x, options: [...options, value] } : x)));
    setAdding("");
  };

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/30 p-2">
      {options.map((o, i) => (
        <div key={o} className="flex items-center gap-1">
          <Input
            defaultValue={o}
            onBlur={(e) => rename(o, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="h-7 flex-1 text-xs"
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => move(i, -1)}>
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            disabled={i === options.length - 1}
            onClick={() => move(i, 1)}
          >
            ↓
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setConfirm(o)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {!options.length && <p className="text-xs text-muted-foreground">Sin opciones todavía.</p>}
      <div className="flex gap-1 pt-1">
        <Input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nueva opción"
          className="h-7 text-xs"
        />
        <Button size="sm" variant="outline" className="h-7 px-2" onClick={add} disabled={!adding.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar “{confirm}”</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm && usageOf(confirm) > 0
                ? `Esta opción está en uso en ${usageOf(confirm)} ${
                    usageOf(confirm) === 1 ? "registro" : "registros"
                  }. Se quitará también de ellos.`
                : "No está en uso en ningún registro."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirm && removeOption(confirm)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
            <StageDeleteDialog stage={st} />
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
  return <BrandEditorInner />;
}

function BrandEditorInner() {
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
/**
 * Regla de conversión automática: cuando el estado del lead pasa a X,
 * se crea una oportunidad en la etapa Y del embudo elegido.
 */
function LeadRuleEditor() {
  const { state, setState } = useCrm();
  const rule = state.leadToDeal ?? { enabled: false, statusValue: "", pipelineId: "", stageId: "" };
  const status = statusField(state.contactFields);
  const pipelineId = rule.pipelineId || defaultPipelineId(state);
  const stages = pipelineStages(state, pipelineId);

  const patch = (p: Partial<typeof rule>) =>
    setState((s) => ({ ...s, leadToDeal: { ...rule, ...p } }));

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-4">
        <div>
          <h2 className="text-sm font-semibold">Conversión automática a oportunidad</h2>
          <p className="text-xs text-muted-foreground">
            Cuando un lead cambia a un estado concreto, se crea su oportunidad sola.
          </p>
        </div>
        <Switch
          className="ml-auto"
          checked={rule.enabled}
          onCheckedChange={(v) => patch({ enabled: v })}
        />
      </div>

      {!status && (
        <p className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Necesitas un campo de contacto con el rol “Estado del lead” para usar esta regla.
        </p>
      )}

      {status && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cuando el estado sea</Label>
            <Select
              {...(rule.statusValue ? { value: rule.statusValue } : {})}
              onValueChange={(v) => patch({ statusValue: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Elige un estado" />
              </SelectTrigger>
              <SelectContent>
                {(status.options ?? []).map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">En el embudo</Label>
            <Select value={pipelineId} onValueChange={(v) => patch({ pipelineId: v, stageId: "" })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines(state).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Crear en la etapa</Label>
            <Select
              value={stages.some((s) => s.id === rule.stageId) ? rule.stageId : (stages[0]?.id ?? "")}
              onValueChange={(v) => patch({ stageId: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Entradas por webhook o API.
 *
 * ⚠️ SIMULADO: en producción esto es un endpoint de servidor
 * (por ejemplo `POST /api/public/leads`) que valida la FIRMA de la petición
 * con la clave de la organización antes de escribir nada. Aquí la clave se
 * muestra solo para enseñar el patrón: todo ocurre en el navegador.
 */
function IntakeEditor() {
  const { state, setState, tenant } = useCrm();
  const [payload, setPayload] = useState(INTAKE_EXAMPLE);
  const intake = state.intake ?? { key: "", logs: [] };
  const origin = typeof window === "undefined" ? "https://tu-dominio.com" : window.location.origin;
  const url = `${origin}/api/public/leads/${tenant?.id ?? ""}`;

  const send = () => {
    const parsed = parseLeadPayload(payload);
    if (!parsed.ok) {
      setState((s) => logIntakeError(s, "Simulador", parsed.error, payload));
      toast.error(parsed.error);
      return;
    }
    let message = "";
    setState((s) => {
      const res = applyLeadIntake(s, { ...parsed.input, source: "Webhook" }, {
        actorName: "Webhook",
        logIntake: true,
        payload,
      });
      message = res.message;
      return res.state;
    });
    toast.success(message || "Lead creado");
  };

  const regenerate = () =>
    setState((s) => ({ ...s, intake: { key: `vk_${uid()}${uid()}`, logs: s.intake?.logs ?? [] } }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Webhook de entrada</h2>
        <p className="text-xs text-muted-foreground">
          Manda leads desde tu web, tus anuncios o cualquier herramienta externa.
        </p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={url} className="h-9 font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(url);
                  toast.success("URL copiada");
                }}
              >
                Copiar
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Clave de la organización</Label>
            <div className="flex gap-2">
              <Input readOnly value={intake.key} className="h-9 font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={regenerate}>
                Regenerar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Se envía en la cabecera <code>X-Ventia-Key</code>. En producción el servidor valida
              con ella la firma de la petición.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cuerpo esperado (JSON)</Label>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
              {INTAKE_EXAMPLE}
            </pre>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Simulador</h2>
        <p className="text-xs text-muted-foreground">
          Pega un JSON y crea el lead de verdad, con su origen y su regla de conversión.
        </p>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={10}
          className="mt-3 w-full rounded-lg border bg-background p-3 font-mono text-xs"
        />
        <Button className="mt-2" size="sm" onClick={send}>
          Enviar entrada
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Últimas entradas recibidas</h2>
        {intake.logs.length ? (
          <ul className="mt-3 space-y-2">
            {intake.logs.map((l) => (
              <li key={l.id} className="rounded-lg border p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      l.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {l.ok ? "Correcta" : "Error"}
                  </span>
                  <span className="font-medium">{l.source}</span>
                  <span className="text-muted-foreground">
                    {new Date(l.at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{l.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Todavía no ha entrado ningún lead por esta vía.
          </p>
        )}
      </div>
    </div>
  );
}
