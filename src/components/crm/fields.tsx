import { Input } from "@/components/ui/input";
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

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = value === undefined || value === null ? "" : String(value);

  switch (field.type) {
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
      );
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const opts = field.options ?? [];
      return (
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
          {!opts.length && <p className="text-xs text-muted-foreground">Define opciones en Ajustes.</p>}
        </div>
      );
    }
    default:
      return <Input value={str} onChange={(e) => onChange(e.target.value)} />;
  }
}