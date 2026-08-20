import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  Download,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { uid } from "@/lib/crm/defaults";
import { useContacts } from "@/lib/crm/useContacts";
import {
  activeContacts,
  ownerField,
  statusField,
  trashDaysLeft,
  trashedContacts,
} from "@/lib/crm/roles";
import { downloadCsv, parseCsv, toCsv } from "@/lib/crm/csv";
import { PageHeader } from "@/components/crm/Layout";
import { RecordDialog } from "@/components/crm/RecordDialog";
import { FieldValueView, formatValue } from "@/components/crm/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Contact, FieldValues, SavedView } from "@/lib/crm/types";

export const Route = createFileRoute("/contactos/")({
  head: () => ({
    meta: [
      { title: "Contactos — CRM Remix" },
      { name: "description", content: "Busca, filtra, importa y organiza todos tus leads." },
      { property: "og:title", content: "Contactos — CRM Remix" },
      { property: "og:description", content: "Busca, filtra, importa y organiza todos tus leads." },
    ],
  }),
  component: ContactosPage,
});

const PAGE_SIZE = 10;

function ContactosPage() {
  const { state, setState, user, tenantUsers } = useCrm();
  const contactsApi = useContacts();
  const navigate = useNavigate();
  const fields = state.contactFields;
  const quick = fields.filter((f) => f.showInQuickView);
  const status = statusField(fields);
  const owner = ownerField(fields);
  const emailField = fields.find((f) => f.type === "email");
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"activos" | "papelera">("activos");
  const [q, setQ] = useState("");
  const [filterField, setFilterField] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [sortBy, setSortBy] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [dupes, setDupes] = useState<{ rows: FieldValues[]; dupes: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const emptyValues = useMemo<FieldValues>(() => ({}), []);

  const base = tab === "activos" ? activeContacts(state) : trashedContacts(state);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    let list = base.filter((c) => {
      if (term) {
        const hay = fields
          .map((f) => formatValue(f, c.values[f.id]))
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (filterField !== "all" && filterValue.trim()) {
        const v = formatValue(
          fields.find((f) => f.id === filterField)!,
          c.values[filterField],
        ).toLowerCase();
        if (!v.includes(filterValue.toLowerCase().trim())) return false;
      }
      return true;
    });
    if (sortBy) {
      const f = fields.find((x) => x.id === sortBy);
      if (f) {
        list = [...list].sort((a, b) => {
          const av = formatValue(f, a.values[f.id]);
          const bv = formatValue(f, b.values[f.id]);
          return sortDir === "asc" ? av.localeCompare(bv, "es") : bv.localeCompare(av, "es");
        });
      }
    }
    return list;
  }, [base, q, filterField, filterValue, sortBy, sortDir, fields]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const myViews = state.savedViews.filter((v) => v.userId === (user?.id ?? ""));

  const applyView = (v: SavedView) => {
    setQ(v.query);
    setFilterField(v.filters[0]?.fieldId ?? "all");
    setFilterValue(v.filters[0]?.value ?? "");
    setSortBy(v.sortBy ?? "");
    setSortDir(v.sortDir ?? "asc");
    setPage(0);
  };

  const saveView = () => {
    const name = window.prompt("Nombre de la vista");
    if (!name?.trim() || !user) return;
    const view: SavedView = {
      id: uid(),
      name: name.trim(),
      userId: user.id,
      query: q,
      filters: filterField !== "all" && filterValue ? [{ fieldId: filterField, value: filterValue }] : [],
      ...(sortBy ? { sortBy, sortDir } : {}),
    };
    setState((s) => ({ ...s, savedViews: [...s.savedViews, view] }));
    toast.success("Vista guardada");
  };

  const toggleSort = (fieldId: string) => {
    if (sortBy === fieldId) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(fieldId);
      setSortDir("asc");
    }
  };

  /** Texto exportable: sin guiones de relleno y con nombres legibles de usuario. */
  const csvCell = (fieldId: string, type: string, raw: unknown): string => {
    if (raw === undefined || raw === null || raw === "") return "";
    if (type === "user") return contactsApi.userName(raw);
    const f = fields.find((x) => x.id === fieldId)!;
    const text = formatValue(f, raw);
    return text === "—" ? "" : text;
  };

  const exportCsv = () => {
    const header = fields.map((f) => f.label);
    const body = filtered.map((c) => fields.map((f) => csvCell(f.id, f.type, c.values[f.id])));
    downloadCsv("contactos.csv", toCsv([header, ...body]));
    toast.success(`${filtered.length} contactos exportados`);
  };

  const emailsInUse = useMemo(() => {
    if (!emailField) return new Set<string>();
    return new Set(
      activeContacts(state)
        .map((c) => String(c.values[emailField.id] ?? "").toLowerCase())
        .filter(Boolean),
    );
  }, [state, emailField]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const table = parseCsv(text);
    if (table.length < 2) {
      toast.error("El archivo no contiene filas");
      return;
    }
    const header = table[0]!.map((h) => h.trim().toLowerCase());
    // Mapeo de columnas del CSV a los campos personalizados por etiqueta o id.
    const map = fields.map((f) => ({
      field: f,
      index: header.findIndex((h) => h === f.label.toLowerCase() || h === f.id.toLowerCase()),
    }));
    const parsed: FieldValues[] = table.slice(1).map((r) => {
      const values: FieldValues = {};
      for (const m of map) {
        if (m.index < 0) continue;
        const raw = (r[m.index] ?? "").trim();
        if (!raw) continue;
        values[m.field.id] =
          m.field.type === "user"
            ? (tenantUsers.find((u) => u.name.toLowerCase() === raw.toLowerCase())?.id ?? "")
            : m.field.type === "number" || m.field.type === "currency"
            ? Number(raw.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0
            : m.field.type === "multiselect"
              ? raw.split(/[,;]/).map((x) => x.trim()).filter(Boolean)
              : m.field.type === "checkbox"
                ? /^(sí|si|true|1)$/i.test(raw)
                : raw;
      }
      return values;
    });
    const dupCount = emailField
      ? parsed.filter((v) => emailsInUse.has(String(v[emailField.id] ?? "").toLowerCase())).length
      : 0;
    setDupes({ rows: parsed, dupes: dupCount });
  };

  const runImport = (skipDupes: boolean) => {
    if (!dupes) return;
    const list = skipDupes && emailField
      ? dupes.rows.filter((v) => !emailsInUse.has(String(v[emailField.id] ?? "").toLowerCase()))
      : dupes.rows;
    list.forEach((v) => contactsApi.create(v));
    toast.success(`${list.length} contactos importados`);
    setDupes(null);
  };

  const create = (values: FieldValues) => {
    if (emailField) {
      const mail = String(values[emailField.id] ?? "").toLowerCase();
      if (mail && emailsInUse.has(mail)) {
        toast.warning("Ya existe un contacto con ese email. Se ha creado igualmente como duplicado.");
      }
    }
    const c = contactsApi.create(values);
    toast.success("Contacto creado");
    navigate({ to: "/contactos/$id", params: { id: c.id } });
  };

  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <>
      <PageHeader
        title="Contactos"
        subtitle={`${activeContacts(state).length} leads · campos definidos en Ajustes`}
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" /> Exportar
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo contacto
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setSelected([]); setPage(0); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="papelera">
            Papelera{trashedContacts(state).length ? ` (${trashedContacts(state).length})` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Buscar en todos los campos..."
            className="pl-9"
          />
        </div>
        <Select value={filterField} onValueChange={(v) => { setFilterField(v); setPage(0); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los campos</SelectItem>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterField !== "all" && (
          <Input
            value={filterValue}
            onChange={(e) => { setFilterValue(e.target.value); setPage(0); }}
            placeholder="Valor del filtro"
            className="w-44"
          />
        )}
        {tab === "activos" && (
          <>
            <Button variant="outline" size="sm" onClick={saveView}>
              Guardar vista
            </Button>
            {myViews.map((v) => (
              <Badge
                key={v.id}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => applyView(v)}
                onDoubleClick={() =>
                  setState((s) => ({ ...s, savedViews: s.savedViews.filter((x) => x.id !== v.id) }))
                }
              >
                {v.name}
              </Badge>
            ))}
          </>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selected.length} seleccionados</span>
          {tab === "activos" ? (
            <>
              {status && (
                <Select onValueChange={(v) => { contactsApi.setStatus(selected, v); setSelected([]); }}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue placeholder="Cambiar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {(status.options ?? []).map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {owner && (
                <Select onValueChange={(v) => { contactsApi.setOwner(selected, v); setSelected([]); }}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue placeholder="Asignar propietario" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Eliminar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => { contactsApi.restore(selected); setSelected([]); toast.success("Restaurados"); }}>
                <RotateCcw className="mr-1 h-4 w-4" /> Restaurar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { contactsApi.purge(selected); setSelected([]); toast.success("Borrado definitivo"); }}>
                <Trash2 className="mr-1 h-4 w-4" /> Borrar definitivamente
              </Button>
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) =>
                    setSelected(v ? Array.from(new Set([...selected, ...rows.map((r) => r.id)])) : [])
                  }
                />
              </th>
              {quick.map((f) => (
                <th key={f.id} className="px-4 py-3 text-xs font-medium text-muted-foreground">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort(f.id)}
                  >
                    {f.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                quick={quick}
                trashed={tab === "papelera"}
                checked={selected.includes(c.id)}
                onCheck={(v) =>
                  setSelected((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))
                }
                onOpen={() => navigate({ to: "/contactos/$id", params: { id: c.id } })}
              />
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={quick.length + 2} className="px-4 py-12 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">
                    {tab === "papelera"
                      ? "La papelera está vacía"
                      : q || filterValue
                        ? "Ningún lead coincide con la búsqueda"
                        : "Todavía no hay leads"}
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {tab === "papelera"
                      ? "Lo que elimines aparecerá aquí durante 30 días."
                      : q || filterValue
                        ? "Prueba con otros términos o limpia los filtros."
                        : "Crea el primero o impórtalos desde un CSV."}
                  </p>
                  {tab === "activos" &&
                    (q || filterValue ? (
                      <Button variant="outline" onClick={() => { setQ(""); setFilterField("all"); setFilterValue(""); }}>
                        Limpiar filtros
                      </Button>
                    ) : (
                      <Button onClick={() => setCreating(true)}>
                        <Plus className="mr-1 h-4 w-4" /> Nuevo contacto
                      </Button>
                    ))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {current + 1} de {pages} · {filtered.length} registros
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <RecordDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nuevo contacto"
        fields={fields}
        values={emptyValues}
        recordId="nuevo"
        onSave={create}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selected.length} contactos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se moverán a la papelera y podrás restaurarlos durante 30 días.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                contactsApi.remove(selected);
                setSelected([]);
                toast.success("Movidos a la papelera");
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!dupes} onOpenChange={(o) => !o && setDupes(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar {dupes?.rows.length ?? 0} contactos</AlertDialogTitle>
            <AlertDialogDescription>
              {dupes?.dupes
                ? `${dupes.dupes} de estas filas tienen un email que ya existe. Puedes omitirlas o importarlas igualmente.`
                : "No se han detectado duplicados por email."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!!dupes?.dupes && (
              <Button variant="outline" onClick={() => runImport(true)}>
                Omitir duplicados
              </Button>
            )}
            <AlertDialogAction onClick={() => runImport(false)}>Importar todo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ContactRow({
  contact,
  quick,
  trashed,
  checked,
  onCheck,
  onOpen,
}: {
  contact: Contact;
  quick: { id: string; label: string }[];
  trashed: boolean;
  checked: boolean;
  onCheck: (v: boolean) => void;
  onOpen: () => void;
}) {
  const { state } = useCrm();
  const fields = state.contactFields;
  return (
    <tr className="border-b last:border-0 hover:bg-accent/50">
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={checked} onCheckedChange={(v) => onCheck(Boolean(v))} />
      </td>
      {quick.map((qf) => {
        const f = fields.find((x) => x.id === qf.id)!;
        return (
          <td key={qf.id} className="cursor-pointer px-4 py-3" onClick={onOpen}>
            <FieldValueView field={f} value={contact.values[qf.id]} />
          </td>
        );
      })}
      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
        {trashed && contact.deletedAt ? (
          <span>{trashDaysLeft(contact.deletedAt)} días</span>
        ) : (
          <button type="button" className="hover:text-foreground" onClick={onOpen}>
            Abrir ficha
          </button>
        )}
      </td>
    </tr>
  );
}
