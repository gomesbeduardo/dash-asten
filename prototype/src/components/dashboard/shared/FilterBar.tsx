import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FilterBarProps } from "./contracts"

export function FilterBar({ children, chips, onRemoveChip, onClear }: FilterBarProps) {
  return (
    <div role="search" aria-label="Filtros da aba" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <Button
          variant="ghost"
          className="ml-auto h-10 text-base"
          disabled={chips.length === 0}
          onClick={onClear}
        >
          Limpar filtros
        </Button>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Filtros ativos">
          {chips.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onRemoveChip(c.id)}
                aria-label={`Remover filtro ${c.group}: ${c.label}`}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-brand/30 bg-brand-soft py-1 pr-2 pl-3 text-base text-foreground outline-none hover:border-brand focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span>
                  <span className="text-muted-foreground">{c.group}:</span> {c.label}
                </span>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
