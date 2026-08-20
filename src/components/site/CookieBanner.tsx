import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { readConsent, writeConsent, type CookieConsent } from "@/lib/site/cookies";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Banner de cookies: acepta, rechaza o configura. La elección se guarda en
 * localStorage y el banner no vuelve a aparecer hasta que se revoque desde la
 * política de cookies.
 */
export function CookieBanner() {
  const [consent, setConsent] = useState<CookieConsent | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    const sync = () => setConsent(readConsent());
    window.addEventListener("ventia-consent", sync);
    return () => window.removeEventListener("ventia-consent", sync);
  }, []);

  if (consent === undefined || consent) return null;

  const decide = (a: boolean, m: boolean) => {
    setConsent(writeConsent({ analytics: a, marketing: m }));
    setOpen(false);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-ventia-line bg-white p-4 shadow-xl sm:flex-row sm:items-center">
          <Cookie className="hidden h-6 w-6 shrink-0 text-ventia-deep sm:block" />
          <p className="flex-1 text-sm text-ventia-ink-soft">
            Usamos cookies propias necesarias para que Ventia funcione y, si nos das permiso, de
            medición y marketing para entender qué contenidos te resultan útiles.{" "}
            <Link to="/legal/cookies" className="font-medium text-ventia-deep underline underline-offset-2">
              Política de cookies
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              Configurar
            </Button>
            <Button variant="outline" size="sm" onClick={() => decide(false, false)}>
              Rechazar
            </Button>
            <Button size="sm" className="bg-ventia-deep text-white hover:bg-ventia-deep/90" onClick={() => decide(true, true)}>
              Aceptar todas
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar cookies</DialogTitle>
            <DialogDescription>
              Elige qué categorías permites. Puedes cambiarlo cuando quieras desde la política de
              cookies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Row
              title="Necesarias"
              desc="Sesión, seguridad y preferencias básicas. Sin ellas la aplicación no funciona."
              checked
              disabled
            />
            <Row
              title="Medición"
              desc="Estadísticas anónimas de uso para mejorar la web y el producto."
              checked={analytics}
              onChange={setAnalytics}
            />
            <Row
              title="Marketing"
              desc="Permiten medir campañas y mostrar contenido relevante fuera de la web."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => decide(false, false)}>
              Rechazar todas
            </Button>
            <Button onClick={() => decide(analytics, marketing)}>Guardar preferencias</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} disabled={Boolean(disabled)} onCheckedChange={(v) => onChange?.(v)} aria-label={title} />
    </div>
  );
}
