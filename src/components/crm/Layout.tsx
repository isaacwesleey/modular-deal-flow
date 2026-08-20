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
  LogOut,
  ShieldAlert,
  Building2,
  ShieldCheck,
  UserCircle2,
  MailWarning,
  LifeBuoy,
  HardDrive,
} from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { useDueTaskNotifications } from "@/lib/crm/useDueTasks";
import { NotificationBell } from "@/components/crm/NotificationBell";
import { tokenLink } from "@/lib/crm/tokens";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function useNavItems() {
  const { state } = useCrm();
  const items = [
    { to: "/inicio", label: "Inicio", icon: LayoutDashboard, always: true },
    { to: "/contactos", label: "Contactos", icon: Users, always: true },
    { to: "/pipeline", label: "Pipeline", icon: KanbanSquare, key: "pipeline" as const },
    { to: "/tareas", label: "Tareas", icon: CheckSquare, key: "tareas" as const },
    { to: "/notas", label: "Notas", icon: StickyNote, key: "notas" as const },
  ];
  return items.filter((i) => i.always || state.modules[i.key!]);
}

export function CrmLayout({ children }: { children: ReactNode }) {
  const {
    state,
    hydrated,
    user,
    tenant,
    myTenants,
    switchTenant,
    logout,
    canManageSettings,
    isSuperAdmin,
    supportMode,
    exitSupport,
    requestVerification,
    updatePrefs,
  } = useCrm();
  const nav = useNavItems();
  const [collapsed, setCollapsed] = useState(false);
  const [verifyLink, setVerifyLink] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const initial = (user?.name.trim()[0] ?? "?").toUpperCase();
  useDueTaskNotifications();

  /** Tema efectivo: manda la preferencia del usuario sobre la de la organización. */
  const pref = user?.prefs?.theme ?? "auto";
  const isDark = pref === "auto" ? state.branding.theme === "dark" : pref === "dark";

  const resendVerification = () => {
    const res = requestVerification();
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo reenviar");
      return;
    }
    setVerifyLink(res.token ? tokenLink("/verificar", res.token) : null);
    setVerifyOpen(true);
    toast.success("Te hemos enviado un correo de confirmación");
  };

  /**
   * El botón del header cambia SOLO la preferencia de quien lo pulsa.
   * El tema de la organización se toca desde Ajustes y solo un administrador.
   */
  const toggleTheme = () => updatePrefs({ theme: isDark ? "light" : "dark" });

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
          {isSuperAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Panel SaaS</span>}
            </Link>
          )}
          {canManageSettings && (
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
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((c) => !c)} className="hidden md:inline-flex">
            <PanelLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 max-w-[7.5rem] truncate text-sm font-semibold sm:max-w-none md:hidden">
            {state.branding.companyName}
          </span>
          {myTenants.length > 1 && tenant && (
            <Select value={tenant.id} onValueChange={switchTenant}>
              <SelectTrigger className="h-9 w-[9.5rem] shrink-0 sm:w-[200px]" aria-label="Cambiar de organización">
                <Building2 className="mr-1 h-4 w-4 shrink-0 opacity-70" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {myTenants.map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={Boolean(t.suspended) && !isSuperAdmin}>
                    {t.name}
                    {t.suspended ? " · suspendida" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar mi tema">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ background: user?.prefs?.avatarColor ?? "var(--brand)" }}
                  aria-label="Menú de cuenta"
                >
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="leading-tight">
                  <span className="block">{user?.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil">
                    <UserCircle2 className="mr-2 h-4 w-4" /> Mi cuenta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/ayuda">
                    <LifeBuoy className="mr-2 h-4 w-4" /> Ayuda
                  </Link>
                </DropdownMenuItem>
                {canManageSettings && (
                  <DropdownMenuItem asChild>
                    <Link to="/ajustes">
                      <Settings className="mr-2 h-4 w-4" /> Ajustes
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {user && !user.superAdmin && user.emailVerified === false && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
            <MailWarning className="h-4 w-4 shrink-0" />
            <span>Confirma tu dirección de correo ({user.email}) para asegurar tu cuenta.</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={resendVerification}>
              Reenviar correo
            </Button>
          </div>
        )}

        {/*
          El enlace simulado no se vuelca en la barra de la app: se muestra en un
          diálogo con un botón que lleva a la confirmación.
        */}
        <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirma tu correo</DialogTitle>
              <DialogDescription>
                Te hemos enviado un mensaje a {user?.email}. En esta plantilla el correo es
                simulado, así que puedes confirmarlo directamente desde aquí.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setVerifyOpen(false)}>
                Ahora no
              </Button>
              {verifyLink && (
                <Button asChild>
                  <a href={verifyLink}>Abrir confirmación</a>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <StorageWarning />

        {supportMode && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>
              Modo soporte: estás dentro de <strong>{tenant?.name}</strong> como super admin.
            </span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={exitSupport}>
              Salir del modo soporte
            </Button>
          </div>
        )}

        <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
          {[...nav, ...(canManageSettings ? [{ to: "/ajustes", label: "Ajustes", icon: Settings }] : [])].map((item) => (
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

        <main
          data-density={user?.prefs?.density ?? "comoda"}
          className="flex-1 p-4 md:p-6"
        >{hydrated ? children : null}</main>
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
export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">Acceso denegado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ?? "No tienes permisos para ver esta sección. Habla con el administrador de tu organización."}
      </p>
      <Button asChild className="mt-4">
        <Link to="/inicio">Volver al inicio</Link>
      </Button>
    </div>
  );
}

/**
 * Aviso de almacenamiento lleno: localStorage tiene un límite (unos 5 MB) y,
 * si se supera, los cambios dejan de guardarse. En vez de fallar en silencio,
 * se avisa y se ofrece exportar y liberar espacio.
 */
function StorageWarning() {
  const { storageError, exportBackup, freeUpSpace } = useCrm();
  if (!storageError) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
      <HardDrive className="h-4 w-4 shrink-0 text-destructive" />
      <span>
        <strong>No se han podido guardar los últimos cambios:</strong> el almacenamiento del
        navegador está lleno. Descarga una copia y libera espacio para seguir trabajando.
      </span>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="outline" onClick={exportBackup}>
          Descargar copia
        </Button>
        <Button size="sm" onClick={freeUpSpace}>
          Liberar espacio
        </Button>
      </div>
    </div>
  );
}
