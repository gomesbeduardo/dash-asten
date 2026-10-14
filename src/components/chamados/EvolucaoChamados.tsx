import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"

import { entryContainer } from "@/components/app/motion/variants"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import type { FormatoKpi } from "@/chamados"
import { GraficoCartao } from "./cartoes"
import { COR, LinhaMini, type SerieLinha } from "./graficos"
import { ChipsFiltrosChamados, useFiltrosChamados } from "./filtros"
import { Carregando } from "./Carregando"
import { useCargasDoTipo } from "./hooks"
import { Selo } from "./selos"
import {
  formatarKpi,
  linhasDeSerie,
  pontosDaEvolucao,
  type PontoEvolucao,
  type SeloTipo,
} from "./logica"

type Cartao = { id: string; titulo: string; series: SerieLinha[] }

const CARTOES: Cartao[] = [
  {
    id: "backlog",
    titulo: "Backlog aberto",
    series: [{ id: "backlog", rotulo: "Backlog", cor: COR.principal }],
  },
  {
    id: "fluxo",
    titulo: "Entradas × saídas",
    series: [
      { id: "entradas", rotulo: "Entradas", cor: COR.laranja },
      { id: "saidas", rotulo: "Saídas", cor: COR.principal },
    ],
  },
  {
    id: "sla",
    titulo: "% no SLA",
    series: [{ id: "sla", rotulo: "% no SLA", cor: COR.verde }],
  },
  {
    id: "atraso",
    titulo: "Em atraso",
    series: [{ id: "atraso", rotulo: "Em atraso", cor: COR.atraso }],
  },
  {
    id: "tempoMedio",
    titulo: "Tempo médio de resolução",
    series: [{ id: "tempoMedio", rotulo: "Tempo médio", cor: COR.principal }],
  },
  {
    id: "reabertos",
    titulo: "% reabertos",
    series: [{ id: "reabertos", rotulo: "% reabertos", cor: COR.roxo }],
  },
  {
    id: "abertosApos",
    titulo: "Abertos após a competência",
    series: [{ id: "abertosApos", rotulo: "Abertos após", cor: COR.cinza }],
  },
]

export function EvolucaoChamados({
  historico,
  obterCarga,
  entrada,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const cargas = useCargasDoTipo(historico, obterCarga)
  const { filtros } = useFiltrosChamados()
  const dados = useMemo(
    () => (cargas ? pontosDaEvolucao(cargas, 6, filtros) : null),
    [cargas, filtros]
  )
  const titulo = (
    <h1 className="text-6xl leading-none text-primary">Evolução</h1>
  )
  if (!dados)
    return (
      <div className="flex flex-col gap-4">
        {titulo}
        <Carregando />
      </div>
    )
  const { pontos, kpis } = dados
  const play = entrada && !reduce
  const formatoDe = (id: string): FormatoKpi =>
    kpis.find((k) => k.id === id)?.formato ?? "inteiro"
  const temReconstruido = pontos.some((p) => !p.propria)

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-6"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        animate="show"
      >
        <header className="flex flex-col gap-2">
          {titulo}
          <ChipsFiltrosChamados />
          <p className="text-lg text-muted-foreground">
            Um ponto por competência.{" "}
            {temReconstruido && (
              <>
                <Selo tipo="reconstruido" />{" "}
                <span aria-hidden className="inline-block align-middle">
                  <svg width="44" height="14" viewBox="0 0 44 14">
                    <line x1="0" y1="7" x2="30" y2="7" stroke="#475565" strokeWidth="3" strokeDasharray="6 5" />
                    <circle cx="36" cy="7" r="5" fill="#fff" stroke="#475565" strokeWidth="2.5" />
                  </svg>
                </span>{" "}
                Tracejado e ponto vazado = reconstruído pelas datas da planilha
                mais antiga; indicadores que dependem da carga do mês ficam sem
                valor.
              </>
            )}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 min-[1700px]:grid-cols-4">
          {CARTOES.map((c) => (
            <CartaoEvolucao
              key={c.id}
              cartao={c}
              pontos={pontos}
              formato={formatoDe(c.series[0].id)}
              reconstruivel={
                kpis.find((k) => k.id === c.series[0].id)?.reconstruivel ?? true
              }
              play={play}
            />
          ))}
        </div>
      </motion.div>
    </TooltipProvider>
  )
}

function CartaoEvolucao({
  cartao,
  pontos,
  formato,
  reconstruivel,
  play,
}: {
  cartao: Cartao
  pontos: PontoEvolucao[]
  formato: FormatoKpi
  /** false: o indicador só existe nos meses com carga própria. */
  reconstruivel: boolean
  play: boolean
}) {
  const selos: SeloTipo[] = [
    ...(!reconstruivel ? (["calculado"] as const) : []),
    ...(pontos.some(
      (p) => !p.propria && cartao.series.some((s) => p.valores[s.id] !== null)
    )
      ? (["reconstruido"] as const)
      : []),
  ]
  const linhas = useMemo(
    () => linhasDeSerie(pontos, cartao.series.map((s) => s.id)),
    [pontos, cartao]
  )
  const ultimo = pontos[pontos.length - 1]
  const tabela = {
    colunas: ["Mês", ...cartao.series.map((s) => s.rotulo)],
    linhas: pontos.map((p) => [
      p.propria ? p.rotulo : `${p.rotulo} (reconstruído)`,
      ...cartao.series.map((s) => formatarKpi(p.valores[s.id] ?? null, formato)),
    ]),
  }
  return (
    <GraficoCartao
      id={`evo-${cartao.id}`}
      titulo={cartao.titulo}
      subtitulo={
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          {cartao.series.map((s) => (
            <span key={s.id} className="flex items-baseline gap-2">
              <span
                aria-hidden
                className="inline-block h-1 w-5 self-center rounded-full"
                style={{ background: s.cor }}
              />
              <span className="num font-display text-4xl font-semibold text-primary">
                {formatarKpi(ultimo?.valores[s.id] ?? null, formato)}
              </span>
              <span>
                {cartao.series.length > 1 ? s.rotulo : ultimo?.rotulo}
              </span>
            </span>
          ))}
        </span>
      }
      tabela={tabela}
      selos={selos}
    >
      <LinhaMini linhas={linhas} series={cartao.series} formato={formato} animar={play} />
    </GraficoCartao>
  )
}
