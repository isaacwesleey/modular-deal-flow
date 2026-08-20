import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { uid } from "@/lib/crm/defaults";
import { PageHeader } from "@/components/crm/Layout";
import { RecordDialog } from "@/components/crm/RecordDialog";
import { FieldValueView } from "@/components/crm/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Contact, FieldValues } from "@/lib/crm/types";

export const Route = createFileRoute("/contactos")({
  head: () => ({
    meta: [
      { title: "Contactos — CRM Remix" },
      { name: "description", content: "Gestiona tus contactos con campos personalizables." },
      { property: "og:title", content: "Contactos — CRM Remix" },
      { property: "og:description", content: "Gestiona tus contactos con campos personalizables." },
    ],
  }),
  component: ContactosPage,
});

function ContactosPage() {
  const { state, setState } = useCrm();
  const fields = state.contactFields;
  const quick = fields.filter((f) => f.showInQuickView);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return state.contacts;
    return state.contacts.filter((c) =>
      JSON.stringify(Object.values(c.values)).toLowerCase().includes(term),
    );
  }, [q, state.contacts]);

  const save = (values: FieldValues) => {
    if (editing) {
      setState((s) => ({
        ...s,
        contacts: s.contacts.map((c) => (c.id === editing.id ? { ...c, values } : c)),
      }));
    } else {
      setState((s) => ({
        ...s,
        contacts: [{ id: uid(), createdAt: new Date().toISOString(), values }, ...s.contacts],
      }));
    }
  };

  return (
    <>
      <PageHeader
        title="Contactos"
        subtitle={`${state.contacts.length} registros · campos definidos en Ajustes`}
        action={
          <Button onClick={() => { setEditing(null); setCreating(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo contacto
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {quick.map((f) => (
                <th key={f.id} className="px-4 py-3 text-xs font-medium text-muted-foreground">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-b last:border-0 hover:bg-accent/50"
                onClick={() => setEditing(c)}
              >
                {quick.map((f) => (
                  <td key={f.id} className="px-4 py-3">
                    <FieldValueView field={f} value={c.values[f.id]} />
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">Abrir</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={quick.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                  Sin contactos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RecordDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        title={editing ? "Editar contacto" : "Nuevo contacto"}
        fields={fields}
        values={editing?.values ?? {}}
        onSave={save}
        {...(editing
          ? {
              onDelete: () =>
                setState((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== editing.id) })),
            }
          : {})}
      />
    </>
  );
}