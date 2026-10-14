import { useId, useState, type ReactNode } from "react"
import { ChevronDownIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import type { CargaMeta } from "@/cargas"
import { agruparHistorico } from "@/app/navegacao"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { competenciaLonga, dataHora, rotuloVersao } from "./formatoCarga"

const nomeDaCarga = (v: CargaMeta) =>
  `${competenciaLonga(v.competencia)} ${rotuloVersao(v)}`

type Props = {
  metas: CargaMeta[]
  nomeDoTipo: (id: string) => string
  onAbrir: (id: string) => void
  /** Carga aberta no painel (marcada como "aberta"). */
  atualId?: string
  /** Mostra as versões anteriores de todos os grupos (ex.: durante uma busca). */
  expandirTodos?: boolean
  /** Botões extras da linha de uma versão (ex.: "Tirar da lista"). */
  acoes?: (v: CargaMeta) => ReactNode
  /** Conteúdo extra sob o nome do arquivo (ex.: etiquetas). */
  detalhes?: (v: CargaMeta) => ReactNode
  className?: string
}

/**
 * Cargas agrupadas por tipo + competência: o cabeçalho do grupo é a versão mais
 * recente; as anteriores ficam recolhidas, da mais nova para a mais antiga.
 * Usada na tela de envio e no Histórico.
 */
export function ListaCargasAgrupada({
  metas,
  nomeDoTipo,
  onAbrir,
  atualId,
  expandirTodos = false,
  acoes,
  detalhes,
  className,
}: Props) {
  const tipos = agruparHistorico(metas)
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {tipos.map((t) => (
        <section key={t.tipo} className="flex flex-col gap-2">
          {tipos.length > 1 && (
            <h3 className="text-lg font-semibold text-primary">
              {nomeDoTipo(t.tipo)}
            </h3>
          )}
          <ul
            aria-label={`Cargas de ${nomeDoTipo(t.tipo)}`}
            className="flex flex-col gap-2"
          >
            {t.competencias.map((g) => (
              <Grupo
                key={g.competencia}
                versoes={g.versoes}
                onAbrir={onAbrir}
                atualId={atualId}
                expandirTodos={expandirTodos}
                acoes={acoes}
                detalhes={detalhes}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Grupo({
  versoes,
  onAbrir,
  atualId,
  expandirTodos,
  acoes,
  detalhes,
}: {
  versoes: CargaMeta[]
  onAbrir: (id: string) => void
  atualId?: string
  expandirTodos: boolean
  acoes?: Props["acoes"]
  detalhes?: Props["detalhes"]
}) {
  const [aberto, setAberto] = useState(false)
  const reduzir = useReducedMotion()
  const idLista = useId()
  const [recente, ...anteriores] = versoes
  const mostrar = anteriores.length > 0 && (aberto || expandirTodos)

  const linha = (v: CargaMeta, destaque: boolean) => (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
        destaque ? "bg-card" : "bg-muted/40"
      )}
    >
      <div className="min-w-0 text-base">
        <p className="tabular-nums">
          <span className="font-semibold">{nomeDaCarga(v)}</span> ·{" "}
          {dataHora(v.importadaEm)}
          {v.id === atualId && (
            <span className="ml-2 text-sm text-brand-ink">aberta</span>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">{v.arquivo}</p>
        {detalhes?.(v)}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          size="lg"
          variant="outline"
          aria-label={`Abrir ${nomeDaCarga(v)}`}
          onClick={() => onAbrir(v.id)}
        >
          Abrir
        </Button>
        {acoes?.(v)}
      </div>
    </div>
  )

  return (
    <li className="flex flex-col gap-1">
      {linha(recente, true)}
      {anteriores.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={mostrar}
            aria-controls={idLista}
            disabled={expandirTodos}
            onClick={() => setAberto((a) => !a)}
            className="flex h-11 items-center gap-1 self-start rounded-md px-2 text-sm text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:no-underline"
          >
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform motion-reduce:transition-none",
                mostrar && "rotate-180"
              )}
              aria-hidden
            />
            {anteriores.length}{" "}
            {anteriores.length === 1 ? "versão anterior" : "versões anteriores"}
          </button>
          <div id={idLista}>
            {mostrar && (
              <motion.ul
                initial={reduzir ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduzir ? 0 : 0.18 }}
                className="ml-4 flex flex-col gap-2"
              >
                {anteriores.map((v) => (
                  <li key={v.id}>{linha(v, false)}</li>
                ))}
              </motion.ul>
            )}
          </div>
        </>
      )}
    </li>
  )
}
