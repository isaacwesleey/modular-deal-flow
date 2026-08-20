import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, CtaPrimary } from "@/components/site/SiteShell";
import { PricingPlans } from "@/components/site/Pricing";
import { ContactForm } from "@/components/site/ContactForm";
import { KanbanPreview, LeadPreview } from "@/components/site/AppPreview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "Ventia — Deja de perder clientes por no hacer seguimiento";
const DESC =
  "CRM sencillo para equipos pequeños que hoy llevan sus clientes en una hoja de cálculo. Se monta en una tarde, cuesta menos de lo que pierdes con un cliente y lo exportas cuando quieras.";

/** Acción principal única, repetida con el mismo texto en toda la página. */
const CTA = "Empezar gratis";
/** Fricción explícita junto a cada llamada a la acción. */
const FRICTION = "Sin tarjeta · se configura en minutos · exportas todo y cancelas cuando quieras";

export const Route = createFileRoute("/")({
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
  component: LandingPage,
});

function LandingPage() {
  return (
    <SiteShell>
      <Hero />
      <Cost />
      <Solution />
      <Proof />
      <Objections />
      <PricingBlock />
      <Faq />
      <ContactBlock />
      <FinalCta />
    </SiteShell>
  );
}

function Friction({ className = "" }: { className?: string }) {
  return <p className={`text-xs text-ventia-ink-soft ${className}`}>{FRICTION}</p>;
}

