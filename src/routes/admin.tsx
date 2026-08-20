import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, LogOut, Play, Pause, Plus, LifeBuoy, Trash2 } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { EXAMPLE_TENANT, createExampleTenant, emptyTenantState, uid } from "@/lib/crm/defaults";
import { AccessDenied } from "@/components/crm/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tenant } from "@/lib/crm/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel SaaS — Ventia" },
      { name: "description", content: "Panel del super admin: organizaciones, usuarios y uso de la plataforma." },
      { property: "og:title", content: "Panel SaaS — Ventia" },
      { property: "og:description", content: "Panel del super admin: organizaciones, usuarios y uso de la plataforma." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { root, setRoot, isSuperAdmin, user, logout, enterSupport, hydrated, deleteTenant } =
    useCrm();
  const navigate = useNavigate();
  const [company, setCompany] = useState("");

  if (!hydrated) return null;
  if (!user || !isSuperAdmin)
    return (
      <div className="p-6">
        <AccessDenied message="Esta zona es exclusiva del super admin del SaaS." />
      </div>
    );

  const tenants = Object.values(root.tenants);

  const createTenant = () => {
    const name = company.trim();
    if (!name) return;
    const id = uid();
    const tenant: Tenant = {
      id,
      name,
      createdAt: new Date().toISOString(),
      state: emptyTenantState(name, tenants.length),
    };
    setRoot((r) => ({ ...r, tenants: { ...r.tenants, [id]: tenant } }));
    setCompany("");
    toast.success(`Organización “${name}” creada`);
  };

  const addExample = () => {
    setRoot((r) => createExampleTenant(r));
    toast.success("Organización de ejemplo “Studio Norte” creada");
  };

  const toggleSuspend = (t: Tenant) =>
    setRoot((r) => ({
      ...r,
      tenants: { ...r.tenants, [t.id]: { ...t, suspended: !t.suspended } },
    }));

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background px-4">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="font-semibold">Panel SaaS</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:block">{user.email}</span>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenants.length} {tenants.length === 1 ? "organización" : "organizaciones"} ·{" "}
            {root.users.filter((u) => !u.superAdmin).length}{" "}
            {root.users.filter((u) => !u.superAdmin).length === 1 ? "usuario" : "usuarios"}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-background p-4">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="new-tenant">Nueva organización</Label>
            <Input
              id="new-tenant"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nombre de la empresa"
            />
          </div>
          <Button onClick={createTenant}>
            <Plus className="mr-1 h-4 w-4" /> Crear
          </Button>
          {!root.tenants[EXAMPLE_TENANT] && (
            <Button variant="outline" onClick={addExample}>
              Crear organización de ejemplo
            </Button>
          )}
        </div>
        {!root.tenants[EXAMPLE_TENANT] && (
          <p className="-mt-4 text-xs text-muted-foreground">
            La organización de ejemplo llega ya poblada con sus propios contactos, campos, etapas y
            marca: sirve para comprobar que los datos están aislados entre organizaciones.
          </p>
        )}

        <div className="space-y-3">
          {tenants.map((t) => {
            const members = root.users.filter((u) => u.memberships.some((m) => m.tenantId === t.id));
            return (
              <div key={t.id} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {t.name}{" "}
                      {t.suspended && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                          Suspendida
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {members.length} {members.length === 1 ? "usuario" : "usuarios"} · {t.state.contacts.filter((c) => !c.deletedAt).length} contactos ·{" "}
                      {t.state.deals.filter((d) => !d.deletedAt).length} oportunidades · {t.state.tasks.length} tareas ·{" "}
                      {t.state.notes.length} notas
                    </p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleSuspend(t)}>
                      {t.suspended ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
                      {t.suspended ? "Reactivar" : "Suspender"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        enterSupport(t.id);
                        navigate({ to: "/inicio" });
                      }}
                    >
                      <LifeBuoy className="mr-1 h-4 w-4" /> Entrar en soporte
                    </Button>
                    <DeleteTenantButton tenant={t} onConfirm={() => deleteTenant(t.id)} />
                  </div>
                </div>

                {members.length > 0 && (
                  <ul className="mt-3 grid gap-1 border-t pt-3 text-sm sm:grid-cols-2">
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                        <span className="truncate">{m.name} · {m.email}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                          {m.memberships.find((x) => x.tenantId === t.id)?.role === "admin" ? "Admin" : "Usuario"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/** Eliminación definitiva de una organización: exige escribir su nombre exacto. */
function DeleteTenantButton({ tenant, onConfirm }: { tenant: Tenant; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const match = text.trim() === tenant.name;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => {
          setText("");
          setOpen(true);
        }}
      >
        <Trash2 className="mr-1 h-4 w-4" /> Eliminar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar “{tenant.name}”</DialogTitle>
            <DialogDescription>
              Se perderán todos sus datos: contactos, oportunidades, tareas, notas, historial,
              campos, etapas y marca. Sus usuarios dejarán de tener acceso. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-name">
              Escribe <strong>{tenant.name}</strong> para confirmar
            </Label>
            <Input id="confirm-name" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!match}
              onClick={() => {
                onConfirm();
                setOpen(false);
                toast.success(`Organización “${tenant.name}” eliminada`);
              }}
            >
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
