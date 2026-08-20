import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  KanbanSquare,
  Layers,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  X,
} from "lucide-react";
import { SiteShell, CtaPrimary } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { PricingPlans } from "@/components/site/Pricing";
import { ContactForm } from "@/components/site/ContactForm";
import {
  FieldsPreview,
  KanbanPreview,
  LeadPreview,
  TenantsPreview,
} from "@/components/site/AppPreview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "Ventia — El CRM que tu equipo sí usa";
const DESC =
  "Ventia ordena tus leads, tu pipeline y tu seguimiento comercial en una herramienta que se adapta a tu forma de vender. Prueba 14 días sin tarjeta.";

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
      <SocialProof />
      <Problem />
      <Features />
      <UseCases />
      <VsSpreadsheets />
      <PricingBlock />
      <Faq />
      <ContactBlock />
      <FinalCta />
    </SiteShell>
  );
}

function Hero() {
  return (
    <section className="ventia-hero-bg relative overflow-hidden">
      <div className="ventia-grid-bg absolute inset-0 opacity-[0.35]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-24">
        <div className="min-w-0">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-ventia-line bg-white/80 px-3 py-1 text-xs font-semibold text-ventia-deep">
              <Sparkles className="h-3.5 w-3.5" /> Nuevo: campos personalizados sin límite
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              Deja de perder ventas <span className="ventia-gradient-text">entre hojas de cálculo</span>
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 max-w-xl text-lg text-ventia-ink-soft">
              Ventia reúne cada lead, cada conversación y cada oportunidad en un sitio. Tu equipo ve
              qué tiene que hacer hoy, y tú ves de dónde viene el dinero. Se configura en una tarde,
              no en un proyecto de seis meses.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaPrimary className="px-6 py-3.5 text-base">Crear cuenta gratis</CtaPrimary>
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-xl border border-ventia-line bg-white px-6 py-3.5 text-base font-semibold transition-colors hover:bg-ventia-mist"
              >
                Ver una demostración
              </a>
            </div>
          </Reveal>
          <Reveal delay={260}>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ventia-ink-soft">
              {["14 días de prueba", "Sin tarjeta", "Tus datos exportables siempre"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-ventia" /> {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={160} className="relative min-w-0">
          <div className="space-y-4">
            <KanbanPreview />
            <div className="ventia-float sm:ml-10">
              <LeadPreview />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SocialProof() {
  const logos = ["Reformas Aurora", "Studio Norte", "Clínica Ibai", "Legal Bidea", "Óptica Zubi"];
  return (
    <section className="border-y border-ventia-line bg-white py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-xs font-semibold tracking-[0.18em] text-ventia-ink-soft uppercase">
          Más de 1.200 equipos comerciales confían en Ventia
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          {logos.map((l) => (
            <span key={l} className="display text-base font-bold tracking-tight">
              {l}
            </span>
          ))}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              q: "Pasamos de cuatro hojas de cálculo a un solo pipeline. En el primer mes cerramos tres presupuestos que se nos habrían olvidado.",
              n: "Elena Uriarte",
              r: "Directora comercial, Reformas Aurora",
            },
            {
              q: "Lo montamos con nuestros propios campos en una tarde. El equipo lo usa porque habla su idioma, no el de un CRM genérico.",
              n: "Aitor Beltrán",
              r: "Socio, Studio Norte",
            },
            {
              q: "Por fin sé qué campaña trae clientes de verdad. La atribución viene sola en cada ficha.",
              n: "Marta Sáez",
              r: "Marketing, Clínica Ibai",
            },
          ].map((t, i) => (
            <Reveal key={t.n} delay={i * 90}>
              <figure className="h-full rounded-2xl border border-ventia-line bg-ventia-mist/50 p-5">
                <div className="flex gap-0.5 text-ventia-accent">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm">«{t.q}»</blockquote>
                <figcaption className="mt-4 text-xs text-ventia-ink-soft">
                  <span className="font-semibold text-ventia-ink">{t.n}</span> · {t.r}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    {
      icon: Clock3,
      t: "Los leads se enfrían sin que nadie se entere",
      d: "Un email sin responder a tiempo es una venta que se lleva otro. Ventia te dice qué toca hoy y a quién.",
    },
    {
      icon: ClipboardList,
      t: "Cada comercial guarda la información a su manera",
      d: "Con campos comunes y fichas iguales para todos, la información deja de vivir en cabezas y libretas.",
    },
    {
      icon: BarChart3,
      t: "Nadie sabe cuánto hay realmente en el pipeline",
      d: "Etapas propias y valor por etapa: en tres segundos sabes qué vas a facturar este trimestre.",
    },
  ];
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-sm font-bold tracking-wide text-ventia-deep uppercase">El problema</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold sm:text-4xl">
            No vendes menos por falta de esfuerzo. Vendes menos por falta de seguimiento.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.t} delay={i * 90}>
              <div className="h-full rounded-2xl border border-ventia-line p-6 transition-shadow hover:shadow-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ventia-mist text-ventia-deep">
                  <it.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{it.t}</h3>
                <p className="mt-2 text-sm text-ventia-ink-soft">{it.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const blocks = [
    {
      icon: KanbanSquare,
      t: "Un pipeline que se parece a cómo vendes",
      d: "Crea tus etapas, ponles color y arrastra las oportunidades. El valor de cada columna se recalcula solo, así que la previsión deja de ser una intuición.",
      bullets: ["Etapas propias con orden y color", "Tarjetas arrastrables", "Valor total por etapa"],
      visual: <KanbanPreview />,
    },
    {
      icon: Target,
      t: "La ficha de lead lo cuenta todo",
      d: "Quién es, en qué punto está, de dónde vino y qué se ha hecho. Sin abrir el correo ni preguntar al compañero.",
      bullets: ["Historial real de cambios", "Notas, tareas y oportunidades", "Origen: UTM, referrer y dispositivo"],
      visual: <LeadPreview />,
      flip: true,
    },
    {
      icon: Layers,
      t: "Campos a tu medida, sin programar",
      d: "Texto, fecha, moneda, selector, usuario… Añade lo que tu negocio necesita, ordénalo arrastrando y decide qué se ve en la vista rápida.",
      bullets: ["Editor de campos con arrastrar y soltar", "Roles: título, importe, estado, propietario", "Vista rápida configurable"],
      visual: <FieldsPreview />,
    },
    {
      icon: Users,
      t: "Varias organizaciones, cero mezclas",
      d: "Agencias, grupos y franquicias trabajan con marcas distintas desde la misma cuenta, con datos y permisos aislados.",
      bullets: ["Aislamiento total entre organizaciones", "Roles de administrador y usuario", "Marca propia por organización"],
      visual: <TenantsPreview />,
      flip: true,
    },
  ];

  return (
    <section id="funciones" className="scroll-mt-20 bg-ventia-mist/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-sm font-bold tracking-wide text-ventia-deep uppercase">Lo que consigues</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold sm:text-4xl">
            Todo lo que necesitas para vender más ordenado, y nada de lo que sobra
          </h2>
        </Reveal>
        <div className="mt-14 space-y-16">
          {blocks.map((b, i) => (
            <Reveal key={b.t} delay={40}>
              <div
                className={`grid items-center gap-8 lg:grid-cols-2 ${b.flip ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ventia-deep text-white">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-2xl font-bold">{b.t}</h3>
                  <p className="mt-3 text-ventia-ink-soft">{b.d}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {b.bullets.map((x) => (
                      <li key={x} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-ventia" /> {x}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/auth"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ventia-deep hover:underline"
                  >
                    Probarlo con mis datos <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div key={`v-${i}`}>{b.visual}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    {
      t: "Reformas y servicios a domicilio",
      d: "Solicitud, visita, presupuesto y obra. Cada lead con su dirección, sus metros y su responsable.",
      m: "−38 % de presupuestos sin seguimiento",
    },
    {
      t: "Agencias y estudios",
      d: "Varios clientes, varias marcas. Una organización por cliente y un panel para verlas todas.",
      m: "3 h/semana menos en reportes",
    },
    {
      t: "Clínicas y consultas",
      d: "Primera visita, tratamiento y revisión. Tareas con recordatorio para que nadie se pierda.",
      m: "+22 % de revisiones recuperadas",
    },
    {
      t: "B2B y equipos comerciales",
      d: "Ciclos largos con muchos contactos. Historial completo para que un relevo no rompa la venta.",
      m: "Previsión cerrada en 5 minutos",
    },
  ];
  return (
    <section id="casos" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-sm font-bold tracking-wide text-ventia-deep uppercase">Casos de uso</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Se adapta a tu negocio, no al revés</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {cases.map((c, i) => (
            <Reveal key={c.t} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-ventia-line bg-gradient-to-br from-white to-ventia-mist/60 p-6">
                <h3 className="text-lg font-bold">{c.t}</h3>
                <p className="mt-2 text-sm text-ventia-ink-soft">{c.d}</p>
                <span className="mt-4 w-fit rounded-full bg-ventia-deep/10 px-3 py-1 text-xs font-semibold text-ventia-deep">
                  {c.m}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function VsSpreadsheets() {
  const rows: [string, string][] = [
    ["Versiones distintas del mismo archivo", "Un único dato compartido y actualizado"],
    ["Nadie sabe quién habló con quién", "Historial firmado con fecha y persona"],
    ["Recordatorios en la cabeza", "Tareas con aviso de vencimiento"],
    ["El origen del lead se pierde", "UTM, referrer y dispositivo en la ficha"],
    ["Fórmulas rotas al añadir columnas", "Campos personalizados sin romper nada"],
    ["Todo el mundo lo ve todo", "Roles y organizaciones aisladas"],
  ];
  return (
    <section className="bg-ventia-ink py-20 text-white">
      <div className="mx-auto max-w-5xl px-4">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">
            La hoja de cálculo fue un buen comienzo. Hoy te está costando dinero.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-white/70 uppercase">
                <FileSpreadsheet className="h-4 w-4" /> Hoja de cálculo
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                {rows.map(([a]) => (
                  <li key={a} className="flex gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-2xl border border-ventia/40 bg-ventia/10 p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-ventia uppercase">
                <ShieldCheck className="h-4 w-4" /> Con Ventia
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {rows.map(([, b]) => (
                  <li key={b} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ventia" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <div className="mt-10 text-center">
          <CtaPrimary className="bg-white text-ventia-ink shadow-none hover:bg-white/90">
            Empezar gratis
          </CtaPrimary>
        </div>
      </div>
    </section>
  );
}

function PricingBlock() {
  return (
    <section id="precios" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div className="text-center">
            <p className="text-sm font-bold tracking-wide text-ventia-deep uppercase">Precios</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Cuesta menos que un lead perdido</h2>
            <p className="mx-auto mt-3 max-w-xl text-ventia-ink-soft">
              Sin permanencia, sin coste de implantación y con tus datos exportables desde el primer
              día.
            </p>
          </div>
        </Reveal>
        <div className="mt-10">
          <PricingPlans />
        </div>
        <p className="mt-6 text-center text-sm">
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
    q: "¿Cuánto tardo en tenerlo funcionando?",
    a: "Una tarde. Creas tu organización, defines tus campos y tus etapas, importas tus contactos desde un CSV y ya estás vendiendo dentro de Ventia. No hay consultoría obligatoria ni instalación.",
  },
  {
    q: "Mi equipo no es técnico, ¿lo van a usar?",
    a: "Esa es la idea. Ventia enseña solo los campos que tú decides, en tu vocabulario, y la pantalla de inicio dice qué toca hoy. Si un comercial sabe usar una hoja de cálculo, sabe usar Ventia.",
  },
  {
    q: "¿Puedo traerme lo que ya tengo?",
    a: "Sí. La importación CSV permite mapear tus columnas a tus campos y avisa de duplicados por email antes de crear nada. Y puedes volver a exportarlo todo cuando quieras.",
  },
  {
    q: "¿Qué pasa con los datos de mis clientes?",
    a: "Son tuyos. No los vendemos ni los usamos para entrenar nada. Puedes exportarlos o pedir su eliminación en cualquier momento, tal y como se detalla en la política de privacidad.",
  },
  {
    q: "¿Sirve si gestiono varias empresas o marcas?",
    a: "Sí. Con el plan Escala tienes organizaciones independientes: campos, etapas, marca y usuarios separados, y un conmutador para pasar de una a otra sin cerrar sesión.",
  },
  {
    q: "¿Y si me arrepiento?",
    a: "Cancelas desde los ajustes, sin llamadas ni formularios de retención. Mantienes el acceso hasta el final del periodo pagado y te llevas tus datos en CSV.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-ventia-mist/40 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Preguntas frecuentes</h2>
        </Reveal>
        <Reveal delay={80}>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-ventia-ink-soft">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

function ContactBlock() {
  return (
    <section id="contacto" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <div>
            <p className="text-sm font-bold tracking-wide text-ventia-deep uppercase">Hablemos</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              ¿Prefieres que te lo enseñemos con tus datos?
            </h2>
            <p className="mt-4 text-ventia-ink-soft">
              Cuéntanos cómo vendéis hoy y te preparamos una demostración de 20 minutos con tu
              pipeline y tus campos ya montados. Sin compromiso y sin discurso de vendedor.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Respuesta el mismo día laborable",
                "Te decimos si Ventia no encaja en tu caso",
                "Migramos tu CSV durante la sesión",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ventia" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="ventia-hero-bg py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <Reveal>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Tu próximo cliente ya te ha escrito. ¿Vas a encontrarlo a tiempo?
          </h2>
          <p className="mt-4 text-lg text-ventia-ink-soft">
            Empieza gratis hoy y ten tu pipeline ordenado antes de la próxima reunión de ventas.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <CtaPrimary className="px-6 py-3.5 text-base">Crear cuenta gratis</CtaPrimary>
            <Link
              to="/precios"
              className="inline-flex items-center justify-center rounded-xl border border-ventia-line bg-white px-6 py-3.5 text-base font-semibold hover:bg-ventia-mist"
            >
              Ver precios
            </Link>
          </div>
          <p className="mt-4 text-xs text-ventia-ink-soft">
            14 días de Pro · sin tarjeta · cancelas en un clic
          </p>
        </Reveal>
      </div>
    </section>
  );
}
