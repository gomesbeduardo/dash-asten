import { useEntrada } from "@/components/app/motion/useEntrada"
import { motion, useReducedMotion } from "motion/react"

import { formatarCompetencia } from "@/cargas"
import { entryContainer } from "@/components/app/motion/variants"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { ListaLeituras } from "./ListaLeituras"
import { ChipsFiltrosChamados } from "./filtros"
import { Carregando } from "./Carregando"
import { useMesDeChamados } from "./hooks"
import { recorteTexto } from "./logica"

/** Visão "Leituras": cartões grandes; o clique abre um modal de detalhe, sem navegar nem rolar. */
export function LeiturasChamados({
  carga,
  historico,
  obterCarga,
  entrada,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const entradaFixa = useEntrada(entrada)
  const { sheet, filtros, metricas, leituras, anterior } = useMesDeChamados(
    carga,
    historico,
    obterCarga
  )

  const recorte = recorteTexto(filtros)
  const titulo = `Leituras · ${formatarCompetencia(carga.competencia, "longo")}${recorte ? ` · ${recorte}` : ""}`
  const cabecalho = (
    <header className="flex flex-col gap-1">
      <h1 className="text-6xl leading-none text-primary">{titulo}</h1>
      <ChipsFiltrosChamados />
    </header>
  )
  if (!sheet)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <p role="alert" className="text-xl text-destructive">
          Não encontrei uma aba de chamados nesta planilha.
        </p>
      </div>
    )
  if (!metricas || anterior === undefined)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <Carregando texto="Carregando as leituras…" forma="leituras" />
      </div>
    )

  const play = entradaFixa && !reduce

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-6"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        {cabecalho}
        <p className="text-lg text-muted-foreground">
          Leituras automáticas do mês, com regras de limite fixo: não projetam o
          futuro. Clique numa para ver a regra, os números e a evidência.
        </p>
        {leituras.length > 0 ? (
          <ListaLeituras
            leituras={leituras}
            metricas={metricas}
            grande
          />
        ) : (
          <p className="text-xl text-muted-foreground">
            Nenhuma leitura automática para este mês: os limites de alerta não
            foram atingidos{recorte ? " neste recorte" : ""}.
          </p>
        )}
      </motion.div>
    </TooltipProvider>
  )
}
