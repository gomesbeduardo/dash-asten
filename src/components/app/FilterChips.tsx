import { XIcon } from "lucide-react"

import type { Sheet, SheetFilters } from "@/core"
import { Button } from "@/components/ui/button"
import { chipsFor } from "./chips"

/** Filtros ativos: ficam visíveis mesmo com a barra escondida, porque são informação. */
export function FilterChips({
  sheet,
  filters,
  onRemove,
  onClearAll,
}: {
  sheet: Sheet
  filters: SheetFilters
  onRemove: (key: string) => void
  onClearAll: () => void
}) {
  return (
    <ListaDeChips
      chips={chipsFor(sheet, filters)}
      onRemove={onRemove}
      onClearAll={onClearAll}
    />
  )
}

export function ListaDeChips<K extends string>({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: { key: K; label: string; text: string }[]
  onRemove: (key: K) => void
  onClearAll: () => void
}) {
  if (chips.length === 0) return null
  return (
    <ul
      aria-label="Filtros ativos"
      className="flex flex-wrap items-center gap-2"
    >
      {chips.map((chip) => (
        <li
          key={chip.key}
          className="flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-card py-1 pr-1 pl-4 text-base"
        >
          <span className="truncate">
            <span className="font-medium text-primary">{chip.label}:</span>{" "}
            {chip.text}
          </span>
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remover filtro ${chip.label}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <Button
          variant="ghost"
          size="lg"
          onClick={onClearAll}
          className="text-primary underline"
        >
          Limpar filtros
        </Button>
      </li>
    </ul>
  )
}
