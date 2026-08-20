import type { ActivityEvent, Attribution, CrmState, RootState, Tenant, User } from "./types";

export const DEFAULT_PASSWORD = "acceso1234";

/**
 * Versión del esquema de datos del tenant. Las migraciones puntuales se aplican
 * una única vez comparando este número con el estado guardado.
 */
export const SCHEMA_VERSION = 3;

/** Pipeline por defecto al que se migran las etapas y oportunidades existentes. */
export const DEFAULT_PIPELINE_ID = "pl-ventas";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texto corto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  phone: "Teléfono",
  email: "Email",
  select: "Selector (una opción)",
  multiselect: "Etiquetas (varias)",
  checkbox: "Casilla",
  currency: "Moneda",
  url: "URL",
  user: "Usuario del equipo",
};

export const BRAND_COLORS = [
  { name: "Índigo", value: "oklch(0.55 0.19 268)" },
  { name: "Esmeralda", value: "oklch(0.6 0.14 163)" },
  { name: "Ámbar", value: "oklch(0.72 0.16 68)" },
  { name: "Coral", value: "oklch(0.62 0.19 25)" },
  { name: "Océano", value: "oklch(0.58 0.13 220)" },
  { name: "Fucsia", value: "oklch(0.6 0.2 330)" },
];

const today = new Date();
const iso = (d: number, h = 10) => {
  const x = new Date(today);
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x.toISOString().slice(0, 16);
};
const daysAgo = (d: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() - d);
  return x.toISOString();
};

/** Atribuciones variadas para que el bloque de origen nunca se vea vacío. */
const ATTRIBUTIONS: Attribution[] = [
  {
    utmSource: "meta",
    utmMedium: "paid_social",
    utmCampaign: "leads-primavera",
    utmContent: "carrusel-a",
    referrer: "https://www.facebook.com/",
    landingPage: "/landing/rediseno-web",
    device: "móvil",
  },
  {
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "marca-generica",
    utmTerm: "agencia diseño web",
    referrer: "https://www.google.com/",
    landingPage: "/",
    device: "escritorio",
  },
  {
    utmSource: "google",
    utmMedium: "organic",
    referrer: "https://www.google.com/",
    landingPage: "/blog/como-elegir-agencia",
    device: "escritorio",
  },
  {
    utmSource: "referido",
    utmMedium: "partner",
    utmCampaign: "programa-partners",
    referrer: "https://estudiolf.com/recursos",
    landingPage: "/precios",
    device: "tablet",
  },
  {
    utmSource: "directo",
    utmMedium: "none",
    landingPage: "/",
    device: "escritorio",
  },
];

