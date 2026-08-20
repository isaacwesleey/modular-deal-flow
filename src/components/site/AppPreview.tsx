import { Building2, GripVertical, Mail, Phone, Sparkles } from "lucide-react";

/** Representaciones visuales de la propia app (no capturas: se dibujan aquí). */

const CARD = "rounded-2xl border border-ventia-line bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,40,60,0.55)]";

export function KanbanPreview() {
  const cols: { name: string; color: string; cards: { t: string; v: string }[] }[] = [
    { name: "Nuevo", color: "oklch(0.72 0.13 250)", cards: [{ t: "Reforma Bar Aurora", v: "18.500 €" }, { t: "Escaparate Zubi", v: "6.400 €" }] },
    { name: "Propuesta", color: "oklch(0.81 0.16 78)", cards: [{ t: "Salas Coworking Ría", v: "24.000 €" }] },
    { name: "Ganado", color: "oklch(0.68 0.14 178)", cards: [{ t: "Oficinas Deusto", v: "31.200 €" }] },
  ];
  return (
    <div className={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Pipeline comercial</p>
        <span className="rounded-full bg-ventia-mist px-2 py-0.5 text-[11px] font-medium text-ventia-deep">
          80.100 € en curso
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((c) => (
          <div key={c.name} className="rounded-xl bg-ventia-mist/70 p-2">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              <span className="truncate text-[11px] font-semibold">{c.name}</span>
            </div>
            <div className="space-y-2">
              {c.cards.map((card) => (
                <div key={card.t} className="rounded-lg border border-ventia-line bg-white p-2">
                  <p className="truncate text-[11px] font-medium">{card.t}</p>
                  <p className="mt-1 text-[11px] font-semibold text-ventia-deep">{card.v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeadPreview() {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ventia-deep text-sm font-bold text-white">
          BA
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Bar Aurora</p>
          <p className="flex items-center gap-2 text-[11px] text-ventia-ink-soft">
            <Building2 className="h-3 w-3" /> Grupo Aurora
            <Mail className="h-3 w-3" /> hola@baraurora.es
            <Phone className="h-3 w-3" /> 944 xx xx xx
          </p>
        </div>
        <span className="ml-auto rounded-full bg-ventia-accent/20 px-2 py-0.5 text-[11px] font-semibold text-ventia-ink">
          Presupuestado
        </span>
      </div>
      <div className="mt-4 space-y-2 border-t border-ventia-line pt-3 text-[11px]">
        {[
          ["Origen", "google / cpc · campaña reformas-bilbao"],
          ["Página de entrada", "/precios?utm_source=google"],
          ["Dispositivo", "Móvil"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <span className="text-ventia-ink-soft">{k}</span>
            <span className="truncate font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-ventia-line pt-3">
        {[
          ["Elena cambió Fase: Solicitud → Presupuestado", "hace 2 h"],
          ["Nota: presupuesto enviado con dos opciones", "ayer"],
          ["Lead creado desde el formulario web", "hace 3 días"],
        ].map(([t, w]) => (
          <div key={t} className="flex items-start gap-2 text-[11px]">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ventia" />
            <span className="flex-1">{t}</span>
            <span className="shrink-0 text-ventia-ink-soft">{w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FieldsPreview() {
  const fields = [
    { label: "Cliente", type: "Texto", role: "Título" },
    { label: "Presupuesto", type: "Moneda", role: "Importe" },
    { label: "Fase", type: "Selector", role: "Estado" },
    { label: "Responsable", type: "Usuario", role: "Propietario" },
    { label: "Metros cuadrados", type: "Número", role: "" },
  ];
  return (
    <div className={CARD}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-ventia-deep" /> Tus campos, tu vocabulario
      </p>
      <div className="space-y-2">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-2 rounded-lg border border-ventia-line bg-white px-2 py-2"
          >
            <GripVertical className="h-3.5 w-3.5 text-ventia-ink-soft/60" />
            <span className="text-[12px] font-medium">{f.label}</span>
            <span className="rounded-md bg-ventia-mist px-1.5 py-0.5 text-[10px] text-ventia-deep">{f.type}</span>
            {f.role && (
              <span className="ml-auto rounded-md bg-ventia-accent/20 px-1.5 py-0.5 text-[10px] font-semibold">
                {f.role}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TenantsPreview() {
  const orgs = [
    { name: "Reformas Aurora", color: "oklch(0.55 0.19 268)", people: 6 },
    { name: "Studio Norte", color: "oklch(0.68 0.14 178)", people: 3 },
    { name: "Clínica Ibai", color: "oklch(0.81 0.16 78)", people: 11 },
  ];
  return (
    <div className={CARD}>
      <p className="mb-3 text-sm font-semibold">Una cuenta, varias organizaciones</p>
      <div className="space-y-2">
        {orgs.map((o) => (
          <div key={o.name} className="flex items-center gap-3 rounded-xl border border-ventia-line p-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: o.color }}
            >
              {o.name.charAt(0)}
            </span>
            <span className="text-[12px] font-medium">{o.name}</span>
            <span className="ml-auto text-[11px] text-ventia-ink-soft">{o.people} personas</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ventia-ink-soft">
        Datos, campos y marca separados en cada una. Cambias de organización sin cerrar sesión.
      </p>
    </div>
  );
}
