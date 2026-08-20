import { Button } from "@/components/ui/button";

/** Paginación compartida por los listados (contactos, tareas y notas). */
export const DEFAULT_PAGE_SIZE = 10;

export function Pagination({
  page,
  pages,
  total,
  onChange,
  label = "registros",
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        Página {page + 1} de {pages} · {total} {label}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages - 1}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
