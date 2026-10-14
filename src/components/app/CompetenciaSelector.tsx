import { useState } from "react"
import { CalendarIcon, CheckIcon, ChevronDownIcon } from "lucide-react"

import { tiposRegistrados, type CargaMeta } from "@/cargas"
import type { GrupoCompetencia, GrupoTipo } from "@/app/navegacao"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { competenciaLonga, dataHora, rotuloComNome } from "./formatoCarga"

export function CompetenciaSelector({
  atual,
  grupos,
  outrosTipos = [],
  onAbrir,
  onOpenChange,
}: {
  atual: CargaMeta
  /** Competências (ativas) do tipo aberto. */
  grupos: GrupoCompetencia[]
  /** Cargas ativas dos demais tipos; aparecem em seções rotuladas pelo nome do tipo. */
  outrosTipos?: GrupoTipo[]
  onAbrir: (id: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const change = (o: boolean) => {
    setOpen(o)
    onOpenChange(o)
  }
  const nomeDoTipo = (id: string) =>
    tiposRegistrados().find((t) => t.id === id)?.nome ?? id
  const comRotulos = outrosTipos.length > 0

  const lista = (gs: GrupoCompetencia[]) =>
    gs.map((g) => (
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
              aria-label={`${competenciaLonga(v.competencia)}, versão ${v.versao}${v.nome ? `, ${v.nome}` : ""}`}
              aria-current={ativa ? "true" : undefined}
              onClick={() => {
                change(false)
                if (!ativa) onAbrir(v.id)
              }}
              className={cn(
                "flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-base outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                ativa && "bg-brand-soft font-semibold text-brand-ink"
              )}
            >
              <span className="flex min-w-0 items-center gap-2 tabular-nums">
                <CheckIcon
                  aria-hidden
                  className={cn("size-5 shrink-0 text-ring", !ativa && "invisible")}
                />
                <span className="truncate">{rotuloComNome(v)}</span>
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {dataHora(v.importadaEm)}
              </span>
            </button>
          )
        })}
      </div>
    ))

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          aria-label="Competência"
          className="font-normal data-[state=open]:border-ring data-[state=open]:bg-muted"
        >
          <CalendarIcon aria-hidden />
          {competenciaLonga(atual.competencia)}
          {(atual.versao !== 1 || atual.nome) && (
            <span className="max-w-56 truncate rounded-full bg-brand-soft px-2 text-sm font-semibold text-brand-ink tabular-nums">
              {rotuloComNome(atual)}
            </span>
          )}
          <ChevronDownIcon aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-[70svh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto"
      >
        {comRotulos ? (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {nomeDoTipo(atual.tipo)}
              </h3>
              {lista(grupos)}
            </section>
            {outrosTipos.map((t) => (
              <section key={t.tipo} className="flex flex-col gap-3 border-t pt-3">
                <h3 className="px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {nomeDoTipo(t.tipo)}
                </h3>
                {lista(t.competencias)}
              </section>
            ))}
          </>
        ) : (
          lista(grupos)
        )}
      </PopoverContent>
    </Popover>
  )
}