export function defaultState(): CrmState {
  const pipelines = [{ id: DEFAULT_PIPELINE_ID, name: "Ventas" }];
  const stages = [
    { id: "s1", name: "Nuevo lead", color: "oklch(0.72 0.13 250)", pipelineId: DEFAULT_PIPELINE_ID },
    { id: "s2", name: "Contactado", color: "oklch(0.72 0.13 200)", pipelineId: DEFAULT_PIPELINE_ID },
    { id: "s3", name: "Propuesta enviada", color: "oklch(0.75 0.14 90)", pipelineId: DEFAULT_PIPELINE_ID },
    { id: "s4", name: "Negociación", color: "oklch(0.72 0.15 60)", pipelineId: DEFAULT_PIPELINE_ID },
    { id: "s5", name: "Ganado", color: "oklch(0.68 0.15 155)", pipelineId: DEFAULT_PIPELINE_ID },
    { id: "s6", name: "Perdido", color: "oklch(0.62 0.17 25)", pipelineId: DEFAULT_PIPELINE_ID },
  ];

  const contacts = [
    { id: "c1", nombre: "Lucía Fernández", email: "lucia@estudiolf.com", telefono: "+34 611 223 344", empresa: "Estudio LF", etiquetas: ["VIP"], estado: "Cliente" },
    { id: "c2", nombre: "Marc Puig", email: "marc@puigdigital.es", telefono: "+34 622 111 900", empresa: "Puig Digital", etiquetas: ["Web"], estado: "Contactado" },
    { id: "c3", nombre: "Ana Ruiz", email: "ana.ruiz@gmail.com", telefono: "+34 633 555 010", empresa: "Freelance", etiquetas: ["Newsletter", "Web"], estado: "Nuevo" },
    { id: "c4", nombre: "Diego Salas", email: "diego@casasalas.com", telefono: "+34 644 777 121", empresa: "Casa Salas", etiquetas: ["VIP", "Referido"], estado: "Cliente" },
    { id: "c5", nombre: "Nora Vidal", email: "nora@vidalco.com", telefono: "+34 655 909 300", empresa: "Vidal & Co", etiquetas: [], estado: "Cualificado" },
  ].map((c, i) => ({
    id: c.id,
    createdAt: daysAgo(i * 3 + 1),
    attribution: { ...ATTRIBUTIONS[i % ATTRIBUTIONS.length]!, firstSeenAt: daysAgo(i * 3 + 2) },
    values: {
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      empresa: c.empresa,
      etiquetas: c.etiquetas,
      estado: c.estado,
      propietario: i % 2 === 0 ? "u-admin" : "u-user",
    },
  }));

  const deals = [
    { id: "d1", t: "Rediseño web Estudio LF", v: 4800, s: "s3", c: "c1", cliente: "Lucía Fernández", cierre: iso(12).slice(0, 10) },
    { id: "d2", t: "Branding Puig Digital", v: 2500, s: "s1", c: "c2", cliente: "Marc Puig", cierre: iso(25).slice(0, 10) },
    { id: "d3", t: "Landing + embudo", v: 1200, s: "s2", c: "c3", cliente: "Ana Ruiz", cierre: iso(9).slice(0, 10) },
    { id: "d4", t: "Mantenimiento anual", v: 3600, s: "s4", c: "c4", cliente: "Diego Salas", cierre: iso(5).slice(0, 10) },
    { id: "d5", t: "Tienda online", v: 7400, s: "s5", c: "c4", cliente: "Diego Salas", cierre: iso(-4).slice(0, 10) },
    { id: "d6", t: "Consultoría SEO", v: 900, s: "s6", c: "c5", cliente: "Nora Vidal", cierre: iso(-10).slice(0, 10) },
  ].map((d, i) => ({
    id: d.id,
    createdAt: daysAgo(i * 2),
    stageId: d.s,
    pipelineId: DEFAULT_PIPELINE_ID,
    contactId: d.c,
    values: {
      titulo: d.t,
      valor: d.v,
      cliente: d.cliente,
      cierre: d.cierre,
      prioridad: i % 3 === 0 ? "Alta" : "Media",
    },
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    branding: {
      companyName: "Mi Empresa",
      logo: "◆",
      brandHue: BRAND_COLORS[0]!.value,
      theme: "light",
    },
    modules: { pipeline: true, tareas: true, notas: true },
    contactFields: [
      { id: "nombre", label: "Nombre", type: "text", core: true, showInQuickView: true, role: "title" },
      { id: "email", label: "Email", type: "email", showInQuickView: true, role: "email" },
      { id: "telefono", label: "Teléfono", type: "phone", showInQuickView: true, role: "phone" },
      { id: "empresa", label: "Empresa", type: "text", showInQuickView: true, role: "company" },
      { id: "estado", label: "Estado", type: "select", options: ["Nuevo", "Contactado", "Cualificado", "Cliente", "Perdido"], showInQuickView: true, role: "status" },
      { id: "propietario", label: "Propietario", type: "user", showInQuickView: true, role: "owner" },
      { id: "etiquetas", label: "Etiquetas", type: "multiselect", options: ["VIP", "Web", "Newsletter", "Referido"], showInQuickView: false },
    ],
    dealFields: [
      { id: "titulo", label: "Título", type: "text", core: true, showInQuickView: true, role: "title" },
      { id: "valor", label: "Valor", type: "currency", showInQuickView: true, role: "amount" },
      { id: "cliente", label: "Cliente", type: "text", showInQuickView: true },
      { id: "cierre", label: "Cierre previsto", type: "date", showInQuickView: true },
      { id: "prioridad", label: "Prioridad", type: "select", options: ["Baja", "Media", "Alta"], showInQuickView: false },
    ],
    pipelines,
    stages,
    contacts,
    deals,
    tasks: [
      { id: "t1", title: "Llamar a Lucía por la propuesta", kind: "llamada", date: iso(0, 11), done: false, linkType: "contact", linkId: "c1" },
      { id: "t2", title: "Enviar presupuesto a Marc", kind: "email", date: iso(0, 17), done: false, linkType: "deal", linkId: "d2" },
      { id: "t3", title: "Reunión de cierre Casa Salas", kind: "reunion", date: iso(2, 9), done: false, linkType: "deal", linkId: "d4" },
      { id: "t4", title: "Preparar kickoff", kind: "otro", date: iso(-1, 12), done: true, linkType: "none" },
    ],
    notes: [
      { id: "n1", text: "Lucía quiere una web más minimalista, con foco en portfolio.", createdAt: daysAgo(1), linkType: "contact", linkId: "c1" },
      { id: "n2", text: "Diego confirma presupuesto anual. Falta firma.", createdAt: daysAgo(3), linkType: "deal", linkId: "d4" },
      { id: "n3", text: "Nora pausa el proyecto hasta el próximo trimestre.", createdAt: daysAgo(8), linkType: "contact", linkId: "c5" },
    ],
    blocks: [
      { id: "b1", type: "numero", config: { title: "Oportunidades ganadas", metric: "deals-ganados" } },
      { id: "b2", type: "pipeline-resumen" },
      { id: "b3", type: "tareas-hoy" },
      { id: "b4", type: "ultimos-contactos" },
      { id: "b5", type: "actividad" },
    ],
    events: contacts.map<ActivityEvent>((c, i) => ({
      id: `ev-${c.id}`,
      at: c.createdAt,
      type: "contact.created",
      actorId: i % 2 === 0 ? "u-admin" : "u-user",
      actorName: i % 2 === 0 ? "Elena Admin" : "Iván Comercial",
      contactId: c.id,
    })),
    savedViews: [],
    leadToDeal: {
      enabled: false,
      statusValue: "Cualificado",
      pipelineId: DEFAULT_PIPELINE_ID,
      stageId: "s1",
    },
    intake: { key: `vk_${uid()}${uid()}`, logs: [] },
  };
}
/* ---------------- Multi tenant: usuarios y organizaciones precargadas ---------------- */

export function emptyTenantState(companyName: string, brandIndex = 0): CrmState {
  const s = defaultState();
  return {
    ...s,
    branding: { ...s.branding, companyName, brandHue: BRAND_COLORS[brandIndex % BRAND_COLORS.length]!.value },
    contacts: [],
    deals: [],
    tasks: [],
    notes: [],
    events: [],
    savedViews: [],
    intake: { key: `vk_${uid()}${uid()}`, logs: [] },
  };
}

export function makeTenant(name: string, state: CrmState): Tenant {
  return { id: uid(), name, createdAt: new Date().toISOString(), state };
}

/**
 * Organización de EJEMPLO para enseñar el aislamiento multi organización.
 * Ya no se precarga: el super admin la crea cuando la necesita desde el panel
 * de plataforma (ver `createExampleTenant`).
 */
export function studioNorteState(): CrmState {
  const base = defaultState();
  return {
    ...base,
    branding: { companyName: "Studio Norte", logo: "▲", brandHue: BRAND_COLORS[1]!.value, theme: "light" },
    modules: { pipeline: true, tareas: true, notas: false },
    pipelines: [{ id: "pl-obra", name: "Proyectos" }],
    stages: [
      { id: "n1", name: "Solicitud", color: "oklch(0.72 0.13 250)", pipelineId: "pl-obra" },
      { id: "n2", name: "Presupuesto", color: "oklch(0.75 0.14 90)", pipelineId: "pl-obra" },
      { id: "n3", name: "En obra", color: "oklch(0.72 0.15 60)", pipelineId: "pl-obra" },
      { id: "n4", name: "Entregado", color: "oklch(0.68 0.15 155)", pipelineId: "pl-obra" },
    ],
    contactFields: [
      { id: "nombre", label: "Cliente", type: "text", core: true, showInQuickView: true, role: "title" },
      { id: "email", label: "Email", type: "email", showInQuickView: true, role: "email" },
      { id: "empresa", label: "Empresa", type: "text", showInQuickView: true, role: "company" },
      { id: "ciudad", label: "Ciudad", type: "text", showInQuickView: true },
      { id: "sector", label: "Sector", type: "select", options: ["Retail", "Hostelería", "Oficinas"], showInQuickView: true },
      { id: "fase", label: "Fase", type: "select", options: ["Solicitud", "Visitado", "Presupuestado", "Cliente"], showInQuickView: true, role: "status" },
      { id: "responsable", label: "Responsable", type: "user", showInQuickView: true, role: "owner" },
    ],
    dealFields: [
      { id: "titulo", label: "Proyecto", type: "text", core: true, showInQuickView: true, role: "title" },
      { id: "presupuesto", label: "Presupuesto", type: "currency", showInQuickView: true, role: "amount" },
      { id: "m2", label: "Metros cuadrados", type: "number", showInQuickView: true },
    ],
    contacts: [
      { id: "sc1", createdAt: daysAgo(2), attribution: { ...ATTRIBUTIONS[0]!, firstSeenAt: daysAgo(3) }, values: { nombre: "Bar Aurora", email: "hola@baraurora.es", empresa: "Grupo Aurora", ciudad: "Bilbao", sector: "Hostelería", fase: "Solicitud", responsable: "u-norte" } },
      { id: "sc2", createdAt: daysAgo(6), attribution: { ...ATTRIBUTIONS[2]!, firstSeenAt: daysAgo(7) }, values: { nombre: "Óptica Zubi", email: "info@opticazubi.com", empresa: "Óptica Zubi S.L.", ciudad: "Donostia", sector: "Retail", fase: "Presupuestado", responsable: "u-norte" } },
      { id: "sc3", createdAt: daysAgo(11), attribution: { ...ATTRIBUTIONS[3]!, firstSeenAt: daysAgo(12) }, values: { nombre: "Coworking Ría", email: "gestion@coworkingria.com", empresa: "Ría Espacios", ciudad: "Bilbao", sector: "Oficinas", fase: "Cliente", responsable: "u-admin" } },
    ],
    deals: [
      { id: "sd1", createdAt: daysAgo(2), stageId: "n2", pipelineId: "pl-obra", contactId: "sc1", values: { titulo: "Reforma Bar Aurora", presupuesto: 18500, m2: 120 } },
      { id: "sd2", createdAt: daysAgo(5), stageId: "n3", pipelineId: "pl-obra", contactId: "sc2", values: { titulo: "Escaparate Óptica Zubi", presupuesto: 6400, m2: 35 } },
      { id: "sd3", createdAt: daysAgo(9), stageId: "n4", pipelineId: "pl-obra", contactId: "sc3", values: { titulo: "Salas Coworking Ría", presupuesto: 24000, m2: 260 } },
    ],
    tasks: [
      { id: "st1", title: "Visita técnica Bar Aurora", kind: "reunion", date: iso(0, 12), done: false, linkType: "deal", linkId: "sd1" },
      { id: "st2", title: "Enviar planos a Óptica Zubi", kind: "email", date: iso(1, 9), done: false, linkType: "deal", linkId: "sd2" },
    ],
    notes: [],
    blocks: [
      { id: "sb1", type: "numero", config: { title: "Valor en curso", metric: "valor-pipeline" } },
      { id: "sb2", type: "pipeline-resumen" },
      { id: "sb3", type: "tareas-hoy" },
    ],
    events: [
      { id: "sev1", at: daysAgo(2), type: "contact.created", actorId: "u-norte", actorName: "Aitor Norte", contactId: "sc1" },
      { id: "sev2", at: daysAgo(6), type: "contact.created", actorId: "u-norte", actorName: "Aitor Norte", contactId: "sc2" },
      { id: "sev3", at: daysAgo(11), type: "contact.created", actorId: "u-admin", actorName: "Elena Admin", contactId: "sc3" },
    ],
    savedViews: [],
    leadToDeal: { enabled: false, statusValue: "Visitado", pipelineId: "pl-obra", stageId: "n1" },
    intake: { key: `vk_${uid()}${uid()}`, logs: [] },
  };
}

/** Identificadores estables de la organización precargada y sus usuarios. */
export const MAIN_TENANT = "acme";
export const EXAMPLE_TENANT = "norte";

/**
 * Arranque de la plantilla: UNA sola organización precargada y bien poblada,
 * con su administrador y un usuario, más el super admin de la plataforma.
 * La segunda organización (para demostrar el aislamiento) se crea a demanda
 * desde el panel de plataforma.
 */
export function seedRootState(): RootState {
  const t1: Tenant = { id: MAIN_TENANT, name: "Mi Empresa", createdAt: daysAgo(40), state: defaultState() };

  const users: User[] = [
    { id: "u-super", name: "Super Admin", email: "super@ventia.io", password: DEFAULT_PASSWORD, superAdmin: true, emailVerified: true, memberships: [] },
    { id: "u-admin", name: "Elena Admin", email: "admin@miempresa.com", password: DEFAULT_PASSWORD, emailVerified: true, memberships: [{ tenantId: t1.id, role: "admin" }] },
    { id: "u-user", name: "Iván Comercial", email: "usuario@miempresa.com", password: DEFAULT_PASSWORD, emailVerified: true, memberships: [{ tenantId: t1.id, role: "user" }] },
  ];

  return {
    tenants: { [t1.id]: t1 },
    users,
    currentUserId: null,
    currentTenantId: null,
    tokens: [],
    notifications: [],
  };
}

/**
 * Crea (una sola vez) la organización de ejemplo ya poblada y su administrador.
 * Sirve para enseñar que los datos, campos, etapas y marca están aislados.
 */
export function createExampleTenant(r: RootState): RootState {
  if (r.tenants[EXAMPLE_TENANT]) return r;
  const tenant: Tenant = {
    id: EXAMPLE_TENANT,
    name: "Studio Norte",
    createdAt: new Date().toISOString(),
    state: studioNorteState(),
  };
  const hasUser = r.users.some((u) => u.id === "u-norte");
  const users: User[] = hasUser
    ? r.users.map((u) =>
        u.id === "u-norte" && !u.memberships.some((m) => m.tenantId === EXAMPLE_TENANT)
          ? { ...u, memberships: [...u.memberships, { tenantId: EXAMPLE_TENANT, role: "admin" as const }] }
          : u,
      )
    : [
        ...r.users,
        {
          id: "u-norte",
          name: "Aitor Norte",
          email: "admin@studionorte.com",
          password: DEFAULT_PASSWORD,
          emailVerified: true,
          memberships: [{ tenantId: EXAMPLE_TENANT, role: "admin" as const }],
        },
      ];
  return { ...r, tenants: { ...r.tenants, [EXAMPLE_TENANT]: tenant }, users };
}
