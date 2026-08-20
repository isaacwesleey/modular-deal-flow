import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/site/plans";

/** Bloque de planes reutilizado en la landing y en la página de precios. */
export function PricingPlans({ compact = false }: { compact?: boolean }) {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      <div className="mx-auto mb-8 flex w-fit items-center gap-1 rounded-full border border-ventia-line bg-white p-1">
        <button
          onClick={() => setYearly(false)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!yearly ? "bg-ventia-deep text-white" : "text-ventia-ink-soft"}`}
        >
          Mensual
        </button>
        <button
          onClick={() => setYearly(true)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${yearly ? "bg-ventia-deep text-white" : "text-ventia-ink-soft"}`}
        >
          Anual −20 %
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
              p.highlight
                ? "border-ventia-deep shadow-[0_30px_70px_-40px_rgba(15,60,80,0.9)] lg:-mt-4 lg:mb-4"
                : "border-ventia-line shadow-sm"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-ventia-deep px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                El más elegido
              </span>
            )}
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="mt-1 min-h-10 text-sm text-ventia-ink-soft">{p.tagline}</p>
            <p className="mt-5 flex items-end gap-1">
              <span className="display text-4xl font-extrabold">{yearly ? p.yearly : p.monthly} €</span>
              <span className="pb-1 text-sm text-ventia-ink-soft">
                /{p.id === "esencial" ? "mes" : "usuario y mes"}
              </span>
            </p>
            <p className="mt-1 text-xs text-ventia-ink-soft">
              {yearly ? `Facturación anual · ahorras ${(p.monthly - p.yearly) * 12} € al año` : "Facturación mensual · sin permanencia"}
            </p>
            <Link
              to="/auth"
              className={`mt-5 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                p.highlight
                  ? "bg-ventia-deep text-white hover:bg-ventia-deep/90"
                  : "border border-ventia-line hover:bg-ventia-mist"
              }`}
            >
              {p.cta}
            </Link>
            {!compact && (
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ventia" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-ventia-ink-soft">
        Precios sin IVA. 14 días de prueba sin tarjeta. Sin permanencia: exportas todo y cancelas cuando quieras.
      </p>
    </div>
  );
}
