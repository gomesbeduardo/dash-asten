import { useMemo } from "react"
import { formatarCompetencia } from "@/cargas"
import { motion, useReducedMotion } from "motion/react"

import { entryContainer } from "@/components/app/motion/variants"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import type { FormatoKpi } from "@/chamados"
import { GraficoCartao } from "./cartoes"
import { COR, LinhaMini, type SerieLinha } from "./graficos"
import {
  AvisoFiltroSemColuna,
  ChipsFiltrosChamados,
  useFiltrosChamados,
} from "./filtros"
import { Carregando } from "./Carregando"
import { useCargasDoTipo } from "./hooks"
import {
  formatarKpi,
  linhasDeSerie,
  MAX_CLIENTES,
  MAX_OPERADORES,
  pontosDaEvolucao,
  type PontoEvolucao,
  type SeriesDimensao,
} from "./logica"

type Cartao = { id: string; titulo: string; series: SerieLinha[] }

const CARTOES: Cartao[] = [
  {
    id: "naoFinalizados",
    titulo: "Não finalizados",
    series: [
      { id: "naoFinalizados", rotulo: "Não finalizados", cor: COR.principal },
    ],
  },
  {
    id: "fluxo",
    titulo: "Entradas × finalizados",
    series: [
      { id: "entradas", rotulo: "Entradas", cor: COR.laranja },
      { id: "finalizados", rotulo: "Finalizados", cor: COR.principal },
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
    id: "slaVencido",
    titulo: "SLA vencido",
    series: [{ id: "slaVencido", rotulo: "SLA vencido", cor: COR.cinza }],
  },
  {
    id: "tempoAceite",
    titulo: "Tempo até o aceite",
    series: [{ id: "tempoAceite", rotulo: "Tempo até o aceite", cor: COR.laranja }],
  },
  {
    id: "slaRenegociado",
    titulo: "SLA renegociado",
    series: [{ id: "slaRenegociado", rotulo: "SLA renegociado", cor: COR.verde }],
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
  const { pontos, kpis, avisosFiltro, dimensoes } = dados
  const play = entrada && !reduce
  const formatoDe = (id: string): FormatoKpi =>
    kpis.find((k) => k.id === id)?.formato ?? "inteiro"

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
          <AvisoFiltroSemColuna avisos={avisosFiltro} />
          <p className="text-lg text-muted-foreground">
            Um ponto por competência.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 min-[1700px]:grid-cols-4">
          {CARTOES.map((c) => (
            <CartaoEvolucao
              key={c.id}
              cartao={c}
              pontos={pontos}
              formato={formatoDe(c.series[0].id)}
              play={play}
            />
          ))}
        </div>

        {(dimensoes.operador.temColuna || dimensoes.cliente.temColuna) && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {dimensoes.operador.temColuna && (
              <CartaoDimensao
                id="operador"
                titulo="Não finalizados por operador"
                dim={dimensoes.operador}
                max={MAX_OPERADORES}
                aviso={(d) =>
                  d.total > MAX_OPERADORES
                    ? `${MAX_OPERADORES} maiores operadores nos não finalizados de ${mesRanking(d)}. Carga de trabalho: operador é o responsável na data da foto.`
                    : "Carga de trabalho: operador é o responsável na data da foto."
                }
                play={play}
              />
            )}
            {dimensoes.cliente.temColuna && (
              <CartaoDimensao
                id="cliente"
                titulo="Não finalizados por cliente"
                dim={dimensoes.cliente}
                max={MAX_CLIENTES}
                aviso={(d) =>
                  `${MAX_CLIENTES} maiores clientes nos não finalizados de ${mesRanking(d)}`
                }
                play={play}
              />
            )}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  )
}

function CartaoEvolucao({
  cartao,
  pontos,
  formato,
  play,
}: {
  cartao: Cartao
  pontos: PontoEvolucao[]
  formato: FormatoKpi
  play: boolean
}) {
  const linhas = useMemo(
    () => linhasDeSerie(pontos, cartao.series.map((s) => s.id)),
    [pontos, cartao]
  )
  const ultimo = pontos[pontos.length - 1]
  const tabela = {
    colunas: ["Mês", ...cartao.series.map((s) => s.rotulo)],
    linhas: pontos.map((p) => [
      p.rotulo,
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
    >
      <LinhaMini linhas={linhas} series={cartao.series} formato={formato} animar={play} />
    </GraficoCartao>
  )
}

/** Paleta categórica (até 8 linhas), distinguível entre si e sobre o fundo claro do cartão. */
const PALETA = [
  "#1f5fa8",
  "#b45f06",
  "#2e7d32",
  "#7b3fa0",
  "#c2185b",
  "#00838f",
  "#6d4c41",
  "#546e7a",
]

const mesRanking = (d: SeriesDimensao) =>
  d.competenciaRanking ? formatarCompetencia(d.competenciaRanking) : "—"

function CartaoDimensao({
  id,
  titulo,
  dim,
  max,
  aviso,
  play,
}: {
  id: string
  titulo: string
  dim: SeriesDimensao
  max: number
  aviso: (d: SeriesDimensao) => string
  play: boolean
}) {
  const series: SerieLinha[] = dim.series
    .slice(0, max)
    .map((s, i) => ({ id: s.id, rotulo: s.rotulo, cor: PALETA[i % PALETA.length] }))
  const { pontos } = dim
  const linhas = useMemo(
    () => linhasDeSerie(pontos, series.map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dim]
  )
  const tabela = {
    colunas: ["Mês", ...series.map((s) => s.rotulo)],
    linhas: pontos.map((p) => [
      p.rotulo,
      ...series.map((s) => formatarKpi(p.valores[s.id] ?? null, "inteiro")),
    ]),
  }
  return (
    <GraficoCartao
      id={`evo-${id}`}
      titulo={titulo}
      subtitulo={<span>{aviso(dim)}</span>}
      tabela={tabela}
    >
      {series.length === 0 ? (
        <p className="text-lg text-muted-foreground">Sem chamados não finalizados.</p>
      ) : (
        <LinhaMini linhas={linhas} series={series} formato="inteiro" animar={play} />
      )}
    </GraficoCartao>
  )
}
