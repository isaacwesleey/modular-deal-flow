import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { usePublicLead } from "@/lib/site/publicLead";
import { captureAttribution, getStoredAttribution } from "@/lib/crm/attribution";
import type { Attribution } from "@/lib/crm/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Formulario público: crea un lead real en la organización principal con la
 * atribución de la visita (utm_source, medium, campaign, referrer, página de
 * entrada y dispositivo).
 */
export function ContactForm() {
  const createLead = usePublicLead();
  const [attr, setAttr] = useState<Attribution | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", message: "" });
  const [accept, setAccept] = useState(false);

  useEffect(() => {
    setAttr(getStoredAttribution() ?? captureAttribution());
  }, []);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (sent) {
    return (
      <div className="rounded-2xl border border-ventia-line bg-white p-8 text-center shadow-lg">
        <CheckCircle2 className="mx-auto h-10 w-10 text-ventia" />
        <h3 className="mt-3 text-xl font-semibold">Recibido. Te escribimos hoy mismo.</h3>
        <p className="mt-2 text-sm text-ventia-ink-soft">
          Tu solicitud ha entrado en Ventia como un lead nuevo, con su origen registrado
          {attr?.utmSource ? ` (${attr.utmSource}${attr.utmMedium ? ` / ${attr.utmMedium}` : ""})` : ""}.
        </p>
        <p className="mt-4 text-sm">
          <Link to="/auth" className="font-semibold text-ventia-deep underline underline-offset-4">
            Entra en Ventia y míralo en el listado de contactos
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-ventia-line bg-white p-6 shadow-lg"
      onSubmit={(e) => {
        e.preventDefault();
        if (!accept) {
          toast.error("Necesitamos que aceptes la política de privacidad.");
          return;
        }
        const res = createLead(form);
        if (!res.ok) {
          toast.error(res.error ?? "No se ha podido enviar");
          return;
        }
        toast.success("Solicitud enviada");
        setSent(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">Nombre y apellidos</Label>
          <Input id="lead-name" value={form.name} onChange={set("name")} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">Email de trabajo</Label>
          <Input id="lead-email" type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-company">Empresa</Label>
          <Input id="lead-company" value={form.company} onChange={set("company")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-phone">Teléfono</Label>
          <Input id="lead-phone" value={form.phone} onChange={set("phone")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-message">¿Qué quieres resolver?</Label>
        <Textarea
          id="lead-message"
          rows={4}
          placeholder="Somos 5 comerciales y llevamos los leads en una hoja de cálculo…"
          value={form.message}
          onChange={set("message")}
        />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="lead-accept" checked={accept} onCheckedChange={(v) => setAccept(v === true)} />
        <Label htmlFor="lead-accept" className="text-xs leading-relaxed font-normal text-ventia-ink-soft">
          He leído y acepto la{" "}
          <Link to="/legal/privacidad" className="underline underline-offset-2">
            política de privacidad
          </Link>
          . Usaremos tus datos solo para responder a esta solicitud.
        </Label>
      </div>
      <Button type="submit" className="w-full bg-ventia-deep text-white hover:bg-ventia-deep/90">
        Solicitar una demostración
      </Button>
      {attr && (
        <p className="text-center text-[11px] text-ventia-ink-soft">
          Origen detectado: {attr.utmSource ?? "directo"}
          {attr.utmMedium ? ` / ${attr.utmMedium}` : ""}
          {attr.utmCampaign ? ` · ${attr.utmCampaign}` : ""} · {attr.device}
        </p>
      )}
    </form>
  );
}
