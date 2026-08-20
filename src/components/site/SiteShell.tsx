import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, ArrowRight } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { VentiaLogo } from "./VentiaLogo";
import { CookieBanner } from "./CookieBanner";

const NAV = [
  { href: "/#funciones", label: "Funciones" },
  { href: "/#casos", label: "Casos de uso" },
  { href: "/precios", label: "Precios" },
  { href: "/#faq", label: "Preguntas" },
];

/** Botón de acción principal de toda la web (misma acción repetida = CRO). */
export function CtaPrimary({
  children,
  className = "",
  to = "/auth",
}: {
  children: ReactNode;
  className?: string;
  to?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-ventia-deep px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-ventia-deep/20 transition-transform hover:-translate-y-0.5 hover:bg-ventia-deep/90 ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SiteHeader() {
  const { user, hydrated } = useCrm();
  const [open, setOpen] = useState(false);
  const signedIn = hydrated && Boolean(user);

  return (
    <header className="sticky top-0 z-40 border-b border-ventia-line/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" aria-label="Ventia, inicio">
          <VentiaLogo />
        </Link>
        <nav className="ml-4 hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-ventia-ink-soft transition-colors hover:text-ventia-deep"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          {signedIn ? (
            <CtaPrimary to="/inicio">Entrar en Ventia</CtaPrimary>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-semibold text-ventia-ink-soft hover:text-ventia-deep">
                Iniciar sesión
              </Link>
              <CtaPrimary>Crear cuenta gratis</CtaPrimary>
            </>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-lg border border-ventia-line p-2 md:hidden"
          aria-label="Abrir menú"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-ventia-line bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-sm font-medium">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {signedIn ? (
              <CtaPrimary to="/inicio" className="w-full">Entrar en Ventia</CtaPrimary>
            ) : (
              <>
                <CtaPrimary className="w-full">Crear cuenta gratis</CtaPrimary>
                <Link
                  to="/auth"
                  className="rounded-xl border border-ventia-line px-5 py-3 text-center text-sm font-semibold"
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-ventia-line bg-ventia-ink text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <VentiaLogo tone="invert" />
          <p className="mt-3 max-w-xs text-sm">
            El CRM que se adapta a cómo vende tu equipo, no al revés. Sin hojas de cálculo, sin
            campos que no usas.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Producto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="/#funciones" className="hover:text-white">Funciones</a></li>
            <li><a href="/#casos" className="hover:text-white">Casos de uso</a></li>
            <li><Link to="/precios" className="hover:text-white">Precios</Link></li>
            <li><a href="/#faq" className="hover:text-white">Preguntas frecuentes</a></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Empresa</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="/#contacto" className="hover:text-white">Contacto</a></li>
            <li><Link to="/auth" className="hover:text-white">Iniciar sesión</Link></li>
            <li><Link to="/auth" className="hover:text-white">Crear cuenta</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/legal/aviso-legal" className="hover:text-white">Aviso legal</Link></li>
            <li><Link to="/legal/privacidad" className="hover:text-white">Política de privacidad</Link></li>
            <li><Link to="/legal/cookies" className="hover:text-white">Política de cookies</Link></li>
            <li><Link to="/legal/terminos" className="hover:text-white">Términos del servicio</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-6 text-center text-xs">
        © {new Date().getFullYear()} Ventia · [Razón social del titular] · [NIF] · [Dirección fiscal]
      </div>
    </footer>
  );
}

/** Marco de todas las páginas públicas: cabecera, contenido, pie y cookies. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="ventia-site min-h-screen">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
