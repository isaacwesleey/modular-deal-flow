import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrm } from "@/lib/crm/store";
import type { FieldDef } from "@/lib/crm/types";

export function formatValue(field: FieldDef, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  switch (field.type) {
    case "currency":
      return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
        Number(value) || 0,
      );
    case "checkbox":
      return value ? "Sí" : "No";
    case "multiselect":
      return Array.isArray(value) ? value.join(", ") || "—" : String(value);
    case "date":
      try {
        return new Date(String(value)).toLocaleDateString("es-ES");
      } catch {
        return String(value);
      }
    default:
      return String(value);
  }
}

export function FieldValueView({ field, value }: { field: FieldDef; value: unknown }) {
  if (field.type === "user") return <UserValue value={value} />;
  if (field.type === "multiselect" && Array.isArray(value) && value.length) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v) => (
          <Badge key={String(v)} variant="secondary" className="text-[11px]">
            {String(v)}
          </Badge>
        ))}
      </div>
    );
  }
  return <span className="text-sm">{formatValue(field, value)}</span>;
}

function UserValue({ value }: { value: unknown }) {
  const { root } = useCrm();
  const id = String(value ?? "");
  const found = root.users.find((u) => u.id === id);
  if (!found) return <span className="text-sm text-muted-foreground">Sin asignar</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {found.name.charAt(0).toUpperCase()}
      </span>
      {found.name}
    </span>
  );
}

export function UserFieldInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { tenantUsers } = useCrm();
  const str = String(value ?? "");
  return (
    <Select value={str || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Sin asignar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin asignar</SelectItem>
        {tenantUsers.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
  entity,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  /** Necesario para poder crear opciones nuevas sobre la marcha. */
  entity?: "contactFields" | "dealFields";
}) {
  const str = value === undefined || value === null ? "" : String(value);

  switch (field.type) {
    case "user":
      return <UserFieldInput value={value} onChange={onChange} />;
    case "textarea":
      return <Textarea value={str} onChange={(e) => onChange(e.target.value)} rows={3} />;
    case "number":
    case "currency":
      return (
        <Input
          type="number"
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "date":
      return <Input type="date" value={str} onChange={(e) => onChange(e.target.value)} />;
    case "email":
      return <Input type="email" value={str} onChange={(e) => onChange(e.target.value)} />;
    case "phone":
      return <Input type="tel" value={str} onChange={(e) => onChange(e.target.value)} />;
    case "url":
      return <Input type="url" placeholder="https://" value={str} onChange={(e) => onChange(e.target.value)} />;
    case "checkbox":
      return (
        <Checkbox checked={Boolean(value)} onCheckedChange={(c) => onChange(Boolean(c))} />
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <Select {...(str ? { value: str } : {})} onValueChange={(v) => onChange(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {entity && (
            <NewOption
              entity={entity}
              field={field}
              onCreated={(o) => onChange(o)}
              placeholder="Nueva opción"
            />
          )}
        </div>
      );
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const opts = field.options ?? [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {opts.map((o) => {
            const on = arr.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                }`}
              >
                {o}
              </button>
            );
            })}
            {!opts.length && !entity && (
              <p className="text-xs text-muted-foreground">Define opciones en Ajustes.</p>
            )}
          </div>
          {entity && (
            <NewOption
              entity={entity}
              field={field}
              onCreated={(o) => onChange([...arr, o])}
              placeholder="Nueva etiqueta"
            />
          )}
        </div>
      );
    }
    default:
      return <Input value={str} onChange={(e) => onChange(e.target.value)} />;
  }
}

/**
 * Alta de opciones al vuelo: escribe una etiqueta nueva y queda disponible
 * para el resto de registros, sin pasar por Ajustes.
 */
function NewOption({
  entity,
  field,
  onCreated,
  placeholder,
}: {
  entity: "contactFields" | "dealFields";
  field: FieldDef;
  onCreated: (option: string) => void;
  placeholder: string;
}) {
  const { addFieldOption } = useCrm();
  const [text, setText] = useState("");

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    const exists = (field.options ?? []).some((o) => o.toLowerCase() === value.toLowerCase());
    const final = exists ? (field.options ?? []).find((o) => o.toLowerCase() === value.toLowerCase())! : value;
    if (!exists) addFieldOption(entity, field.id, value);
    onCreated(final);
    setText("");
  };

  return (
    <div className="flex gap-1.5">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
      <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={submit} disabled={!text.trim()}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}