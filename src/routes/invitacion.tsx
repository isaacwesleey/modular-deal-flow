import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useCrm } from "@/lib/crm/store";
import { passwordStrength, tokenStatus, TOKEN_MESSAGES } from "@/lib/crm/tokens";
import { AuthShell, PasswordStrength } from "@/components/crm/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/invitacion")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Unirse a la organización — Ventia" },
      { name: "description", content: "Acepta la invitación de tu equipo y empieza a trabajar en su CRM." },
      { property: "og:title", content: "Unirse a la organización — Ventia" },
      { property: "og:description", content: "Acepta la invitación de tu equipo y empieza a trabajar en su CRM." },
    ],
  }),
  component: InvitacionPage,
});

function InvitacionPage() {
  const { token } = Route.useSearch();
  const { tokens, root, acceptInvite } = useCrm();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invite = tokens.find((t) => t.token === token && t.kind === "invite");
  const status = tokenStatus(invite);

  if (status !== "ok" || !invite)
    return (
      <AuthShell title="Invitación no válida">
        <p className="text-sm text-muted-foreground">{TOKEN_MESSAGES[status === "ok" ? "missing" : status]}</p>
        <Button asChild className="mt-4 w-full">
          <Link to="/auth">Ir a iniciar sesión</Link>
        </Button>
      </AuthShell>
    );

  const orgName = invite.tenantId ? (root.tenants[invite.tenantId]?.name ?? "la organización") : "la organización";
  const existing = root.users.find((u) => u.email.toLowerCase() === invite.email);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = acceptInvite(token!, { name, password: pass });
    if (!res.ok) {
      setError(res.error ?? "No se pudo aceptar la invitación.");
      return;
    }
    toast.success(`Ya formas parte de ${orgName}`);
    navigate({ to: "/inicio", replace: true });
  };

  return (
    <AuthShell
      title={`Únete a ${orgName}`}
      subtitle={`${invite.invitedByName ?? "Un administrador"} te ha invitado como ${invite.role === "admin" ? "administrador" : "usuario"}.`}
    >
      <form className="space-y-3" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="inv-mail">Email</Label>
          <Input id="inv-mail" value={invite.email} readOnly disabled />
        </div>
        {existing ? (
          <p className="text-sm text-muted-foreground">
            Ya tienes una cuenta con este email: al aceptar, {orgName} se añadirá a tu conmutador de
            organizaciones.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="inv-nombre">Tu nombre</Label>
              <Input id="inv-nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-pass">Crea una contraseña</Label>
              <Input id="inv-pass" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} />
              {pass && <PasswordStrength value={passwordStrength(pass)} />}
            </div>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">Aceptar invitación</Button>
      </form>
    </AuthShell>
  );
}
