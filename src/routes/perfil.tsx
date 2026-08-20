import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, MailWarning } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { passwordStrength, tokenLink } from "@/lib/crm/tokens";
import { PageHeader } from "@/components/crm/Layout";
import { PasswordStrength, SimulatedMail } from "@/components/crm/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Mi cuenta — CRM Remix" },
      { name: "description", content: "Gestiona tus datos, tu contraseña y tus preferencias de trabajo en el CRM." },
      { property: "og:title", content: "Mi cuenta — CRM Remix" },
      { property: "og:description", content: "Gestiona tus datos, tu contraseña y tus preferencias de trabajo en el CRM." },
    ],
  }),
  component: PerfilPage,
});

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"];

function PerfilPage() {
  const { user, root, myTenants, updateProfile, updatePrefs, changePassword, requestVerification } =
    useCrm();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verifyLink, setVerifyLink] = useState<string | null>(null);

  if (!user) return null;
  const prefs = user.prefs ?? {};
  const initial = (user.name.trim()[0] ?? "?").toUpperCase();

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateProfile({ name, email });
    if (!res.ok) return toast.error(res.error ?? "No se pudo guardar");
    toast.success(
      email.trim().toLowerCase() !== user.email
        ? "Datos guardados. Confirma tu nueva dirección de correo."
        : "Datos guardados",
    );
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return toast.error("Las contraseñas nuevas no coinciden.");
    const res = changePassword(current, next);
    if (!res.ok) return toast.error(res.error ?? "No se pudo cambiar la contraseña");
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Contraseña actualizada");
  };

  const resend = () => {
    const res = requestVerification();
    if (!res.ok) return toast.error(res.error ?? "No se pudo reenviar");
    setVerifyLink(res.token ? tokenLink("/verificar", res.token) : null);
    toast.success("Te hemos enviado un correo de confirmación");
  };

  return (
    <>
      <PageHeader title="Mi cuenta" subtitle="Tus datos, tu acceso y cómo quieres ver la aplicación." />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-semibold text-white"
          style={{ background: prefs.avatarColor ?? AVATAR_COLORS[0] }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            {user.name}
            {user.emailVerified ? (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="h-3.5 w-3.5" /> Verificado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-amber-600">
                <MailWarning className="h-3.5 w-3.5" /> Sin verificar
              </Badge>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Color de avatar ${c}`}
              onClick={() => updatePrefs({ avatarColor: c })}
              className={`h-7 w-7 rounded-full border-2 transition ${
                (prefs.avatarColor ?? AVATAR_COLORS[0]) === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {!user.emailVerified && (
        <div className="mb-6 space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm">
            Tu dirección <strong>{user.email}</strong> todavía no está confirmada. Confírmala para
            asegurar la recuperación de tu cuenta.
          </p>
          <Button size="sm" variant="outline" onClick={resend}>
            Reenviar correo de confirmación
          </Button>
          {verifyLink && <SimulatedMail label="Enlace del correo" link={verifyLink} />}
        </div>
      )}

      <Tabs defaultValue="datos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="datos">Datos personales</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
          <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
          <TabsTrigger value="orgs">Organizaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <form onSubmit={saveProfile} className="max-w-md space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nombre</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-mail">Email</Label>
              <Input id="p-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <p className="text-xs text-muted-foreground">
                Si cambias el email tendrás que confirmar la nueva dirección.
              </p>
            </div>
            <Button type="submit">Guardar cambios</Button>
          </form>
        </TabsContent>

        <TabsContent value="seguridad">
          <form onSubmit={savePassword} className="max-w-md space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-1.5">
              <Label htmlFor="p-cur">Contraseña actual</Label>
              <Input id="p-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-new">Nueva contraseña</Label>
              <Input id="p-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
              {next && <PasswordStrength value={passwordStrength(next)} />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-conf">Repite la nueva contraseña</Label>
              <Input id="p-conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit">Cambiar contraseña</Button>
          </form>
        </TabsContent>

        <TabsContent value="preferencias">
          <div className="grid max-w-2xl gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tema</Label>
              <Select
                value={prefs.theme ?? "auto"}
                onValueChange={(v) => updatePrefs({ theme: v as "light" | "dark" | "auto" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">El de la organización</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Oscuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Densidad de las tablas</Label>
              <Select
                value={prefs.density ?? "comoda"}
                onValueChange={(v) => updatePrefs({ density: v as "comoda" | "compacta" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comoda">Cómoda</SelectItem>
                  <SelectItem value="compacta">Compacta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Registros por página</Label>
              <Select
                value={String(prefs.pageSize ?? 10)}
                onValueChange={(v) => updatePrefs({ pageSize: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-tz">Zona horaria</Label>
              <Input
                id="p-tz"
                value={prefs.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
                onChange={(e) => updatePrefs({ timezone: e.target.value })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orgs">
          <div className="divide-y rounded-xl border bg-card">
            {myTenants.map((t) => {
              const m = user.memberships.find((x) => x.tenantId === t.id);
              return (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.superAdmin && !m
                        ? "Acceso de plataforma"
                        : m?.role === "admin"
                          ? "Administrador"
                          : "Usuario"}
                    </p>
                  </div>
                  {t.id === root.currentTenantId && (
                    <Badge variant="secondary" className="ml-auto">Activa</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
