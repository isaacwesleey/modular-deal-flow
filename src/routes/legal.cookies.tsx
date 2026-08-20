import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fill, LegalPage, LegalSection } from "@/components/site/LegalPage";
import { Button } from "@/components/ui/button";
import { clearConsent, readConsent, type CookieConsent } from "@/lib/site/cookies";

const TITLE = "Política de cookies — Ventia";
const DESC = "Qué cookies utiliza Ventia, para qué sirven, cuánto duran y cómo cambiar o revocar tu consentimiento en cualquier momento.";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

const TABLE: { name: string; owner: string; purpose: string; type: string; life: string }[] = [
  { name: "ventia-cookie-consent", owner: "Propia", purpose: "Guarda tu elección sobre cookies para no volver a preguntártelo.", type: "Necesaria", life: "12 meses" },
  { name: "crm-remix-root", owner: "Propia", purpose: "Mantiene la sesión y los datos de trabajo de la aplicación.", type: "Necesaria", life: "Sesión / persistente" },
  { name: "crm-remix-attribution", owner: "Propia", purpose: "Registra el origen de la visita (campaña, referencia, dispositivo).", type: "Medición", life: "6 meses" },
  { name: "_ga / _ga_*", owner: "Tercero: [proveedor de analítica]", purpose: "Estadísticas de uso agregadas para mejorar el sitio.", type: "Medición", life: "13 meses" },
  { name: "_fbp / ads", owner: "Tercero: [proveedor publicitario]", purpose: "Medición de campañas y publicidad relevante.", type: "Marketing", life: "3 meses" },
];

function CookiesPage() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const sync = () => setConsent(readConsent());
    window.addEventListener("ventia-consent", sync);
    return () => window.removeEventListener("ventia-consent", sync);
  }, []);

  return (
    <LegalPage
      title="Política de cookies"
      updated="1 de agosto de 2026"
      intro="Explicación de las cookies y tecnologías similares que utilizamos, conforme al artículo 22.2 de la LSSI y a las directrices de la AEPD."
    >
      <LegalSection title="1. Qué es una cookie">
        <p>
          Una cookie es un pequeño archivo que un sitio web guarda en tu dispositivo para recordar
          información entre visitas: si has iniciado sesión, qué preferencias tienes o cómo llegaste
          hasta aquí. También usamos almacenamiento local del navegador, sujeto a las mismas reglas.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies que utilizamos">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ventia-line text-left">
                <th className="py-2 pr-3 font-semibold">Nombre</th>
                <th className="py-2 pr-3 font-semibold">Titular</th>
                <th className="py-2 pr-3 font-semibold">Finalidad</th>
                <th className="py-2 pr-3 font-semibold">Tipo</th>
                <th className="py-2 font-semibold">Duración</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map((c) => (
                <tr key={c.name} className="border-b border-ventia-line/60 align-top">
                  <td className="py-2 pr-3 font-mono text-xs">{c.name}</td>
                  <td className="py-2 pr-3">{c.owner}</td>
                  <td className="py-2 pr-3">{c.purpose}</td>
                  <td className="py-2 pr-3">{c.type}</td>
                  <td className="py-2">{c.life}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-ventia-ink-soft">
          Sustituye los proveedores marcados por los que realmente utilices:{" "}
          <Fill>proveedor de analítica</Fill> y <Fill>proveedor publicitario</Fill>.
        </p>
      </LegalSection>

      <LegalSection title="3. Base jurídica">
        <p>
          Las cookies necesarias se instalan por interés legítimo en la prestación del servicio que
          solicitas. Las de medición y marketing solo se activan si das tu consentimiento en el banner
          y puedes retirarlo cuando quieras sin que ello afecte al uso del servicio.
        </p>
      </LegalSection>

      <LegalSection title="4. Cómo gestionar tu elección">
        <p>
          Tu decisión actual es:{" "}
          <strong>
            {consent
              ? `medición ${consent.analytics ? "aceptada" : "rechazada"}, marketing ${consent.marketing ? "aceptado" : "rechazado"}`
              : "todavía no has elegido"}
          </strong>
          .
        </p>
        <Button
          variant="outline"
          onClick={() => {
            clearConsent();
            setConsent(null);
          }}
        >
          Cambiar mis preferencias de cookies
        </Button>
        <p className="text-sm text-ventia-ink-soft">
          También puedes bloquear o eliminar cookies desde la configuración de tu navegador (Chrome,
          Firefox, Safari o Edge). Ten en cuenta que bloquear las necesarias puede impedir el acceso a
          la aplicación.
        </p>
      </LegalSection>

      <LegalSection title="5. Actualizaciones">
        <p>
          Revisamos esta política cuando cambian las cookies utilizadas o la normativa aplicable. Si
          la modificación afecta a cookies no necesarias, volveremos a pedirte el consentimiento.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
