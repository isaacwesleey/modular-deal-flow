import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  CheckSquare,
  StickyNote,
  Settings,
  PanelLeft,
  Sun,
  Moon,
} from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { Button } from "@/components/ui/button";

export function useNavItems() {
  const { state } = useCrm();
  const items = [
    { to: "/", label: "Inicio", icon: LayoutDashboard, always: true },
    { to: "/contactos", label: "Contactos", icon: Users, always: true },
    { to: "/pipeline", label: "Pipeline", icon: KanbanSquare, key: "pipeline" as const },
    { to: "/tareas", label: "Tareas", icon: CheckSquare, key: "tareas" as const },
    { to: "/notas", label: "Notas", icon: StickyNote, key: "notas" as const },
  ];
  return items.filter((i) => i.always || state.modules[i.key!]);
}

export function CrmLayout({ children }: { children: ReactNode }) {
  const { state, setState, hydrated } = useCrm();
  const nav = useNavItems();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const toggleTheme = () =>
    setState((s) => ({
      ...s,
      branding: { ...s.branding, theme: s.branding.theme === "dark" ? "light" : "dark" },
    }));

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-all md:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground">
            {state.branding.logo?.startsWith("http") ? (
              <img src={state.branding.logo} alt="Logo" className="h-full w-full rounded-xl object-cover" />
            ) : (
              state.branding.logo || "◆"
            )}
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold">{state.branding.companyName}</span>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-2 py-2">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 px-2 pb-4">
          <Link
            to="/ajustes"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/ajustes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Ajustes</span>}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((c) => !c)} className="hidden md:inline-flex">
            <PanelLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold md:hidden">{state.branding.companyName}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar tema">
              {state.branding.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
          {[...nav, { to: "/ajustes", label: "Ajustes", icon: Settings }].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                pathname === item.to ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-6">{hydrated ? children : null}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ModuleOff({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">Módulo “{name}” desactivado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Actívalo desde Ajustes para verlo en el menú.
      </p>
      <Button asChild className="mt-4">
        <Link to="/ajustes">Ir a Ajustes</Link>
      </Button>
    </div>
  );
}