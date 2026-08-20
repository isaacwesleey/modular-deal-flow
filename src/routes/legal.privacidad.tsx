import { createFileRoute, Link } from "@tanstack/react-router";
import { Fill, LegalPage, LegalSection } from "@/components/site/LegalPage";

const TITLE = "Política de privacidad — Ventia";
const DESC = "Cómo trata Ventia los datos personales: responsable, finalidades, base jurídica, plazos de conservación, destinatarios y derechos del interesado.";

export const Route = createFileRoute("/legal/privacidad")({
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
  component: () => (
    <LegalPage
      title="Política de privacidad"
      updated="1 de agosto de 2026"
      intro="Información sobre el tratamiento de datos personales conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD)."
    >
      <LegalSection title="1. Responsable del tratamiento">
        <ul className="space-y-1">
          <li>Responsable: <Fill>Razón social del titular</Fill> (NIF <Fill>NIF</Fill>)</li>
          <li>Dirección: <Fill>Dirección fiscal completa</Fill></li>
          <li>Email de privacidad: <Fill>privacidad@tudominio.com</Fill></li>
          <li>Delegado de protección de datos: <Fill>nombre y contacto, si procede</Fill></li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Qué datos tratamos y para qué">
        <p>Tratamos únicamente los datos necesarios para cada finalidad:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Solicitudes de información y demostraciones.</strong> Nombre, email, empresa,
            teléfono, mensaje y datos de origen de la visita (utm_source, utm_medium, utm_campaign,
            página de entrada, referencia y tipo de dispositivo). Finalidad: atender tu solicitud y
            medir qué canales funcionan. Base jurídica: consentimiento y medidas precontractuales.
          </li>
          <li>
            <strong>Cuenta de usuario.</strong> Nombre, email, contraseña y preferencias. Finalidad:
            prestar el servicio, gestionar el acceso y avisarte de incidencias. Base jurídica:
            ejecución del contrato.
          </li>
          <li>
            <strong>Datos que introduces en Ventia sobre tus clientes.</strong> El Titular actúa como
            encargado del tratamiento y tú como responsable. Solo los tratamos siguiendo tus
            instrucciones y para prestar el servicio.
          </li>
          <li>
            <strong>Facturación.</strong> Datos fiscales y de pago. Base jurídica: obligación legal.
          </li>
          <li>
            <strong>Medición y marketing.</strong> Solo si aceptas las cookies correspondientes. Base
            jurídica: consentimiento, revocable en cualquier momento.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Plazos de conservación">
        <p>
          Las solicitudes comerciales se conservan un máximo de 12 meses desde el último contacto.
          Los datos de la cuenta, mientras la relación esté vigente y 30 días después de la baja, para
          permitir su recuperación. La documentación fiscal, durante los plazos legales
          (6 años mercantiles y 4 años tributarios). Las cookies, según los plazos de la{" "}
          <Link to="/legal/cookies" className="underline underline-offset-2">
            política de cookies
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Destinatarios y encargados">
        <p>
          No vendemos ni cedemos datos a terceros. Solo acceden proveedores necesarios para operar el
          servicio, con contrato de encargo firmado: alojamiento (<Fill>proveedor de hosting</Fill>),
          envío de correo (<Fill>proveedor de email</Fill>), pasarela de pago
          (<Fill>proveedor de pagos</Fill>) y analítica (<Fill>proveedor de analítica</Fill>). Cuando
          alguno trate datos fuera del Espacio Económico Europeo, se aplican las cláusulas
          contractuales tipo de la Comisión Europea.
        </p>
      </LegalSection>

      <LegalSection title="5. Tus derechos">
        <p>
          Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, así
          como retirar el consentimiento en cualquier momento, escribiendo a{" "}
          <Fill>privacidad@tudominio.com</Fill> e indicando el derecho que ejerces. Responderemos en
          el plazo máximo de un mes. Si consideras que no hemos atendido correctamente tu solicitud,
          puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).
        </p>
      </LegalSection>

      <LegalSection title="6. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas proporcionadas al riesgo: cifrado en tránsito,
          control de accesos por roles, copias de seguridad periódicas y registro de actividad. En
          caso de brecha con riesgo para tus derechos, te informaremos y notificaremos a la autoridad
          dentro de las 72 horas siguientes a su detección.
        </p>
      </LegalSection>

      <LegalSection title="7. Menores">
        <p>
          Ventia es un servicio profesional dirigido a empresas. No está destinado a menores de 14
          años y no recogemos sus datos de forma consciente.
        </p>
      </LegalSection>
    </LegalPage>
  ),
});
