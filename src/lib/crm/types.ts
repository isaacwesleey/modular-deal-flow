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
  | "url";

export type FieldRole = "title" | "amount";

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

export interface Contact {
  id: string;
  createdAt: string;
  values: FieldValues;
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