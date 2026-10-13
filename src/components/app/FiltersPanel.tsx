import { useState } from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import {
  clearFilter,
  dateBounds,
  filterOptions,
  type Column,
  type ColumnFilter,
  type Sheet,
  type SheetFilters,
} from "@/core"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet as Drawer,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function ValuesFilter({
  sheet,
  column,
  filter,
  onChange,
}: {
  sheet: Sheet
  column: Column
  filter: Extract<ColumnFilter, { kind: "values" }> | undefined
  onChange: (next: ColumnFilter | null) => void
}) {
  const [open, setOpen] = useState(false)
  const options = filterOptions(sheet, column.key)
  const selected = filter?.values ?? []

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(next.length ? { kind: "values", values: next } : null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between text-base"
        >
          <span className="truncate">
            {selected.length === 0
              ? "Todos"
              : selected.length === 1
                ? selected[0]
                : `${selected.length} selecionados`}
          </span>
          <ChevronsUpDownIcon className="size-4 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={`Buscar em ${column.label}`} />
          <CommandList>
            <CommandEmpty>Nenhum valor encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((value) => {
                const on = selected.includes(value)
                return (
                  <CommandItem
                    key={value}
                    value={value}
                    onSelect={() => toggle(value)}
                    className="text-base"
                  >
                    <CheckIcon
                      className={cn("size-4", on ? "opacity-100" : "opacity-0")}
                      aria-hidden
                    />
                    <span>{value}</span>
                    {on && <span className="sr-only">(selecionado)</span>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function DateFilter({
  sheet,
  column,
  filter,
  onChange,
}: {
  sheet: Sheet
  column: Column
  filter: Extract<ColumnFilter, { kind: "dateRange" }> | undefined
  onChange: (next: ColumnFilter | null) => void
}) {
  const bounds = dateBounds(sheet, column.key)
  const from = filter?.from ?? ""
  const to = filter?.to ?? ""

  function update(nextFrom: string, nextTo: string) {
    onChange(
      nextFrom || nextTo
        ? { kind: "dateRange", from: nextFrom || null, to: nextTo || null }
        : null
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${column.key}-de`} className="text-base font-normal">
          De
        </Label>
        <Input
          id={`${column.key}-de`}
          type="date"
          className="h-11 text-base"
          value={from}
          min={bounds?.min}
          max={to || bounds?.max}
          onChange={(e) => update(e.target.value, to)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${column.key}-ate`} className="text-base font-normal">
          Até
        </Label>
        <Input
          id={`${column.key}-ate`}
          type="date"
          className="h-11 text-base"
          value={to}
          min={from || bounds?.min}
          max={bounds?.max}
          onChange={(e) => update(from, e.target.value)}
        />
      </div>
    </div>
  )
}

export function FiltersPanel({
  open,
  onOpenChange,
  sheet,
  filters,
  onChange,
  onClearAll,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheet: Sheet
  filters: SheetFilters
  onChange: (filters: SheetFilters) => void
  onClearAll: () => void
}) {
  const columns = sheet.columns.filter(
    (c) => c.filterable && (c.type === "text" || c.type === "date")
  )

  function set(key: string, next: ColumnFilter | null) {
    onChange(next ? { ...filters, [key]: next } : clearFilter(filters, key))
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b p-6">
          <SheetTitle className="text-2xl text-primary">Filtros</SheetTitle>
          <SheetDescription className="text-base">
            Valem só para a aba {sheet.name}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {columns.length === 0 && (
            <p className="text-base text-muted-foreground">
              Esta aba não tem colunas para filtrar.
            </p>
          )}
          {columns.map((column) => {
            const filter = filters[column.key]
            return (
              <div key={column.key} className="flex flex-col gap-2">
                <p className="font-display text-lg font-semibold">
                  {column.label}
                </p>
                {column.type === "date" ? (
                  <DateFilter
                    sheet={sheet}
                    column={column}
                    filter={filter?.kind === "dateRange" ? filter : undefined}
                    onChange={(n) => set(column.key, n)}
                  />
                ) : (
                  <ValuesFilter
                    sheet={sheet}
                    column={column}
                    filter={filter?.kind === "values" ? filter : undefined}
                    onChange={(n) => set(column.key, n)}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="border-t p-4">
          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full text-base"
            onClick={onClearAll}
          >
            Limpar filtros
          </Button>
        </div>
      </SheetContent>
    </Drawer>
  )
}