function Hero() {
  return (
    <section className="border-b border-ventia-line bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-24">
        <div className="min-w-0">
          <h1 className="text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-[3.4rem]">
            Deja de perder clientes por no llamarles a tiempo
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ventia-ink-soft">
            Ventia es el CRM para equipos de 2 a 20 personas que hoy llevan sus clientes en una hoja
            de cálculo: sabes a quién tienes que hablar hoy, en qué quedó cada conversación y qué
            hay realmente cerca de cerrarse.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaPrimary className="px-6 py-3.5 text-base">{CTA}</CtaPrimary>
          </div>
          <Friction className="mt-3" />
        </div>
        <div className="min-w-0 space-y-4">
          <KanbanPreview />
          <div className="sm:ml-10">
            <LeadPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function Cost() {
  const items = [
    ["El presupuesto que nunca se recordó", "Se envió, no hubo respuesta y nadie volvió a llamar."],
    ["La conversación que solo estaba en una cabeza", "Se fue de vacaciones y el cliente se enfrió."],
    ["La previsión que era una intuición", "Nadie sabía cuánto había abierto ni desde cuándo."],
  ];
  return (
    <section className="ventia-soft-bg border-b border-ventia-line py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="max-w-3xl text-3xl font-extrabold sm:text-4xl">
          No vendes menos por trabajar poco. Vendes menos porque el seguimiento se te cae.
        </h2>
        <p className="mt-4 max-w-2xl text-ventia-ink-soft">
          Un solo cliente perdido por olvido cuesta más que un año entero de Ventia. Y normalmente
          no se pierde uno al año.
        </p>
        <dl className="mt-10 grid gap-8 sm:grid-cols-3">
          {items.map(([t, d]) => (
            <div key={t}>
              <dt className="text-base font-bold">{t}</dt>
              <dd className="mt-2 text-sm text-ventia-ink-soft">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Solution() {
  const benefits = [
    [
      "Sabes qué toca hoy sin pensarlo",
      "Cada cliente lleva su próxima tarea con fecha. Abres Ventia y tienes la lista de llamadas del día hecha.",
    ],
    [
      "Recuperas la conversación en cinco segundos",
      "La ficha guarda el historial, las notas y de dónde vino el cliente, así que cualquiera del equipo puede continuar.",
    ],
    [
      "Ves el dinero que hay abierto",
      "Arrastras la oportunidad de una etapa a otra y el total por etapa se actualiza solo. La previsión deja de ser una sensación.",
    ],
    [
      "Habla tu idioma, no el de un CRM",
      "Defines tus propios campos y etapas con tus palabras. Por eso el equipo lo usa: no tiene que traducir su trabajo.",
    ],
  ];
  return (
    <section id="funciones" className="scroll-mt-20 border-b border-ventia-line bg-white py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="max-w-3xl text-3xl font-extrabold sm:text-4xl">
          Un sitio donde no se pierde nada
        </h2>
        <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {benefits.map(([t, d]) => (
            <div key={t} className="border-t border-ventia-line pt-5">
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-ventia-ink-soft">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <CtaPrimary className="px-6 py-3.5 text-base">{CTA}</CtaPrimary>
          <Friction className="mt-3" />
        </div>
      </div>
    </section>
  );
}

function Proof() {
  const quotes = [
    {
      q: "Pasamos de cuatro hojas de cálculo a un solo pipeline. El primer mes cerramos dos presupuestos que se nos habrían olvidado.",
      n: "Elena Uriarte",
      r: "Reformas Aurora · 6 personas",
    },
    {
      q: "Lo montamos con nuestros campos una tarde de viernes. El lunes el equipo ya estaba dentro sin formación.",
      n: "Aitor Beltrán",
      r: "Studio Norte · 4 personas",
    },
    {
      q: "Por fin sé qué anuncios traen clientes de verdad, porque el origen viene solo en cada ficha.",
      n: "Marta Sáez",
      r: "Clínica Ibai · 9 personas",
    },
  ];
  return (
    <section id="casos" className="ventia-soft-bg scroll-mt-20 border-b border-ventia-line py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Equipos pequeños que ya lo usan</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {quotes.map((t) => (
            <figure key={t.n} className="border-t border-ventia-line pt-5">
              <blockquote className="text-sm">«{t.q}»</blockquote>
              <figcaption className="mt-4 text-xs text-ventia-ink-soft">
                <span className="font-semibold text-ventia-ink">{t.n}</span> · {t.r}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Objections() {
  const items = [
    [
      "«Ya lo llevo en una hoja de cálculo»",
      "Y funcionó al principio. El problema no es la hoja, es que no avisa: no recuerda llamadas, no guarda quién dijo qué y se duplica en cuanto sois dos. Importas tu CSV y sigues con los mismos datos, pero con memoria.",
    ],
    [
      "«No tengo tiempo de montar un CRM»",
      "No hay implantación. Creas la cuenta, subes el CSV y ajustas tus etapas. La gente que lo hace tarda una tarde y ese día ya trabaja dentro.",
    ],
    [
      "«Mi equipo no lo va a usar»",
      "Solo ven los campos que tú dejas visibles, con vuestro vocabulario, y la pantalla de inicio dice qué toca hoy. Quien sabe usar una hoja de cálculo sabe usar esto.",
    ],
    [
      "«Es caro para lo que somos»",
      "Empieza en 7 € al mes. Cuesta menos que perder un cliente al año por no hacer seguimiento, y no hay permanencia ni coste de alta.",
    ],
  ];
  return (
    <section className="border-b border-ventia-line bg-white py-16">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Lo que sueles pensar antes de probarlo</h2>
        <div className="mt-10 space-y-8">
          {items.map(([t, d]) => (
            <div key={t} className="border-t border-ventia-line pt-5">
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="mt-2 text-ventia-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingBlock() {
  return (
    <section id="precios" className="ventia-soft-bg scroll-mt-20 border-b border-ventia-line py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Cuesta menos que un cliente perdido</h2>
          <p className="mt-3 text-ventia-ink-soft">
            Desde 7 € al mes. Sin coste de implantación, sin permanencia y con tus datos exportables
            desde el primer día.
          </p>
        </div>
        <div className="mt-10">
          <PricingPlans />
        </div>
        <p className="mt-6 text-sm">
          <Link to="/precios" className="font-semibold text-ventia-deep hover:underline">
            Ver la comparativa completa de planes
          </Link>
        </p>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "¿Qué pasa cuando acaban los 14 días?",
    a: "Nada automático: no pedimos tarjeta para probar, así que no se cobra solo. Si decides seguir, eliges plan; si no, tus datos siguen exportables y la cuenta se queda inactiva.",
  },
  {
    q: "¿Puedo traerme lo que ya tengo en la hoja de cálculo?",
    a: "Sí. La importación CSV te deja emparejar tus columnas con tus campos y avisa de duplicados por email antes de crear nada.",
  },
  {
    q: "¿Y si luego me quiero ir?",
    a: "Exportas contactos, oportunidades, tareas y notas en CSV cuando quieras y cancelas desde los ajustes, sin llamadas ni retención.",
  },
  {
    q: "¿Pago por cada persona del equipo?",
    a: "En Esencial no: es precio cerrado por empresa hasta 3 personas. En Pro y Escala pagas solo por quien entra de verdad, y puedes quitar usuarios cuando cambia el equipo.",
  },
  {
    q: "¿Necesito a alguien técnico para configurarlo?",
    a: "No. Campos y etapas se crean y se ordenan arrastrando, sin fórmulas ni programación.",
  },
  {
    q: "¿Qué hacéis con los datos de mis clientes?",
    a: "Son tuyos: no se venden ni se usan para entrenar nada. Puedes exportarlos o pedir su eliminación en cualquier momento, como se detalla en la política de privacidad.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-b border-ventia-line bg-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Antes de decidir</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-ventia-ink-soft">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function ContactBlock() {
  return (
    <section id="contacto" className="ventia-soft-bg scroll-mt-20 border-b border-ventia-line py-16">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            ¿Prefieres que te lo enseñemos con tus datos?
          </h2>
          <p className="mt-4 text-ventia-ink-soft">
            Cuéntanos cómo vendéis hoy y te preparamos una sesión de 20 minutos con tu pipeline y
            tus campos ya montados. Te decimos también si Ventia no encaja en tu caso.
          </p>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">
          Tu próximo cliente ya te ha escrito
        </h2>
        <p className="mt-4 text-lg text-ventia-ink-soft">
          Ten el seguimiento ordenado antes de la próxima reunión de ventas.
        </p>
        <div className="mt-8 flex justify-center">
          <CtaPrimary className="px-6 py-3.5 text-base">{CTA}</CtaPrimary>
        </div>
        <Friction className="mt-3" />
      </div>
    </section>
  );
}
