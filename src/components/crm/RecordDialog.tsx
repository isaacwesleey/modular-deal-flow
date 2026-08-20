import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  onSave,
  onDelete,
  extra,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: FieldDef[];
  values: FieldValues;
  onSave: (v: FieldValues) => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<FieldValues>(values);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

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
              />
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete ? (
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