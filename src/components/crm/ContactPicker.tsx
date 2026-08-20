import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCrm } from "@/lib/crm/store";
import { activeContacts, recordTitle } from "@/lib/crm/roles";

/** Selector buscable de contacto para vincular oportunidades (relación real por id). */
export function ContactPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const { state } = useCrm();
  const [open, setOpen] = useState(false);
  const contacts = activeContacts(state);
  const selected = state.contacts.find((c) => c.id === value);
  const label = selected
    ? recordTitle(state.contactFields, selected.values, "Sin nombre")
    : "Sin contacto vinculado";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={selected ? "" : "text-muted-foreground"}>{label}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar contacto..." />
          <CommandList>
            <CommandEmpty>Ningún contacto coincide.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="sin-contacto"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check className={`mr-2 h-4 w-4 ${value ? "opacity-0" : ""}`} />
                Sin contacto vinculado
              </CommandItem>
              {contacts.map((c) => {
                const name = recordTitle(state.contactFields, c.values, "Sin nombre");
                return (
                  <CommandItem
                    key={c.id}
                    value={`${name} ${c.id}`}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={`mr-2 h-4 w-4 ${value === c.id ? "" : "opacity-0"}`} />
                    {name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
