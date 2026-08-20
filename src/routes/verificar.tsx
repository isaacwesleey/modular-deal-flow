import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { AuthShell } from "@/components/crm/AuthShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verificar")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verificar email — CRM Remix" },
      { name: "description", content: "Confirma tu dirección de correo para activar todas las funciones de tu cuenta." },
      { property: "og:title", content: "Verificar email — CRM Remix" },
      { property: "og:description", content: "Confirma tu dirección de correo para activar todas las funciones de tu cuenta." },
    ],
  }),
  component: VerificarPage,
});

function VerificarPage() {
  const { token } = Route.useSearch();
  const { verifyEmail, user } = useCrm();
  const navigate = useNavigate();
  const done = useRef(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (done.current || !token) return;
    done.current = true;
    setResult(verifyEmail(token));
  }, [token, verifyEmail]);

  if (!token)
    return (
      <AuthShell title="Enlace incompleto">
        <p className="text-sm text-muted-foreground">
          Falta el código de verificación. Abre el enlace tal cual aparece en tu correo.
        </p>
      </AuthShell>
    );

  if (!result) return <AuthShell title="Verificando…"><p className="text-sm text-muted-foreground">Un momento.</p></AuthShell>;

  return (
    <AuthShell title={result.ok ? "Email verificado" : "No se pudo verificar"}>
      {result.ok ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            Tu dirección de correo está confirmada. Ya puedes usar la cuenta con normalidad.
          </p>
          <Button className="w-full" onClick={() => navigate({ to: user ? "/" : "/auth" })}>
            {user ? "Ir al panel" : "Iniciar sesión"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{result.error}</p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/auth">Volver a iniciar sesión</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
