import { useState } from "react"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"

import type { CargaMeta } from "@/cargas"
import type { GrupoCompetencia } from "@/app/navegacao"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { competenciaLonga, dataHora, rotuloVersao } from "./formatoCarga"

export function CompetenciaSelector({
  atual,
  grupos,
  onAbrir,
  onOpenChange,
}: {
  atual: CargaMeta
  grupos: GrupoCompetencia[]
  onAbrir: (id: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const change = (o: boolean) => {
    setOpen(o)
    onOpenChange(o)
  }
  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="lg" aria-label="Competência">
          <CalendarIcon aria-hidden />
          {competenciaLonga(atual.competencia)}
          {atual.versao !== 1 && (
            <span className="rounded-full bg-brand-soft px-2 text-sm font-semibold text-brand-ink tabular-nums">
              {rotuloVersao(atual)}
            </span>
          )}
          <ChevronDownIcon aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-[70svh] w-96 flex-col gap-3 overflow-y-auto"
      >
        {grupos.map((g) => (
          <div key={g.competencia} className="flex flex-col gap-1">
            <p className="px-2 font-display text-base text-primary">
              {competenciaLonga(g.competencia)}
            </p>
            {g.versoes.map((v) => {
              const ativa = v.id === atual.id
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-label={`${competenciaLonga(v.competencia)}, versão ${v.versao}`}
                  aria-current={ativa ? "true" : undefined}
                  onClick={() => {
                    change(false)
                    if (!ativa) onAbrir(v.id)
                  }}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-base hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                    ativa && "bg-brand-soft font-semibold text-brand-ink"
                  )}
                >
                  <span className="tabular-nums">{rotuloVersao(v)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {dataHora(v.importadaEm)}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
