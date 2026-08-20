export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "phone"
  | "email"
  | "select"
  | "multiselect"
  | "checkbox"
  | "currency"
  | "url"
  | "user";

export type FieldRole =
  | "title"
  | "amount"
  | "status"
  | "owner"
  | "company"
  | "email"
  | "phone";

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  core?: boolean;
  showInQuickView?: boolean;
  role?: FieldRole;
}

export type FieldValues = Record<string, unknown>;

/** Origen y atribución del lead (solo lectura, capturada al llegar el visitante). */
export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
  device?: "escritorio" | "móvil" | "tablet";
  firstSeenAt?: string;
}

export interface Contact {
  id: string;
  createdAt: string;
  values: FieldValues;
  attribution?: Attribution;
  /** Si está presente, el contacto está en la papelera. */
  deletedAt?: string;
}

export type ActivityType =
  | "contact.created"
  | "contact.status"
  | "contact.owner"
  | "contact.field"
  | "contact.deleted"
  | "contact.restored"
  | "note.added"
  | "task.created"
  | "task.done"
  | "task.deleted"
  | "note.deleted"
  | "deal.linked"
  | "deal.stage"
  | "deal.deleted"
  | "deal.restored"
  | "deal.auto"
  | "lead.intake";

/** Registro de auditoría por organización. */
export interface ActivityEvent {
  id: string;
  at: string;
  type: ActivityType;
  /** Usuario que lo provocó. */
  actorId?: string;
  actorName: string;
  /** Entidad afectada (normalmente el contacto). */
  contactId?: string;
  dealId?: string;
  taskId?: string;
  noteId?: string;
  /** Etiqueta del campo o elemento tocado. */
  label?: string;
  from?: string;
  to?: string;
  text?: string;
}

