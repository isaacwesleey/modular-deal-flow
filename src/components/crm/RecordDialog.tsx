import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldInput } from "./fields";
import type { FieldDef, FieldValues } from "@/lib/crm/types";

export function RecordDialog({
  open,
  onOpenChange,
  title,
  fields,
  values,
  recordId,
  onSave,
  onDelete,
  deleteConfirm,
  extra,
  entity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: FieldDef[];
  values: FieldValues;
  /** id del registro editado (o undefined al crear). Sincroniza el borrador al cambiar. */
  recordId?: string;
  onSave: (v: FieldValues) => void;
  onDelete?: () => void;
  /** Texto de confirmación previo al borrado (si se omite, borra directamente). */
  deleteConfirm?: string;
  extra?: React.ReactNode;
  /** Permite crear opciones de selector/etiquetas al vuelo. */
  entity?: "contactFields" | "dealFields";
}) {
  const [draft, setDraft] = useState<FieldValues>(values);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Solo se sincroniza al abrir el diálogo o al cambiar de registro,
  // nunca en cada render (values puede ser un objeto nuevo cada vez).
  useEffect(() => {
    if (open) setDraft({ ...valuesRef.current });
  }, [open, recordId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {extra}
          {fields.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
              <FieldInput
                field={f}
                value={draft[f.id]}
                onChange={(v) => setDraft((d) => ({ ...d, [f.id]: v }))}
                {...(entity ? { entity } : {})}
              />
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete && deleteConfirm ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive">
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                  <AlertDialogDescription>{deleteConfirm}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete();
                      onOpenChange(false);
                    }}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : onDelete ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
            >
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}