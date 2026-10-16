import { useState } from "react"
import { XIcon } from "lucide-react"

import type { Sheet, SheetFilters } from "@/core"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

type Chip<K extends string> = { key: K; label: string; text: string }

/**
 * Linha dos filtros ativos. Entra e sai animando a altura (grid 0fr↔1fr + opacidade), para
 * não empurrar nem puxar o conteúdo de uma vez. O invólucro existe sempre (fechado quando vazio), para a abertura animar. Ao esvaziar, guarda os últimos chips até
 * recolher (escondidos e inertes). O `-mt-2` fechado cancela o gap do cabeçalho: vazia, não
 * ocupa nada. Movimento reduzido: seco.
 */
export function ListaDeChips<K extends string>({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: Chip<K>[]
  onRemove: (key: K) => void
  onClearAll: () => void
}) {
  const aberta = chips.length > 0
  const assinatura = chips.map((c) => `${c.key}|${c.text}`).join("\n")
  const [guardados, setGuardados] = useState({ assinatura, chips })
  if (aberta && guardados.assinatura !== assinatura)
    setGuardados({ assinatura, chips })
  const lista = aberta ? chips : guardados.chips
  return (
    <div
      aria-hidden={!aberta}
      inert={!aberta}
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-[var(--motion-ease-standard)] motion-reduce:transition-none",
        aberta
          ? "mt-0 grid-rows-[1fr] opacity-100"
          : "-mt-2 grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {lista.length > 0 && (
          <ul
            aria-label="Filtros ativos"
            className="flex flex-wrap items-center gap-2"
          >
            {lista.map((chip) => (
              <li
                key={chip.key}
                className="flex min-h-11 max-w-full items-center gap-1 rounded-full border border-ring bg-brand-soft py-1 pr-1 pl-4 text-base text-brand-ink"
              >
                <span className="truncate">
                  <span className="font-semibold">{chip.label}:</span>{" "}
                  {chip.text}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(chip.key)}
                  aria-label={`Remover filtro ${chip.label}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-ink transition-colors duration-200 outline-none hover:bg-ring/15 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
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
        )}
      </div>
    </div>
  )
}