/** Vista guardada del listado de contactos (por usuario y organización). */
export interface SavedView {
  id: string;
  name: string;
  userId: string;
  query: string;
  filters: { fieldId: string; value: string }[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** Columnas visibles y su orden en el listado (si se omite, se usan las de vista rápida). */
  columns?: string[];
}

export interface Deal {
  id: string;
  createdAt: string;
  stageId: string;
  /** Pipeline al que pertenece la oportunidad. */
  pipelineId?: string;
  /** Relación real con el contacto (nunca se deduce por texto). */
  contactId?: string;
  values: FieldValues;
  /** Si está presente, la oportunidad está en la papelera (mismo trato que los contactos). */
  deletedAt?: string;
}

/** Un embudo con sus propias etapas (Ventas, Postventa...). */
export interface Pipeline {
  id: string;
  name: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  /** Pipeline al que pertenece la etapa. */
  pipelineId?: string;
}

/**
 * Regla de automatización: cuando el estado del lead pasa a `statusValue`,
 * se crea una oportunidad en la etapa indicada.
 */
export interface LeadToDealRule {
  enabled: boolean;
  statusValue: string;
  pipelineId: string;
  stageId: string;
}

/** Registro de una entrada recibida por webhook/API (simulado). */
export interface IntakeLog {
  id: string;
  at: string;
  source: string;
  ok: boolean;
  message: string;
  contactId?: string;
  dealId?: string;
  payload?: string;
}

export interface IntakeConfig {
  /** Clave de la organización para firmar/autenticar la llamada (simulada). */
  key: string;
  logs: IntakeLog[];
}

export type TaskKind = "llamada" | "email" | "reunion" | "otro";

export interface Task {
  id: string;
  title: string;
  kind: TaskKind;
  date: string; // ISO datetime-local
  done: boolean;
  linkType?: "contact" | "deal" | "none";
  linkId?: string;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  linkType?: "contact" | "deal" | "none";
  linkId?: string;
}

export type ModuleKey = "pipeline" | "tareas" | "notas";

/**
 * ⚠️ SIMULACIÓN: tokens de restablecimiento, verificación e invitación.
 * Se generan en el navegador y viven en localStorage, así que cualquiera puede
 * leerlos o fabricarlos. En producción los emite el proveedor de autenticación
 * (Supabase Auth / Lovable Cloud, Auth0, Clerk...), viajan SOLO por email y
 * el enlace NUNCA se muestra en pantalla como se hace aquí.
 */
export type AuthTokenKind = "reset" | "verify" | "invite";

export interface AuthToken {
  token: string;
  kind: AuthTokenKind;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  /** Solo en invitaciones. */
  tenantId?: string;
  role?: TenantRole;
  invitedByName?: string;
  revokedAt?: string;
  /** Solo en reset/verify. */
  userId?: string;
}

export type NotificationKind =
  | "lead.assigned"
  | "task.assigned"
  | "task.due"
  | "note.mention";

export interface AppNotification {
  id: string;
  userId: string;
  tenantId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  at: string;
  read?: boolean;
  contactId?: string;
  dealId?: string;
  taskId?: string;
}

export interface UserPrefs {
  /** Tema propio del usuario: manda sobre el de la organización. */
  theme?: "light" | "dark" | "auto";
  density?: "comoda" | "compacta";
  pageSize?: number;
  timezone?: string;
  avatarColor?: string;
  /** Columnas visibles (y su orden) en el listado de contactos. */
  contactColumns?: string[];
}

export type BlockKey =
  | "pipeline-resumen"
  | "tareas-hoy"
  | "ultimos-contactos"
  | "actividad"
  | "numero";

export interface DashboardBlock {
  id: string;
  type: BlockKey;
  config?: { title?: string; metric?: "deals-ganados" | "valor-pipeline" | "contactos" | "tareas-pendientes" };
}

export interface Branding {
  companyName: string;
  logo: string; // emoji o URL
  brandHue: string; // oklch color
  theme: "light" | "dark";
}

export interface CrmState {
  branding: Branding;
  /**
   * Versión del esquema de datos guardado. Las migraciones puntuales se
   * aplican una sola vez comparando este número; después nunca vuelven a
   * tocar la configuración que el usuario haya elegido a propósito.
   */
  schemaVersion?: number;
  modules: Record<ModuleKey, boolean>;
  contactFields: FieldDef[];
  dealFields: FieldDef[];
  /** Embudos disponibles. Siempre hay al menos uno. */
  pipelines: Pipeline[];
  stages: Stage[];
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  blocks: DashboardBlock[];
  /** Historial de actividad de la organización. */
  events: ActivityEvent[];
  /** Vistas guardadas del listado de contactos. */
  savedViews: SavedView[];
  /** Regla de conversión automática de lead a oportunidad. */
  leadToDeal?: LeadToDealRule;
  /** Entradas por webhook/API (simuladas). */
  intake?: IntakeConfig;
}

/** Estado de una organización (tenant). Es lo que antes era el estado global. */
export type TenantState = CrmState;

export type TenantRole = "admin" | "user";

export interface Membership {
  tenantId: string;
  role: TenantRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  /**
   * ⚠️ SIMULACIÓN: contraseña en TEXTO PLANO guardada en localStorage.
   * Nunca almacenes credenciales así en una app real. Antes de producción,
   * elimina este campo y delega la autenticación en un proveedor real
   * (Supabase Auth / Lovable Cloud, Auth0, Clerk...) con hashing y sesiones
   * verificadas en servidor.
   */
  password: string;
  superAdmin?: boolean;
  memberships: Membership[];
  emailVerified?: boolean;
  prefs?: UserPrefs;
}

export interface Tenant {
  id: string;
  /** Espejo de `state.branding.companyName` (fuente de verdad). Se sincroniza en el store. */
  name: string;
  createdAt: string;
  suspended?: boolean;
  state: TenantState;
}

export interface RootState {
  tenants: Record<string, Tenant>;
  users: User[];
  currentUserId: string | null;
  currentTenantId: string | null;
  /** El super admin ha entrado a un tenant para dar soporte. */
  supportMode?: boolean;
  /** ⚠️ SIMULACIÓN: ver AuthToken. Nunca guardes tokens en el cliente. */
  tokens?: AuthToken[];
  notifications?: AppNotification[];
}