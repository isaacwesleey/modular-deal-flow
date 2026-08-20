import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCrm } from "@/lib/crm/store";
import { tokenLink } from "@/lib/crm/tokens";
import { AuthShell, SimulatedMail } from "@/components/crm/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — CRM Remix" },
      { name: "description", content: "Recibe un enlace para crear una contraseña nueva y recuperar el acceso a tu organización." },
      { property: "og:title", content: "Recuperar contraseña — CRM Remix" },
      { property: "og:description", content: "Recibe un enlace para crear una contraseña nueva y recuperar el acceso a tu organización." },
    ],
  }),
  component: RecuperarPage,
});

function RecuperarPage() {
  const { requestPasswordReset } = useCrm();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = requestPasswordReset(email);
    if (!res.ok) {
      setError(res.error ?? "No se pudo completar la solicitud.");
      return;
    }
    setError(null);
    setSent(true);
    setLink(res.token ? tokenLink("/restablecer", res.token) : null);
  };

  return (
    <AuthShell
      title="Recuperar el acceso"
      subtitle="Te enviamos un enlace para crear una contraseña nueva."
      footer={<Link to="/auth" className="underline underline-offset-4">Volver a iniciar sesión</Link>}
    >
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm">
            Si <strong>{email}</strong> corresponde a una cuenta, encontrarás en tu correo un enlace
            para crear una contraseña nueva. Caduca en una hora.
          </p>
          {link && <SimulatedMail label="Enlace del correo" link={link} />}
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
            Usar otro email
          </Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="rec-email">Email de tu cuenta</Label>
            <Input
              id="rec-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Enviar enlace</Button>
        </form>
      )}
    </AuthShell>
  );
}
