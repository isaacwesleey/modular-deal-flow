import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  Download,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
  Users,
} from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { uid } from "@/lib/crm/defaults";
import { useContacts } from "@/lib/crm/useContacts";
import {
  activeContacts,
  emailField as emailRoleField,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import type { Contact, FieldValues, SavedView } from "@/lib/crm/types";

export const Route = createFileRoute("/contactos/")({
  head: () => ({
    meta: [
      { title: "Contactos — Ventia" },
      { name: "description", content: "Busca, filtra, importa y organiza todos tus leads." },
      { property: "og:title", content: "Contactos — Ventia" },
      { property: "og:description", content: "Busca, filtra, importa y organiza todos tus leads." },
    ],
  }),
  component: ContactosPage,
});

const DEFAULT_PAGE_SIZE = 10;

function ContactosPage() {
  const { state, setState, user, tenantUsers } = useCrm();
  const contactsApi = useContacts();
  const navigate = useNavigate();
  const fields = state.contactFields;
  const quick = fields.filter((f) => f.showInQuickView);
  const status = statusField(fields);
  const owner = ownerField(fields);
  const emailField = emailRoleField(fields);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"activos" | "papelera">("activos");
  const [q, setQ] = useState("");
  // Varios filtros combinables a la vez (todos deben cumplirse).
  const [filters, setFilters] = useState<{ fieldId: string; value: string }[]>([]);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [draftValues, setDraftValues] = useState<FieldValues>({});
  const [draftKey, setDraftKey] = useState("nuevo");
  /** Aviso de duplicado ANTES de guardar el contacto. */
  const [dupWarn, setDupWarn] = useState<{ values: FieldValues; existing: Contact } | null>(null);
  const [dupes, setDupes] = useState<{
    rows: FieldValues[];
    existing: number;
    inside: number;
  } | null>(null);
  const [viewDialog, setViewDialog] = useState<{ id?: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeFilters = useMemo(
    () => filters.filter((f) => f.fieldId && f.value.trim()),
    [filters],
  );
  const hasQuery = Boolean(q.trim() || activeFilters.length);

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
      for (const flt of activeFilters) {
        const f = fields.find((x) => x.id === flt.fieldId);
        if (!f) continue;
        const v = formatValue(f, c.values[f.id]).toLowerCase();
        if (!v.includes(flt.value.toLowerCase().trim())) return false;
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
  }, [base, q, activeFilters, sortBy, sortDir, fields]);

  const PAGE_SIZE = user?.prefs?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const myViews = state.savedViews.filter((v) => v.userId === (user?.id ?? ""));

  const applyView = (v: SavedView) => {
    setQ(v.query);
    setFilters(v.filters.map((f) => ({ ...f })));
    setSortBy(v.sortBy ?? "");
    setSortDir(v.sortDir ?? "asc");
    setPage(0);
  };

  /** Crea o renombra una vista desde el diálogo propio (sin prompt del navegador). */
  const submitView = () => {
    if (!viewDialog || !viewDialog.name.trim() || !user) return;
    const name = viewDialog.name.trim();
    if (viewDialog.id) {
      const id = viewDialog.id;
      setState((s) => ({
        ...s,
        savedViews: s.savedViews.map((v) => (v.id === id ? { ...v, name } : v)),
      }));
      toast.success("Vista renombrada");
    } else {
      const view: SavedView = {
        id: uid(),
        name,
        userId: user.id,
        query: q,
        filters: activeFilters.map((f) => ({ ...f })),
        ...(sortBy ? { sortBy, sortDir } : {}),
      };
      setState((s) => ({ ...s, savedViews: [...s.savedViews, view] }));
      toast.success("Vista guardada");
    }
    setViewDialog(null);
  };

  const deleteView = (id: string) => {
    setState((s) => ({ ...s, savedViews: s.savedViews.filter((v) => v.id !== id) }));
    toast.success("Vista eliminada");
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
    // Duplicados contra los contactos existentes y también dentro del propio CSV.
    let existing = 0;
    let inside = 0;
    if (emailField) {
      const seen = new Set<string>();
      for (const v of parsed) {
        const mail = String(v[emailField.id] ?? "").toLowerCase();
        if (!mail) continue;
        if (emailsInUse.has(mail)) existing += 1;
        else if (seen.has(mail)) inside += 1;
        seen.add(mail);
      }
    }
    setDupes({ rows: parsed, existing, inside });
  };

  const runImport = (skipDupes: boolean) => {
    if (!dupes) return;
    let list = dupes.rows;
    if (skipDupes && emailField) {
      const seen = new Set<string>();
      list = dupes.rows.filter((v) => {
        const mail = String(v[emailField.id] ?? "").toLowerCase();
        if (!mail) return true;
        if (emailsInUse.has(mail) || seen.has(mail)) return false;
        seen.add(mail);
        return true;
      });
    }
    list.forEach((v) => contactsApi.create(v));
    toast.success(`${list.length} contactos importados`);
    setDupes(null);
  };

  const doCreate = (values: FieldValues) => {
    const c = contactsApi.create(values);
    toast.success("Contacto creado");
    navigate({ to: "/contactos/$id", params: { id: c.id } });
  };

  /** Antes de guardar: si el email ya existe, se avisa y se deja elegir. */
  const create = (values: FieldValues) => {
    if (emailField) {
      const mail = String(values[emailField.id] ?? "").trim().toLowerCase();
      const existing = mail
        ? activeContacts(state).find(
            (c) => String(c.values[emailField.id] ?? "").toLowerCase() === mail,
          )
        : undefined;
      if (existing) {
        setDraftValues(values);
        setDupWarn({ values, existing });
        return;
      }
    }
    doCreate(values);
  };

  const openCreate = () => {
    setDraftValues({});
    setDraftKey(uid());
    setCreating(true);
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
            <Button onClick={openCreate}>
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

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Buscar en todos los campos..."
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters((f) => [...f, { fieldId: fields[0]?.id ?? "", value: "" }])}
        >
          <Plus className="mr-1 h-4 w-4" /> Añadir filtro
        </Button>
        {tab === "activos" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDialog({ name: "" })}
              disabled={!hasQuery}
            >
              Guardar vista
            </Button>
            {myViews.map((v) => (
              <span key={v.id} className="inline-flex items-center">
                <Badge
                  variant="secondary"
                  className="cursor-pointer rounded-r-none"
                  onClick={() => applyView(v)}
                >
                  {v.name}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={`Opciones de la vista ${v.name}`}
                      className="rounded-r-md bg-secondary px-1.5 py-1 text-secondary-foreground hover:bg-secondary/70"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => applyView(v)}>Aplicar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewDialog({ id: v.id, name: v.name })}>
                      Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteView(v.id)}
                    >
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            ))}
          </>
        )}
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((flt, i) => (
              <div key={i} className="flex items-center gap-1 rounded-lg border bg-card p-1">
                <Select
                  value={flt.fieldId}
                  onValueChange={(v) => {
                    setFilters((list) => list.map((x, j) => (j === i ? { ...x, fieldId: v } : x)));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-8 w-40 border-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={flt.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters((list) => list.map((x, j) => (j === i ? { ...x, value } : x)));
                    setPage(0);
                  }}
                  placeholder="Contiene..."
                  className="h-8 w-40 border-0 shadow-none focus-visible:ring-0"
                />
                <button
                  aria-label="Quitar filtro"
                  className="px-1 text-muted-foreground hover:text-destructive"
                  onClick={() => setFilters((list) => list.filter((_, j) => j !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
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
                      : hasQuery
                        ? "Ningún lead coincide con la búsqueda"
                        : "Todavía no hay leads"}
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {tab === "papelera"
                      ? "Lo que elimines aparecerá aquí durante 30 días."
                      : hasQuery
                        ? "Prueba con otros términos o limpia los filtros."
                        : "Crea el primero o impórtalos desde un CSV."}
                  </p>
                  {tab === "activos" &&
                    (hasQuery ? (
                      <Button variant="outline" onClick={() => { setQ(""); setFilters([]); }}>
                        Limpiar filtros
                      </Button>
                    ) : (
                      <Button onClick={openCreate}>
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
        values={draftValues}
        recordId={draftKey}
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
              {dupes && (dupes.existing || dupes.inside)
                ? [
                    dupes.existing
                      ? `${dupes.existing} filas tienen un email que ya existe en tu CRM.`
                      : "",
                    dupes.inside
                      ? `${dupes.inside} filas están repetidas dentro del propio archivo.`
                      : "",
                    "Puedes omitirlas o importarlas igualmente.",
                  ]
                    .filter(Boolean)
                    .join(" ")
                : "No se han detectado duplicados por email."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!!dupes && (dupes.existing > 0 || dupes.inside > 0) && (
              <Button variant="outline" onClick={() => runImport(true)}>
                Omitir duplicados
              </Button>
            )}
            <AlertDialogAction onClick={() => runImport(false)}>Importar todo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aviso de duplicado ANTES de guardar el contacto creado a mano. */}
      <AlertDialog open={!!dupWarn} onOpenChange={(o) => !o && setDupWarn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ese email ya está en uso</AlertDialogTitle>
            <AlertDialogDescription>
              {dupWarn && emailField ? (
                <>
                  “{String(dupWarn.existing.values[fields.find((f) => f.role === "title")?.id ?? ""] ?? "Contacto")}
                  ” ya usa {String(dupWarn.values[emailField.id] ?? "")}. ¿Qué quieres hacer?
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDupWarn(null);
                setCreating(true);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                const target = dupWarn!.existing.id;
                setDupWarn(null);
                navigate({ to: "/contactos/$id", params: { id: target } });
              }}
            >
              Abrir el existente
            </Button>
            <AlertDialogAction
              onClick={() => {
                const values = dupWarn!.values;
                setDupWarn(null);
                doCreate(values);
              }}
            >
              Crear igualmente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo propio para nombrar o renombrar vistas guardadas. */}
      <Dialog open={!!viewDialog} onOpenChange={(o) => !o && setViewDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{viewDialog?.id ? "Renombrar vista" : "Guardar vista"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input
              autoFocus
              value={viewDialog?.name ?? ""}
              onChange={(e) => setViewDialog((v) => (v ? { ...v, name: e.target.value } : v))}
              onKeyDown={(e) => e.key === "Enter" && submitView()}
              placeholder="Leads calientes de Madrid"
            />
            {!viewDialog?.id && (
              <p className="pt-1 text-xs text-muted-foreground">
                Se guardarán la búsqueda, {activeFilters.length} filtro
                {activeFilters.length === 1 ? "" : "s"} y la ordenación actual.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={submitView} disabled={!viewDialog?.name.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
