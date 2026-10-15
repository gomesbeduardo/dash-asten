import { useEntrada } from "@/components/app/motion/useEntrada"
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
import { LegendaSimbolos, type ItemLegenda } from "./selos"
import {
  formatarKpi,
  linhasDeSerie,
  MAX_CLIENTES,
  MAX_OPERADORES,
  pontosDaEvolucao,
  type PontoEvolucao,
  type SeriesDimensao,
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
  const entradaFixa = useEntrada(entrada)
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
        <Carregando forma="evolucao" />
      </div>
    )
  const { pontos, kpis, avisosFiltro, dimensoes } = dados
  const play = entradaFixa && !reduce
  const formatoDe = (id: string): FormatoKpi =>
    kpis.find((k) => k.id === id)?.formato ?? "inteiro"
  const temReconstruido = pontos.some((p) => !p.propria)
  const tiposNaTela = [
    ...CARTOES.flatMap((c) =>
      selosDoCartao(c, pontos, kpis.find((k) => k.id === c.series[0].id)?.reconstruivel ?? true)
    ),
  ]

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-6"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        <header className="flex flex-col gap-2">
          {titulo}
          <ChipsFiltrosChamados />
          <AvisoFiltroSemColuna avisos={avisosFiltro} />
          <p className="text-lg text-muted-foreground">
            Um ponto por competência.
          </p>
          <LegendaSimbolos tipos={tiposNaTela} extras={temReconstruido ? [TRACEJADO] : []} />
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

        {(dimensoes.operador.temColuna || dimensoes.cliente.temColuna) && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {dimensoes.operador.temColuna && (
              <CartaoDimensao
                id="operador"
                titulo="Backlog por operador"
                dim={dimensoes.operador}
                max={MAX_OPERADORES}
                aviso={(d) =>
                  d.total > MAX_OPERADORES
                    ? `${MAX_OPERADORES} maiores operadores no backlog de ${mesRanking(d)}. Carga de trabalho: operador é o responsável na data da exportação; nos meses reconstruídos vale o operador atual.`
                    : "Carga de trabalho: operador é o responsável na data da exportação; nos meses reconstruídos vale o operador atual."
                }
                selosFixos={["exportacao"]}
                play={play}
              />
            )}
            {dimensoes.cliente.temColuna && (
              <CartaoDimensao
                id="cliente"
                titulo="Backlog por cliente"
                dim={dimensoes.cliente}
                max={MAX_CLIENTES}
                aviso={(d) =>
                  `${MAX_CLIENTES} maiores clientes no backlog de ${mesRanking(d)}`
                }
                selosFixos={[]}
                play={play}
              />
            )}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  )
}

/** Selos de um gráfico: indicador que só vale na carga própria e/ou pontos reconstruídos com valor. */
function selosDoCartao(
  cartao: Cartao,
  pontos: PontoEvolucao[],
  reconstruivel: boolean
): SeloTipo[] {
  return [
    ...(!reconstruivel ? (["calculado"] as const) : []),
    ...(pontos.some(
      (p) => !p.propria && cartao.series.some((s) => p.valores[s.id] !== null)
    )
      ? (["reconstruido"] as const)
      : []),
  ]
}

const TRACEJADO: ItemLegenda = {
  chave: "tracejado",
  glifo: (
    <svg width="44" height="14" viewBox="0 0 44 14">
      <line x1="0" y1="7" x2="30" y2="7" stroke="#475565" strokeWidth="3" strokeDasharray="6 5" />
      <circle cx="36" cy="7" r="5" fill="var(--card)" stroke="#475565" strokeWidth="2.5" />
    </svg>
  ),
  nome: "Tracejado e ponto vazado",
  texto: "reconstruído pelas datas da planilha mais antiga; indicadores que dependem da carga do mês ficam sem valor",
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
  const selos = selosDoCartao(cartao, pontos, reconstruivel)
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
  selosFixos,
  play,
}: {
  id: string
  titulo: string
  dim: SeriesDimensao
  max: number
  aviso: (d: SeriesDimensao) => string
  selosFixos: SeloTipo[]
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
  const reconstruido = pontos.some(
    (p) => !p.propria && series.some((s) => p.valores[s.id] !== null)
  )
  const selos: SeloTipo[] = [
    ...selosFixos,
    ...(reconstruido ? (["reconstruido"] as const) : []),
  ]
  const tabela = {
    colunas: ["Mês", ...series.map((s) => s.rotulo)],
    linhas: pontos.map((p) => [
      p.propria ? p.rotulo : `${p.rotulo} (reconstruído)`,
      ...series.map((s) => formatarKpi(p.valores[s.id] ?? null, "inteiro")),
    ]),
  }
  return (
    <GraficoCartao
      id={`evo-${id}`}
      titulo={titulo}
      subtitulo={<span>{aviso(dim)}</span>}
      tabela={tabela}
      selos={selos}
    >
      {series.length === 0 ? (
        <p className="text-lg text-muted-foreground">Sem chamados no backlog.</p>
      ) : (
        <LinhaMini linhas={linhas} series={series} formato="inteiro" animar={play} />
      )}
    </GraficoCartao>
  )
}
