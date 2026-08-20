import { Link } from "@tanstack/react-router";
import { VentiaMark } from "@/components/site/VentiaLogo";
import type { ReactNode } from "react";

/** Marco visual compartido por las pantallas de cuenta fuera de la app. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Link to="/" className="mx-auto flex w-fit items-center">
            <VentiaMark className="h-11 w-11" />
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-xl border bg-background p-5 shadow-sm">{children}</div>
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Sobre simulado: en la plantilla no hay servidor de correo, así que el enlace
 * se muestra aquí. ⚠️ En producción esto NUNCA se enseña en pantalla: el token
 * viaja solo dentro del email que envía el proveedor de autenticación.
 */
export function SimulatedMail({ label, link }: { label: string; link: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-dashed bg-muted/40 p-3">
      <p className="text-xs font-medium">{label}</p>
      <a href={link} className="block break-all text-xs text-primary underline underline-offset-2">
        {link}
      </a>
    </div>
  );
}

export function PasswordStrength({ value }: { value: { score: number; label: string } }) {
  const colors = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < value.score ? colors[value.score] : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Seguridad: {value.label}</p>
    </div>
  );
}
