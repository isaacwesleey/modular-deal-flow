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

export type FieldRole = "title" | "amount" | "status" | "owner";

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
  | "deal.linked"
  | "deal.stage";

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
}

export interface Deal {
  id: string;
  createdAt: string;
  stageId: string;
  values: FieldValues;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
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
  modules: Record<ModuleKey, boolean>;
  contactFields: FieldDef[];
  dealFields: FieldDef[];
  stages: Stage[];
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  blocks: DashboardBlock[];
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
}