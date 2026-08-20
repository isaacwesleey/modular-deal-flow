import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CrmProvider, useCrm } from "../lib/crm/store";
import { CrmLayout } from "../components/crm/Layout";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">No encontramos esta página</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La dirección no existe o el contenido se ha movido a otro sitio.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página no se ha podido cargar
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ha ocurrido un problema por nuestra parte. Prueba a recargar o vuelve al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CRM Remix — plantilla modular" },
      {
        name: "description",
        content: "Plantilla de CRM modular y personalizable: contactos, pipeline, tareas y notas.",
      },
      { property: "og:title", content: "CRM Remix — plantilla modular" },
      {
        property: "og:description",
        content: "Plantilla de CRM modular y personalizable: contactos, pipeline, tareas y notas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CrmProvider>
        <AuthGate />
        <Toaster />
      </CrmProvider>
    </QueryClientProvider>
  );
}

/** Rutas protegidas: sin sesión, todo redirige al login. */
function AuthGate() {
  const { hydrated, user, tenant, isSuperAdmin, myTenants, switchTenant, logout } = useCrm();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const PUBLIC = ["/auth", "/recuperar", "/restablecer", "/verificar", "/invitacion"];
  const isAuthRoute = PUBLIC.includes(pathname);
  const isAdminRoute = pathname === "/admin";
  const suspended = Boolean(tenant?.suspended) && !isSuperAdmin;

  useEffect(() => {
    if (!hydrated) return;
    if (!user && !isAuthRoute) navigate({ to: "/auth", replace: true });
    else if (user && !tenant && !isAdminRoute && !isAuthRoute)
      navigate({ to: isSuperAdmin ? "/admin" : "/auth", replace: true });
  }, [hydrated, user, tenant, isAuthRoute, isAdminRoute, isSuperAdmin, navigate]);

  if (!hydrated) return null;
  if (isAuthRoute) return <Outlet />;
  if (!user) return null;
  if (isAdminRoute) return <Outlet />;
  if (!tenant) return null;
  if (suspended) {
    const alternatives = myTenants.filter((t) => !t.suspended && t.id !== tenant.id);
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Organización suspendida</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El acceso a <strong>{tenant.name}</strong> está suspendido por el administrador de la
            plataforma. Contacta con el soporte del SaaS para reactivarla.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {alternatives.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTenant(t.id)}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Ir a {t.name}
              </button>
            ))}
            <button
              onClick={logout}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CrmLayout>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </CrmLayout>
  );
}
