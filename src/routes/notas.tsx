import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useDeferredValue } from "react";
import { Trash2, Search } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { activeContacts, recordTitle, activeDeals } from "@/lib/crm/roles";
import { uid } from "@/lib/crm/defaults";
import { ModuleOff, PageHeader } from "@/components/crm/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DEFAULT_PAGE_SIZE, Pagination } from "@/components/crm/Pagination";
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
  const { state, setState, logEvents, user } = useCrm();
  const [q, setQ] = useState("");
  // Filtrar sobre un valor diferido mantiene el tecleo fluido con miles de filas.
  const dq = useDeferredValue(q);
  const [page, setPage] = useState(0);
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
      const d = activeDeals(state).find((x) => x.id === id);
      return d ? `💼 ${recordTitle(state.dealFields, d.values)}` : "";
    }
    return "";
  };

  const sorted = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    const list = needle
      ? state.notes.filter(
          (n) =>
            n.text.toLowerCase().includes(needle) ||
            label(n.linkType, n.linkId).toLowerCase().includes(needle),
        )
      : [...state.notes];
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.notes, state.contacts, state.deals, dq]);

  const PAGE_SIZE = user?.prefs?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const paged = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

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
                activeDeals(state).map((d) => (
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

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar notas..."
          className="pl-9"
        />
      </div>

      <ol className="relative space-y-4 border-l pl-6">
        {paged.map((n) => (
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
        {!sorted.length && (
          <p className="text-sm text-muted-foreground">
            {q ? "Ninguna nota coincide con la búsqueda." : "Aún no hay notas."}
          </p>
        )}
      </ol>

      <Pagination
        page={current}
        pages={pages}
        total={sorted.length}
        onChange={setPage}
        label="notas"
      />
    </>
  );
}