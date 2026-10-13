import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { MultiSelectFilterProps } from "./contracts"

export function MultiSelectFilter({ label, options, value, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`${label}${value.length ? `, ${value.length} selecionado(s)` : ", todos"}`}
          className="h-10 gap-2 bg-card px-3 text-base font-normal"
        >
          <span>{label}</span>
          {value.length > 0 && (
            <span className="num rounded-full bg-brand-soft px-2 text-sm font-semibold text-brand-ink">
              {value.length}
            </span>
          )}
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={`Buscar em ${label.toLowerCase()}`} className="text-base" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = value.includes(opt)
                return (
                  <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)} className="min-h-10 gap-2 text-base">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border border-input bg-card",
                        checked && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {checked && <Check className="size-3.5" />}
                    </span>
                    <span className="flex-1">{opt}</span>
                    <span className="sr-only">{checked ? "selecionado" : "não selecionado"}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {value.length > 0 && (
          <div className="border-t p-1">
            <Button variant="ghost" className="h-9 w-full text-base" onClick={() => onChange([])}>
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
