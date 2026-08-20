import { createFileRoute } from "@tanstack/react-router";
import { Fill, LegalPage, LegalSection } from "@/components/site/LegalPage";

const TITLE = "Aviso legal — Ventia";
const DESC = "Datos identificativos del titular de Ventia, condiciones de uso del sitio web, propiedad intelectual y legislación aplicable.";

export const Route = createFileRoute("/legal/aviso-legal")({
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
      title="Aviso legal"
      updated="1 de agosto de 2026"
      intro="Información exigida por la Ley 34/2002 de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE)."
    >
      <LegalSection title="1. Titular del sitio web">
        <ul className="space-y-1">
          <li>Denominación social: <Fill>Razón social del titular</Fill></li>
          <li>NIF/CIF: <Fill>NIF o CIF</Fill></li>
          <li>Domicilio social: <Fill>Dirección fiscal completa</Fill></li>
          <li>Email de contacto: <Fill>email de contacto</Fill></li>
          <li>Teléfono: <Fill>teléfono</Fill></li>
          <li>Datos registrales: <Fill>Registro Mercantil, tomo, folio y hoja</Fill></li>
        </ul>
        <p>
          En adelante, «el Titular». El nombre comercial del servicio prestado a través de este sitio
          es Ventia.
        </p>
      </LegalSection>

      <LegalSection title="2. Objeto">
        <p>
          Este aviso regula el acceso y uso del sitio web y de la aplicación Ventia. La navegación
          atribuye la condición de usuario e implica la aceptación de estas condiciones en la versión
          publicada en cada momento. El Titular puede modificarlas para adaptarlas a cambios legales
          o del servicio, publicando siempre la fecha de la última actualización.
        </p>
      </LegalSection>

      <LegalSection title="3. Condiciones de uso">
        <p>
          El usuario se compromete a utilizar el sitio conforme a la ley, a la buena fe y a este
          aviso, y a no emplearlo para introducir contenidos ilícitos, dañar los sistemas del Titular
          o de terceros, ni para obtener datos de otros usuarios sin autorización. El acceso al área
          privada requiere credenciales, cuya custodia es responsabilidad del usuario.
        </p>
      </LegalSection>

      <LegalSection title="4. Propiedad intelectual e industrial">
        <p>
          El código, el diseño, la marca Ventia, los textos y los elementos gráficos del sitio
          pertenecen al Titular o a terceros que han autorizado su uso. Queda prohibida su
          reproducción, distribución o transformación sin autorización expresa, salvo el uso personal
          y privado propio de la navegación.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilidad">
        <p>
          El Titular no garantiza la disponibilidad ininterrumpida del sitio y no responde de los
          daños derivados de fallos de conexión, del uso indebido del servicio por parte del usuario
          ni de los contenidos de sitios de terceros a los que se enlace. Se compromete, no obstante,
          a corregir con diligencia cualquier incidencia que le sea comunicada.
        </p>
      </LegalSection>

      <LegalSection title="6. Enlaces">
        <p>
          Los enlaces a sitios ajenos se ofrecen por utilidad informativa. El Titular no controla ni
          asume responsabilidad sobre sus contenidos o políticas de privacidad.
        </p>
      </LegalSection>

      <LegalSection title="7. Legislación aplicable y jurisdicción">
        <p>
          Estas condiciones se rigen por la legislación española. Para cualquier controversia, las
          partes se someten a los juzgados y tribunales de <Fill>ciudad</Fill>, salvo que la norma
          aplicable al consumidor establezca otro fuero.
        </p>
      </LegalSection>
    </LegalPage>
  ),
});
