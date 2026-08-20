import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, UserCog, User as UserIcon } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { passwordStrength } from "@/lib/crm/tokens";
import { PasswordStrength } from "@/components/crm/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VentiaLogo } from "@/components/site/VentiaLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Ventia" },
      { name: "description", content: "Accede a tu organización o crea una nueva en el CRM modular." },
      { property: "og:title", content: "Entrar — Ventia" },
      { property: "og:description", content: "Accede a tu organización o crea una nueva en el CRM modular." },
    ],
  }),
  component: AuthPage,
});

/**
 * Accesos rápidos: se calculan sobre los usuarios que existen de verdad en el
 * espacio de trabajo, así no se anuncian cuentas que se han eliminado ni un
 * número de organizaciones que ya no es cierto.
 */
const QUICK_ACCESS = [
  { id: "u-super", label: "Super admin", hint: "ve todas las organizaciones", icon: ShieldCheck },
  { id: "u-admin", label: "Admin de organización", hint: "configura campos y equipo", icon: UserCog },
  { id: "u-user", label: "Usuario", hint: "operativa diaria, sin Ajustes", icon: UserIcon },
];

function AuthPage() {
  const { login, register, loginAs, user, tenant, isSuperAdmin, hydrated, root } = useCrm();
  const navigate = useNavigate();

  const quickAccess = QUICK_ACCESS.flatMap((d) => {
    const u = root.users.find((x) => x.id === d.id);
    if (!u) return [];
    return [{ ...d, desc: `${u.email} — ${d.hint}` }];
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");

  useEffect(() => {
    if (!hydrated || !user) return;
    if (isSuperAdmin) navigate({ to: "/admin", replace: true });
    else if (tenant) navigate({ to: "/inicio", replace: true });
  }, [hydrated, user, tenant, isSuperAdmin, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Link to="/" className="mx-auto flex w-fit items-center gap-2">
            <VentiaLogo size="lg" />
          </Link>
          <p className="text-sm text-muted-foreground">CRM multi organización para equipos comerciales.</p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
              <TabsTrigger value="registro" className="flex-1">Crear organización</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3 pt-4">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = login(email, password);
                  if (!res.ok) toast.error(res.error ?? "No se pudo iniciar sesión");
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">Entrar</Button>
                <p className="text-center text-sm">
                  <Link to="/recuperar" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    ¿Has olvidado tu contraseña?
                  </Link>
                </p>
              </form>
            </TabsContent>

            <TabsContent value="registro" className="space-y-3 pt-4">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = register({ company, name, email: rEmail, password: rPass });
                  if (!res.ok) toast.error(res.error ?? "No se pudo crear la organización");
                  else toast.success("Organización creada");
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="company">Nombre de la organización</Label>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Tu nombre</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="remail">Email</Label>
                  <Input id="remail" type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rpass">Contraseña</Label>
                  <Input id="rpass" type="password" autoComplete="new-password" value={rPass} onChange={(e) => setRPass(e.target.value)} required minLength={6} />
                  {rPass && <PasswordStrength value={passwordStrength(rPass)} />}
                </div>
                <Button type="submit" className="w-full">Crear organización</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {quickAccess.length > 0 && (
        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Acceso rápido
          </p>
          <div className="mt-3 space-y-2">
            {quickAccess.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  const res = loginAs(d.id);
                  if (!res.ok) toast.error(res.error ?? "No se pudo iniciar sesión");
                }}
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <d.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{d.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{d.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
