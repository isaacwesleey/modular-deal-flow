import type { CrmState } from "./types";

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

export function defaultState(): CrmState {
  const stages = [
    { id: "s1", name: "Nuevo lead", color: "oklch(0.72 0.13 250)" },
    { id: "s2", name: "Contactado", color: "oklch(0.72 0.13 200)" },
    { id: "s3", name: "Propuesta enviada", color: "oklch(0.75 0.14 90)" },
    { id: "s4", name: "Negociación", color: "oklch(0.72 0.15 60)" },
    { id: "s5", name: "Ganado", color: "oklch(0.68 0.15 155)" },
    { id: "s6", name: "Perdido", color: "oklch(0.62 0.17 25)" },
  ];

  const contacts = [
    { id: "c1", nombre: "Lucía Fernández", email: "lucia@estudiolf.com", telefono: "+34 611 223 344", empresa: "Estudio LF", etiquetas: ["VIP"], estado: "Cliente" },
    { id: "c2", nombre: "Marc Puig", email: "marc@puigdigital.es", telefono: "+34 622 111 900", empresa: "Puig Digital", etiquetas: ["Web"], estado: "Lead" },
    { id: "c3", nombre: "Ana Ruiz", email: "ana.ruiz@gmail.com", telefono: "+34 633 555 010", empresa: "Freelance", etiquetas: ["Newsletter", "Web"], estado: "Lead" },
    { id: "c4", nombre: "Diego Salas", email: "diego@casasalas.com", telefono: "+34 644 777 121", empresa: "Casa Salas", etiquetas: ["VIP", "Referido"], estado: "Cliente" },
    { id: "c5", nombre: "Nora Vidal", email: "nora@vidalco.com", telefono: "+34 655 909 300", empresa: "Vidal & Co", etiquetas: [], estado: "Perdido" },
  ].map((c, i) => ({
    id: c.id,
    createdAt: daysAgo(i * 3 + 1),
    values: {
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      empresa: c.empresa,
      etiquetas: c.etiquetas,
      estado: c.estado,
    },
  }));

  const deals = [
    { id: "d1", t: "Rediseño web Estudio LF", v: 4800, s: "s3", cliente: "Lucía Fernández", cierre: iso(12).slice(0, 10) },
    { id: "d2", t: "Branding Puig Digital", v: 2500, s: "s1", cliente: "Marc Puig", cierre: iso(25).slice(0, 10) },
    { id: "d3", t: "Landing + embudo", v: 1200, s: "s2", cliente: "Ana Ruiz", cierre: iso(9).slice(0, 10) },
    { id: "d4", t: "Mantenimiento anual", v: 3600, s: "s4", cliente: "Diego Salas", cierre: iso(5).slice(0, 10) },
    { id: "d5", t: "Tienda online", v: 7400, s: "s5", cliente: "Diego Salas", cierre: iso(-4).slice(0, 10) },
    { id: "d6", t: "Consultoría SEO", v: 900, s: "s6", cliente: "Nora Vidal", cierre: iso(-10).slice(0, 10) },
  ].map((d, i) => ({
    id: d.id,
    createdAt: daysAgo(i * 2),
    stageId: d.s,
    values: {
      titulo: d.t,
      valor: d.v,
      cliente: d.cliente,
      cierre: d.cierre,
      prioridad: i % 3 === 0 ? "Alta" : "Media",
    },
  }));

  return {
    branding: {
      companyName: "Mi Empresa",
      logo: "◆",
      brandHue: BRAND_COLORS[0]!.value,
      theme: "light",
    },
    modules: { pipeline: true, tareas: true, notas: true },
    contactFields: [
      { id: "nombre", label: "Nombre", type: "text", core: true, showInQuickView: true },
      { id: "email", label: "Email", type: "email", showInQuickView: true },
      { id: "telefono", label: "Teléfono", type: "phone", showInQuickView: true },
      { id: "empresa", label: "Empresa", type: "text", showInQuickView: true },
      { id: "estado", label: "Estado", type: "select", options: ["Lead", "Cliente", "Perdido"], showInQuickView: true },
      { id: "etiquetas", label: "Etiquetas", type: "multiselect", options: ["VIP", "Web", "Newsletter", "Referido"], showInQuickView: false },
    ],
    dealFields: [
      { id: "titulo", label: "Título", type: "text", core: true, showInQuickView: true },
      { id: "valor", label: "Valor", type: "currency", showInQuickView: true },
      { id: "cliente", label: "Cliente", type: "text", showInQuickView: true },
      { id: "cierre", label: "Cierre previsto", type: "date", showInQuickView: true },
      { id: "prioridad", label: "Prioridad", type: "select", options: ["Baja", "Media", "Alta"], showInQuickView: false },
    ],
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
      { id: "b1", type: "numero", config: { title: "Deals ganados", metric: "deals-ganados" } },
      { id: "b2", type: "pipeline-resumen" },
      { id: "b3", type: "tareas-hoy" },
      { id: "b4", type: "ultimos-contactos" },
      { id: "b5", type: "actividad" },
    ],
  };
}