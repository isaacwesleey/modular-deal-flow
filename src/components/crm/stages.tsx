import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { useCrm } from "@/lib/crm/store";
import { Label } from "@/components/ui/label";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Stage } from "@/lib/crm/types";

/** Paleta de colores disponibles para las etapas del pipeline. */
export const STAGE_COLORS = [
  "oklch(0.72 0.12 250)",
  "oklch(0.75 0.14 200)",
  "oklch(0.78 0.15 90)",
  "oklch(0.68 0.15 155)",
  "oklch(0.62 0.17 25)",
  "oklch(0.65 0.18 320)",
];

/**
 * Borrado de etapa con confirmación y reasignación de las oportunidades.
 * Se comparte entre Ajustes y el propio tablero Kanban.
 */
export function StageDeleteDialog({
  stage,
  trigger,
  onDeleted,
}: {
  stage: Stage;
  trigger?: ReactNode;
  onDeleted?: () => void;
}) {
  const { state, setState } = useCrm();
  const [open, setOpen] = useState(false);
  const others = state.stages.filter((s) => s.id !== stage.id);
  const count = state.deals.filter((d) => d.stageId === stage.id && !d.deletedAt).length;
  const [target, setTarget] = useState<string>(others[0]?.id ?? "__delete__");

  const confirm = () => {
    setState((s) => ({
      ...s,
      stages: s.stages.filter((x) => x.id !== stage.id),
      deals:
        target === "__delete__"
          ? s.deals.filter((d) => d.stageId !== stage.id)
          : s.deals.map((d) => (d.stageId === stage.id ? { ...d, stageId: target } : d)),
    }));
    onDeleted?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <button className="text-muted-foreground hover:text-destructive" aria-label="Borrar etapa">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar la etapa “{stage.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {count === 0
              ? "Esta etapa no tiene oportunidades."
              : `Esta etapa tiene ${count} oportunidad${count === 1 ? "" : "es"}. Elige qué hacer con ellas.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {count > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Oportunidades</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {others.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Mover a “{s.name}”
                  </SelectItem>
                ))}
                <SelectItem value="__delete__">Borrarlas también (irreversible)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Borrar etapa</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
