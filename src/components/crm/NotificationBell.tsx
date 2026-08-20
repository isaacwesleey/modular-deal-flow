import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function NotificationBell() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useCrm();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ""}`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notificaciones</span>
          {unread > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todo como leído
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No tienes novedades. Aquí aparecerán los leads y tareas que te asignen.
            </p>
          ) : (
            notifications.slice(0, 30).map((n) => {
              const body = (
                <>
                  <span className="block text-sm font-medium">{n.title}</span>
                  {n.body && <span className="block text-xs text-muted-foreground">{n.body}</span>}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.at)}</span>
                </>
              );
              const cls = `block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-accent ${
                n.read ? "opacity-60" : ""
              }`;
              return n.contactId ? (
                <Link
                  key={n.id}
                  to="/contactos/$id"
                  params={{ id: n.contactId }}
                  className={cls}
                  onClick={() => markNotificationRead(n.id)}
                >
                  {body}
                </Link>
              ) : (
                <button key={n.id} className={cls} onClick={() => markNotificationRead(n.id)}>
                  {body}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
