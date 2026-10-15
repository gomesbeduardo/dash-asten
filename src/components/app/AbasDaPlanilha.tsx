import { EyeIcon, FilterIcon } from "lucide-react"

import type { Sheet } from "@/core"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { visibleIds } from "./tabs-state"

export type AbasDaPlanilhaProps = {
  sheets: Sheet[]
  hidden: string[]
  activeId: string
  filterCount: number
  onSelect: (id: string) => void
  onToggleSheet: (id: string, show: boolean) => void
  onOpenFilters: () => void
  onTabsMenuOpenChange: (open: boolean) => void
}

/** Faixa de abas da planilha, filtros e menu de abas (tipo "outro"). */
export function AbasDaPlanilha(p: AbasDaPlanilhaProps) {
  const visible = visibleIds(
    p.sheets.map((s) => s.id),
    p.hidden
  )
  const shown = p.sheets.filter((s) => visible.includes(s.id))

  return (
    <div className="flex w-full basis-full items-center gap-4">
      <nav
        aria-label="Abas da planilha"
        className="min-w-0 flex-1 overflow-x-auto"
      >
        <div role="tablist" className="flex gap-1">
          {shown.map((sheet, i) => {
            const active = sheet.id === p.activeId
            return (
              <button
                key={sheet.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => p.onSelect(sheet.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-4 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring",
                  active
                    ? "border-brand font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {i < 9 && (
                  <span
                    className="font-display text-sm tabular-nums opacity-70"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                )}
                {sheet.name}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="default" size="lg" onClick={p.onOpenFilters}>
          <FilterIcon aria-hidden /> Filtros
          {p.filterCount > 0 && (
            <span className="rounded-full bg-primary-foreground px-2 text-sm font-semibold text-primary tabular-nums">
              {p.filterCount}
            </span>
          )}
        </Button>

        <DropdownMenu onOpenChange={p.onTabsMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg">
              <EyeIcon aria-hidden /> Abas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-60">
            <DropdownMenuLabel>Mostrar na apresentação</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {p.sheets.map((sheet) => {
              const isShown = visible.includes(sheet.id)
              return (
                <DropdownMenuCheckboxItem
                  key={sheet.id}
                  checked={isShown}
                  disabled={isShown && visible.length === 1}
                  onCheckedChange={(v) => p.onToggleSheet(sheet.id, !!v)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-base"
                >
                  {sheet.name}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
