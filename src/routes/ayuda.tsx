import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCrm } from "@/lib/crm/store";
import { PageHeader } from "@/components/crm/Layout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda — Ventia" },
      {
        name: "description",
        content: "Guía rápida de Ventia: módulos, campos personalizados, etapas, roles y ajustes.",
      },
      { property: "og:title", content: "Ayuda — Ventia" },
      {
        property: "og:description",
        content: "Guía rápida de Ventia: módulos, campos personalizados, etapas, roles y ajustes.",
      },
    ],
  }),
  component: AyudaPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function AyudaPage() {
  const { canManageSettings, reset, exportBackup } = useCrm();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Ayuda"
        subtitle="Todo lo que necesitas saber para trabajar con Ventia, explicado sin tecnicismos."
      />

      <div className="grid max-w-4xl gap-4">
        <Section title="Qué hace cada módulo">
          <p>
            <strong>Contactos</strong>: la base. Cada persona o empresa con la que hablas, con su
            ficha, su historial y su origen. Desde la ficha ves todo lo que ha pasado con ese lead.
          </p>
          <p>
            <strong>Pipeline</strong>: el tablero de oportunidades. Cada tarjeta es una venta
            posible y cada columna una etapa. Arrastra la tarjeta cuando la conversación avance.
          </p>
          <p>
            <strong>Tareas</strong>: llamadas, correos y reuniones pendientes, en lista o en
            calendario. Puedes asociarlas a un contacto o a una oportunidad.
          </p>
          <p>
            <strong>Notas</strong>: lo que se dijo, en orden cronológico. Si escribes @Nombre,
            avisas a esa persona del equipo.
          </p>
          <p>
            Los módulos se encienden y apagan en Ajustes: si apagas uno, desaparece del menú sin
            borrar sus datos.
          </p>
        </Section>

        <Section title="Campos personalizados">
          <p>
            Ventia no te impone qué guardar. En <strong>Ajustes › Campos</strong> defines los campos
            de Contactos y de Oportunidades: texto, número, importe, fecha, selector, etc. Se
            reordenan arrastrando y puedes ocultar los que no quieras ver en la vista rápida.
          </p>
          <p>
            Algunos campos tienen un <strong>papel especial</strong> (nombre, importe, estado,
            propietario, empresa, email y teléfono). Ese papel es el que usa la aplicación para
            saber qué mostrar en las tarjetas, en la cabecera de la ficha o en los totales. Por eso
            esos campos no se pueden borrar: cámbiales el nombre o el tipo si lo necesitas.
          </p>
        </Section>

        <Section title="Etapas del pipeline">
          <p>
            Las etapas son tuyas: nombre, color y orden. Puedes crearlas desde el propio tablero
            (columna <em>Añadir etapa</em>) o desde Ajustes. En el menú de cada columna la
            renombras, le cambias el color, la mueves o la eliminas.
          </p>
          <p>
            Al eliminar una etapa con oportunidades, Ventia te pregunta a qué etapa moverlas para
            que no se pierda nada.
          </p>
        </Section>

        <Section title="Quién puede hacer qué">
          <p>
            <strong>Usuario</strong>: trabaja el día a día. Crea y edita contactos, oportunidades,
            tareas y notas.
          </p>
          <p>
            <strong>Administrador</strong>: además configura la organización (marca, módulos,
            campos y etapas) e invita o retira personas del equipo.
          </p>
          <p>
            <strong>Super administrador</strong>: gestiona la plataforma entera desde el panel de
            organizaciones; puede suspenderlas, eliminarlas y entrar en modo soporte.
          </p>
        </Section>

        <Section title="Papelera y recuperación">
          <p>
            Los contactos y las oportunidades que eliminas van a la papelera y se pueden restaurar
            durante 30 días. Pasado ese plazo se borran solos.
          </p>
        </Section>

        <Section title="Restablecer el espacio de trabajo">
          <p>
            Si has hecho pruebas y quieres empezar de cero, puedes restablecer los datos de esta
            organización. Se conservan el nombre y la marca; se rehacen contactos, oportunidades,
            tareas y notas. Descarga antes una copia si quieres guardar lo que tienes.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={exportBackup}>
              Descargar copia de seguridad
            </Button>
            {canManageSettings && (
              <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Restablecer el espacio de trabajo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Restablecer los datos?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se sustituyen contactos, oportunidades, tareas, notas e historial. El nombre y
                      la marca de la organización se mantienen. No se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => reset()}>Restablecer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Section>

        <p className="text-sm text-muted-foreground">
          ¿Buscabas la configuración?{" "}
          <Link to="/ajustes" className="font-medium text-primary underline">
            Ir a Ajustes
          </Link>
          .
        </p>
      </div>
    </>
  );
}
