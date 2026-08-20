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

export const Route = createFileRoute("/restablecer")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Nueva contraseña — CRM Remix" },
      { name: "description", content: "Crea una contraseña nueva para volver a entrar en tu organización." },
      { property: "og:title", content: "Nueva contraseña — CRM Remix" },
      { property: "og:description", content: "Crea una contraseña nueva para volver a entrar en tu organización." },
    ],
  }),
  component: RestablecerPage,
});

function RestablecerPage() {
  const { token } = Route.useSearch();
  const { tokens, resetPassword } = useCrm();
  const navigate = useNavigate();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const found = tokens.find((t) => t.token === token && t.kind === "reset");
  const status = tokenStatus(found);

  if (status !== "ok")
    return (
      <AuthShell title="Enlace no válido">
        <p className="text-sm text-muted-foreground">{TOKEN_MESSAGES[status]}</p>
        <Button asChild className="mt-4 w-full">
          <Link to="/recuperar">Solicitar un enlace nuevo</Link>
        </Button>
      </AuthShell>
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const res = resetPassword(token!, pass);
    if (!res.ok) {
      setError(res.error ?? "No se pudo cambiar la contraseña.");
      return;
    }
    toast.success("Contraseña actualizada. Ya puedes entrar.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <AuthShell title="Crea tu nueva contraseña" {...(found?.email ? { subtitle: found.email } : {})}>
      <form className="space-y-3" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="np">Nueva contraseña</Label>
          <Input id="np" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} />
          {pass && <PasswordStrength value={passwordStrength(pass)} />}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np2">Repite la contraseña</Label>
          <Input id="np2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">Guardar contraseña</Button>
      </form>
    </AuthShell>
  );
}
