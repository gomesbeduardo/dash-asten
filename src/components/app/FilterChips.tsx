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
          className="flex min-h-11 max-w-full items-center gap-1 rounded-full border border-ring bg-brand-soft py-1 pr-1 pl-4 text-brand-ink text-base"
        >
          <span className="truncate">
            <span className="font-semibold">{chip.label}:</span>{" "}
            {chip.text}
          </span>
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remover filtro ${chip.label}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-ink transition-colors duration-200 outline-none hover:bg-ring/15 motion-reduce:transition-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <XIcon className="size-5" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <Button
          variant="outline"
          size="lg"
          onClick={onClearAll}
          className="text-primary"
        >
          Limpar filtros
        </Button>
      </li>
    </ul>
  )
}
