import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { activeContacts, recordTitle } from "@/lib/crm/roles";
import { uid } from "@/lib/crm/defaults";
import { ModuleOff, PageHeader } from "@/components/crm/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/notas")({
  head: () => ({
    meta: [
      { title: "Notas — Ventia" },
      { name: "description", content: "Timeline cronológico de notas asociadas a contactos y oportunidades." },
      { property: "og:title", content: "Notas — Ventia" },
      { property: "og:description", content: "Timeline cronológico de notas asociadas a contactos y oportunidades." },
    ],
  }),
  component: NotasPage,
});

function NotasPage() {
  const { state, setState, logEvents } = useCrm();
  const [text, setText] = useState("");
  const [link, setLink] = useState("none:");

  if (!state.modules.notas) return <ModuleOff name="Notas" />;

  const add = () => {
    if (!text.trim()) return;
    const [type, id] = link.split(":");
    setState((s) => ({
      ...s,
      notes: [
        {
          id: uid(),
          text: text.trim(),
          createdAt: new Date().toISOString(),
          linkType: (type ?? "none") as "contact" | "deal" | "none",
          linkId: id ?? "",
        },
        ...s.notes,
      ],
    }));
    setText("");
  };

  const label = (t?: string, id?: string) => {
    if (t === "contact") {
      const c = activeContacts(state).find((x) => x.id === id);
      return c ? `👤 ${recordTitle(state.contactFields, c.values, "Sin nombre")}` : "";
    }
    if (t === "deal") {
      const d = state.deals.find((x) => x.id === id);
      return d ? `💼 ${recordTitle(state.dealFields, d.values)}` : "";
    }
    return "";
  };

  const sorted = [...state.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader title="Notas" subtitle="Todo lo que pasa, en orden cronológico." />

      <div className="mb-6 rounded-xl border bg-card p-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe una nota..."
          rows={3}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={link} onValueChange={setLink}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none:">Sin asociar</SelectItem>
              {activeContacts(state).map((c) => (
                <SelectItem key={c.id} value={`contact:${c.id}`}>
                  👤 {recordTitle(state.contactFields, c.values, "Sin nombre")}
                </SelectItem>
              ))}
              {state.modules.pipeline &&
                state.deals.map((d) => (
                  <SelectItem key={d.id} value={`deal:${d.id}`}>
                    💼 {recordTitle(state.dealFields, d.values)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={add} className="ml-auto">
            Añadir nota
          </Button>
        </div>
      </div>

      <ol className="relative space-y-4 border-l pl-6">
        {sorted.map((n) => (
          <li key={n.id} className="group relative">
            <span className="absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <div className="rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(n.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</span>
                {label(n.linkType, n.linkId) && <span>· {label(n.linkType, n.linkId)}</span>}
                <button
                  onClick={() => {
                    setState((s) => ({ ...s, notes: s.notes.filter((x) => x.id !== n.id) }));
                    logEvents([
                      {
                        type: "note.deleted",
                        noteId: n.id,
                        ...(n.linkType === "contact" && n.linkId ? { contactId: n.linkId } : {}),
                        text: n.text,
                      },
                    ]);
                  }}
                  className="ml-auto opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Borrar nota"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-sm">{n.text}</p>
            </div>
          </li>
        ))}
        {!sorted.length && <p className="text-sm text-muted-foreground">Aún no hay notas.</p>}
      </ol>
    </>
  );
}