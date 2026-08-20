import { createFileRoute, Link } from "@tanstack/react-router";
import { Fill, LegalPage, LegalSection } from "@/components/site/LegalPage";

const TITLE = "Términos del servicio — Ventia";
const DESC = "Condiciones de contratación y uso de Ventia: planes, pagos, prueba gratuita, disponibilidad, propiedad de los datos, bajas y responsabilidad.";

export const Route = createFileRoute("/legal/terminos")({
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
      title="Términos del servicio"
      updated="1 de agosto de 2026"
      intro="Condiciones que rigen la contratación y el uso de Ventia entre el Titular y el cliente."
    >
      <LegalSection title="1. Partes y aceptación">
        <p>
          Estas condiciones se celebran entre <Fill>Razón social del titular</Fill> («el Proveedor») y
          la persona física o jurídica que crea una cuenta («el Cliente»). Crear una organización en
          Ventia implica la aceptación íntegra de estos términos, del{" "}
          <Link to="/legal/aviso-legal" className="underline underline-offset-2">aviso legal</Link> y
          de la{" "}
          <Link to="/legal/privacidad" className="underline underline-offset-2">política de privacidad</Link>.
        </p>
      </LegalSection>

      <LegalSection title="2. Descripción del servicio">
        <p>
          Ventia es un CRM en modo software como servicio que permite gestionar contactos,
          oportunidades, tareas y notas, con campos y etapas configurables por el Cliente. El
          Proveedor puede evolucionar las funcionalidades; si una función se retira, se avisará con al
          menos 30 días de antelación.
        </p>
      </LegalSection>

      <LegalSection title="3. Cuentas y uso aceptable">
        <p>
          El Cliente es responsable de las credenciales de su equipo y de las acciones realizadas
          desde su organización. No está permitido revender el servicio sin autorización, intentar
          acceder a datos de otras organizaciones, realizar pruebas de intrusión sin permiso escrito
          ni usar Ventia para enviar comunicaciones no solicitadas.
        </p>
      </LegalSection>

      <LegalSection title="4. Planes, precios y facturación">
        <p>
          Los planes vigentes y sus precios figuran en la{" "}
          <Link to="/precios" className="underline underline-offset-2">página de precios</Link>, sin
          impuestos incluidos. La facturación es mensual o anual anticipada. Los cambios de tarifa se
          comunican con 30 días de antelación y nunca afectan a un periodo ya pagado. El impago
          habilita a suspender el acceso tras un aviso previo de 7 días.
        </p>
      </LegalSection>

      <LegalSection title="5. Prueba gratuita">
        <p>
          La prueba de 14 días del plan Pro no requiere tarjeta y finaliza automáticamente sin cargo
          si el Cliente no contrata. Durante la prueba pueden aplicarse límites razonables de uso para
          evitar abusos.
        </p>
      </LegalSection>

      <LegalSection title="6. Propiedad de los datos">
        <p>
          Los datos introducidos por el Cliente son de su exclusiva propiedad. El Proveedor actúa como
          encargado del tratamiento, no los utiliza para fines propios y los pone a disposición del
          Cliente en formato CSV mientras la cuenta esté activa y durante los 30 días posteriores a la
          baja.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidad y soporte">
        <p>
          El Proveedor persigue una disponibilidad del <Fill>99,5 %</Fill> mensual, excluyendo
          mantenimientos programados avisados con 48 horas. El soporte se presta en horario laboral
          por email en <Fill>soporte@tudominio.com</Fill>, con los tiempos de respuesta propios de
          cada plan.
        </p>
      </LegalSection>

      <LegalSection title="8. Duración y baja">
        <p>
          El contrato se renueva automáticamente por periodos iguales salvo baja antes de la
          renovación. La baja se solicita desde los ajustes de la organización y produce efecto al
          final del periodo pagado, sin penalización.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilidad">
        <p>
          Salvo dolo o negligencia grave, la responsabilidad total del Proveedor se limita al importe
          facturado al Cliente en los 12 meses anteriores al hecho que la origine. No se responde del
          lucro cesante ni de daños indirectos. Nada de lo anterior limita los derechos irrenunciables
          que la ley reconozca al Cliente.
        </p>
      </LegalSection>

      <LegalSection title="10. Modificaciones y ley aplicable">
        <p>
          El Proveedor puede actualizar estos términos avisando con 30 días; si el Cliente no está de
          acuerdo, puede darse de baja sin coste. Se aplica la legislación española y los tribunales
          de <Fill>ciudad</Fill>, salvo fuero imperativo distinto.
        </p>
      </LegalSection>
    </LegalPage>
  ),
});
