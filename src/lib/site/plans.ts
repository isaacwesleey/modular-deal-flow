/** Planes comerciales de Ventia (precios sin IVA, en euros). */
export interface Plan {
  id: "esencial" | "pro" | "escala";
  name: string;
  tagline: string;
  monthly: number;
  yearly: number; // precio por usuario y mes facturando al año
  highlight?: boolean;
  cta: string;
  features: string[];
}

export const YEARLY_DISCOUNT = 0.2;

export const PLANS: Plan[] = [
  {
    id: "esencial",
    name: "Esencial",
    tagline: "Para empezar a ordenar los leads esta misma semana.",
    monthly: 19,
    yearly: 15,
    cta: "Empezar con Esencial",
    features: [
      "Hasta 3 usuarios",
      "Contactos y fichas de lead ilimitadas",
      "Pipeline con etapas propias",
      "Tareas y notas",
      "Campos personalizados (hasta 15)",
      "Importación y exportación CSV",
      "Soporte por email en 24 h",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para equipos comerciales que ya venden en serio.",
    monthly: 39,
    yearly: 31,
    highlight: true,
    cta: "Probar Pro 14 días",
    features: [
      "Usuarios ilimitados",
      "Todo lo de Esencial",
      "Campos personalizados sin límite y vistas guardadas",
      "Atribución de origen (UTM, referrer, dispositivo)",
      "Historial de actividad y auditoría",
      "Notificaciones, menciones y avisos de vencimiento",
      "Papelera con recuperación a 30 días",
      "Soporte prioritario en 4 h",
    ],
  },
  {
    id: "escala",
    name: "Escala",
    tagline: "Varias marcas, varias unidades de negocio, un solo panel.",
    monthly: 69,
    yearly: 55,
    cta: "Hablar con ventas",
    features: [
      "Todo lo de Pro",
      "Multi organización con aislamiento total",
      "Panel de administración y modo soporte",
      "Roles y permisos avanzados",
      "Marca propia por organización (logo y color)",
      "Onboarding guiado y migración de datos",
      "Gestor de cuenta asignado",
    ],
  },
];

/** Filas de la tabla comparativa: valor por plan. */
export const COMPARISON: { group: string; rows: { label: string; values: [string, string, string] }[] }[] = [
  {
    group: "Equipo y organizaciones",
    rows: [
      { label: "Usuarios incluidos", values: ["3", "Ilimitados", "Ilimitados"] },
      { label: "Organizaciones", values: ["1", "1", "Ilimitadas"] },
      { label: "Roles y permisos", values: ["Básicos", "Admin y usuario", "Avanzados + soporte"] },
    ],
  },
  {
    group: "Datos y personalización",
    rows: [
      { label: "Campos personalizados", values: ["15", "Ilimitados", "Ilimitados"] },
      { label: "Etapas de pipeline propias", values: ["Sí", "Sí", "Sí"] },
      { label: "Vistas guardadas y filtros", values: ["—", "Sí", "Sí"] },
      { label: "Marca propia (logo y color)", values: ["—", "Sí", "Por organización"] },
    ],
  },
  {
    group: "Comercial",
    rows: [
      { label: "Atribución de origen", values: ["—", "Sí", "Sí"] },
      { label: "Historial de actividad", values: ["30 días", "Completo", "Completo"] },
      { label: "Notificaciones y menciones", values: ["—", "Sí", "Sí"] },
      { label: "Importación / exportación CSV", values: ["Sí", "Sí", "Sí"] },
    ],
  },
  {
    group: "Servicio",
    rows: [
      { label: "Soporte", values: ["Email 24 h", "Prioritario 4 h", "Gestor asignado"] },
      { label: "Onboarding", values: ["Autoservicio", "Guía en vídeo", "Sesión 1 a 1"] },
    ],
  },
];

export const BILLING_FAQ: { q: string; a: string }[] = [
  {
    q: "¿El precio es por usuario o por empresa?",
    a: "Esencial se factura por empresa con hasta 3 usuarios. Pro y Escala se facturan por usuario y mes; solo pagas por las personas que entran en Ventia.",
  },
  {
    q: "¿Qué descuento tiene el pago anual?",
    a: "Un 20 % sobre la tarifa mensual. Se cobra una sola vez al año y puedes añadir usuarios en cualquier momento, prorrateando lo que quede de periodo.",
  },
  {
    q: "¿Necesito tarjeta para probarlo?",
    a: "No. La prueba de 14 días de Pro se activa con tu email y no pedimos tarjeta hasta que decides quedarte.",
  },
  {
    q: "¿Puedo cambiar de plan o cancelar?",
    a: "Sí, cuando quieras y desde los ajustes de la organización. Al subir de plan pagas solo la diferencia; al bajar o cancelar mantienes el acceso hasta el final del periodo pagado.",
  },
  {
    q: "¿Los precios incluyen IVA?",
    a: "No. Los importes se muestran sin impuestos; en la factura se aplica el IVA que corresponda según tu país y tu identificación fiscal.",
  },
  {
    q: "¿Qué pasa con mis datos si me voy?",
    a: "Puedes exportar contactos, oportunidades, tareas y notas en CSV en cualquier momento. Tras la baja conservamos la copia 30 días por si vuelves y después la eliminamos.",
  },
];
