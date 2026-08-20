import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { SiteShell, CtaPrimary } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { PricingPlans } from "@/components/site/Pricing";
import { BILLING_FAQ, COMPARISON, PLANS } from "@/lib/site/plans";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "Precios de Ventia — Planes desde 15 € al mes";
const DESC =
  "Tres planes claros para equipos comerciales: Esencial, Pro y Escala. Facturación mensual o anual con 20 % de descuento y 14 días de prueba sin tarjeta.";

export const Route = createFileRoute("/precios")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <SiteShell>
      <section className="ventia-hero-bg py-16">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <div className="text-center">
              <h1 className="text-4xl font-extrabold sm:text-5xl">
                Precios sencillos, <span className="ventia-gradient-text">sin sorpresas</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-ventia-ink-soft">
                Paga por las personas que venden, no por módulos que nunca abres. Cambias o cancelas
                cuando quieras y te llevas tus datos siempre.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <PricingPlans />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold">Comparativa completa</h2>
          </Reveal>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-2/5 border-b border-ventia-line py-3 text-left font-semibold">
                    Funcionalidad
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className={`border-b border-ventia-line py-3 text-center font-bold ${p.highlight ? "text-ventia-deep" : ""}`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((g) => (
                  <Fragment key={g.group}>
                    <tr>
                      <td
                        colSpan={4}
                        className="bg-ventia-mist/60 px-2 py-2 text-xs font-bold tracking-wide uppercase text-ventia-deep"
                      >
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-b border-ventia-line/60">
                        <td className="py-3">{r.label}</td>
                        {r.values.map((v, i) => (
                          <td key={i} className="py-3 text-center">
                            {v === "Sí" ? (
                              <Check className="mx-auto h-4 w-4 text-ventia" />
                            ) : v === "—" ? (
                              <Minus className="mx-auto h-4 w-4 text-ventia-ink-soft/50" />
                            ) : (
                              v
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <CtaPrimary className="px-6 py-3.5 text-base">Empezar ahora</CtaPrimary>
          </div>
        </div>
      </section>

      <section className="bg-ventia-mist/40 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold">Dudas sobre la facturación</h2>
          </Reveal>
          <Reveal delay={80}>
            <Accordion type="single" collapsible className="mt-8">
              {BILLING_FAQ.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-ventia-ink-soft">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
          <p className="mt-8 text-center text-sm text-ventia-ink-soft">
            ¿Necesitas factura con condiciones especiales o más de 50 usuarios?{" "}
            <Link to="/" hash="contacto" className="font-semibold text-ventia-deep hover:underline">
              Escríbenos
            </Link>
            .
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
