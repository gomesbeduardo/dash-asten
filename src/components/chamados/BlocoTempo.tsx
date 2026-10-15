import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import { formatarCompetencia } from "@/cargas"
import type { FormatoKpi } from "@/chamados"
import { useEntrada } from "@/components/app/motion/useEntrada"
import { entryContainer } from "@/components/app/motion/variants"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { Carregando } from "./Carregando"
import { GraficoCartao, TituloBloco } from "./cartoes"
import { AvisoFiltroSemColuna, useFiltrosChamados } from "./filtros"
import { SERIE_FIN } from "./painel-foto"
import { COR, LinhaMini, type SerieLinha } from "./graficos"
import { useCargasDoTipo } from "./hooks"
import {
  formatarKpi,
  linhasDeSerie,
  MAX_CLIENTES,
  MAX_OPERADORES,
  pontosDaEvolucao,
  type PontoEvolucao,
  type SeriesDimensao,
  type SeriesSituacao,
} from "./logica"

/** Origem dos dados de um gráfico do bloco. */
export type FonteGraficoTempo =
  | { tipo: "kpis"; series: SerieLinha[] }
  | { tipo: "situacao" }
  | { tipo: "dimensao"; dim: "operador" | "cliente" }

export type GraficoTempo = {
  id: string
  titulo: string
  fonte: FonteGraficoTempo
}

/**
 * Lista dos gráficos do bloco "Ao longo do tempo", na ordem de exibição.
 * Fica aqui (e não no JSX) para um futuro "+ adicionar gráfico" só acrescentar itens.
 */
export const GRAFICOS_TEMPO: GraficoTempo[] = [
  {
    id: "situacao",
    titulo: "Não finalizados por situação",
    fonte: { tipo: "situacao" },
  },
  {
    id: "fluxo",
    titulo: "Entradas × finalizados",
    fonte: {
      tipo: "kpis",
      series: [
        { id: "entradas", rotulo: "Entradas", cor: COR.laranja },
        { id: "finalizados", rotulo: "Finalizados", cor: SERIE_FIN },
      ],
    },
  },
  {
    id: "atraso",
    titulo: "Em atraso + SLA vencido",
    fonte: {
      tipo: "kpis",
      series: [
        { id: "atraso", rotulo: "Em atraso", cor: COR.atraso },
        { id: "slaVencido", rotulo: "SLA vencido", cor: COR.cinza },
      ],
    },
  },
  {
    id: "sla",
    titulo: "% no SLA",
    fonte: {
      tipo: "kpis",
      series: [{ id: "sla", rotulo: "% no SLA", cor: COR.verde }],
    },
  },
  {
    id: "tempoMedio",
    titulo: "Tempo médio de resolução",
    fonte: {
      tipo: "kpis",
      series: [{ id: "tempoMedio", rotulo: "Tempo médio", cor: COR.principal }],
    },
  },
  {
    id: "operador",
    titulo: "Não finalizados por operador",
    fonte: { tipo: "dimensao", dim: "operador" },
  },
  {
    id: "cliente",
    titulo: "Não finalizados por cliente",
    fonte: { tipo: "dimensao", dim: "cliente" },
  },
]

const JANELAS = [6, 12] as const

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

/**
 * Grade por largura (D67): 1 / 2 / 3 / 4 colunas (4 a partir de 2200px, TV). Os breakpoints 3xl/4xl
 * do tema perdem a ordem no CSS para lg:/xl:, por isso min-[137.5rem]. O último cartão ocupa o
 * que sobra da linha em cada largura, para a grade fechar sempre (sem buraco).
 */
const GRADE =
  "grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3 min-[137.5rem]:grid-cols-4"
const SPAN_ULTIMO: Record<2 | 3 | 4, string[]> = {
  2: ["", "lg:col-span-2"],
  3: ["", "2xl:col-span-2", "2xl:col-span-3"],
  4: [
    "",
    "min-[137.5rem]:col-span-2",
    "min-[137.5rem]:col-span-3",
    "min-[137.5rem]:col-span-4",
  ],
}
function classeUltimo(n: number): string {
  return ([2, 3, 4] as const)
    .map((c) => SPAN_ULTIMO[c][c - 1 - ((n - 1) % c)])
    .filter(Boolean)
    .join(" ")
}

/** Célula da tabela de dados: valor, "— (sem posição de …)" ou valor com "(corrigido; era …)". */
function celula(p: PontoEvolucao, id: string, formato: FormatoKpi): string {
  const v = p.valores[id] ?? null
  if (v === null && p.semFoto && p.dica) return `— (${p.dica})`
  const o = p.originais?.[id]
  const base = formatarKpi(v, formato)
  return o !== undefined && o !== null
    ? `${base} (corrigido; era ${formatarKpi(o, formato)})`
    : base
}

const mesRanking = (d: SeriesDimensao) =>
  d.competenciaRanking ? formatarCompetencia(d.competenciaRanking) : "—"

const ehFinalizado = (rotulo: string) =>
  rotulo.trim().toLowerCase() === "finalizado"

type Dados = NonNullable<ReturnType<typeof pontosDaEvolucao>>

type Grafico = {
  g: GraficoTempo
  pontos: PontoEvolucao[]
  series: SerieLinha[]
  formato: FormatoKpi
  subtitulo: React.ReactNode
  vazio?: string
}

/** Resolve cada item de GRAFICOS_TEMPO nos dados; devolve só os que aparecem (operador/cliente somem sem a coluna). */
function montar(dados: Dados): Grafico[] {
  const { pontos, kpis, dimensoes, situacoes } = dados
  const doKpi = (id: string): FormatoKpi =>
    kpis.find((k) => k.id === id)?.formato ?? "inteiro"
  const ultimo = pontos[pontos.length - 1]
  const out: Grafico[] = []
  for (const g of GRAFICOS_TEMPO) {
    const f = g.fonte
    if (f.tipo === "kpis") {
      const formato = doKpi(f.series[0].id)
      out.push({
        g,
        pontos,
        series: f.series,
        formato,
        subtitulo: (
          <span className="flex flex-wrap gap-x-5 gap-y-1">
            {f.series.map((s) => (
              <span key={s.id} className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="inline-block h-1 w-5 self-center rounded-full"
                  style={{ background: s.cor }}
                />
                <span className="num font-display text-3xl font-semibold text-primary">
                  {formatarKpi(ultimo?.valores[s.id] ?? null, formato)}
                </span>
                <span>{f.series.length > 1 ? s.rotulo : ultimo?.rotulo}</span>
              </span>
            ))}
          </span>
        ),
      })
    } else if (f.tipo === "situacao") {
      const lista = (situacoes as SeriesSituacao).series.filter(
        (s) => !ehFinalizado(s.rotulo)
      )
      out.push({
        g,
        pontos: situacoes.pontos,
        series: lista.map((s, i) => ({
          id: s.id,
          rotulo: s.rotulo,
          cor: PALETA[i % PALETA.length],
        })),
        formato: "inteiro",
        subtitulo: (
          <span>
            Uma linha por Situação em cada posição; mês sem posição fica sem
            ponto.
          </span>
        ),
        vazio: "Sem chamados nas posições da janela.",
      })
    } else {
      const dim = dimensoes[f.dim]
      if (!dim.temColuna) continue
      const max = f.dim === "operador" ? MAX_OPERADORES : MAX_CLIENTES
      const aviso =
        f.dim === "operador"
          ? `${dim.total > max ? `${max} maiores operadores nos não finalizados de ${mesRanking(dim)}. ` : ""}Carga de trabalho: operador é o responsável na data da posição.`
          : `${max} maiores clientes nos não finalizados de ${mesRanking(dim)}`
      out.push({
        g,
        pontos: dim.pontos,
        series: dim.series.slice(0, max).map((s, i) => ({
          id: s.id,
          rotulo: s.rotulo,
          cor: PALETA[i % PALETA.length],
        })),
        formato: "inteiro",
        subtitulo: <span>{aviso}</span>,
        vazio: "Sem chamados não finalizados.",
      })
    }
  }
  return out
}

function CartaoTempo({
  item,
  play,
  className,
}: {
  item: Grafico
  play: boolean
  className: string
}) {
  const { g, pontos, series, formato, subtitulo, vazio } = item
  const ids = series.map((s) => s.id).join("|")
  const linhas = useMemo(
    () => linhasDeSerie(pontos, ids ? ids.split("|") : []),
    [pontos, ids]
  )
  return (
    <div className={`flex flex-col *:flex-1 ${className}`}>
      <GraficoCartao
        id={`evo-${g.id}`}
        titulo={g.titulo}
        subtitulo={subtitulo}
        tabela={{
          colunas: ["Mês", ...series.map((s) => s.rotulo)],
          linhas: pontos.map((p) => [
            p.rotulo,
            ...series.map((s) => celula(p, s.id, formato)),
          ]),
        }}
      >
        {series.length === 0 && vazio ? (
          <p className="text-lg text-muted-foreground">{vazio}</p>
        ) : (
          <LinhaMini
            linhas={linhas}
            series={series}
            formato={formato}
            animar={play}
          />
        )}
      </GraficoCartao>
    </div>
  )
}

/** Bloco "Ao longo do tempo": gráficos de linha compactos, um ponto por mês (foto), meses sem posição marcados e corrigidos sinalizados. */
export function BlocoTempo({
  carga,
  historico,
  obterCarga,
  entrada,
}: Pick<VisaoTipoProps, "carga" | "historico" | "obterCarga" | "entrada">) {
  const [meses, setMeses] = useState<(typeof JANELAS)[number]>(6)
  const reduce = useReducedMotion()
  const entradaFixa = useEntrada(entrada)
  const cargas = useCargasDoTipo(historico, obterCarga)
  const { filtros } = useFiltrosChamados()
  const dados = useMemo(
    () =>
      cargas
        ? pontosDaEvolucao(cargas, meses, filtros, carga.competencia)
        : null,
    [cargas, filtros, meses, carga.competencia]
  )
  const itens = useMemo(() => (dados ? montar(dados) : []), [dados])
  const play = entradaFixa && !reduce

  const cabecalho = (
    <TituloBloco
      titulo="Ao longo do tempo"
      texto={`Um ponto por mês até ${formatarCompetencia(carga.competencia)}. Mês sem posição traz só entradas e finalizados (das datas). Ponto vazado = corrigido por posição posterior.`}
      acao={
        <div role="group" aria-label="Janela" className="flex gap-2">
          {JANELAS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={n === meses ? "default" : "outline"}
              aria-pressed={n === meses}
              onClick={() => setMeses(n)}
            >
              {n} meses
            </Button>
          ))}
        </div>
      }
    />
  )

  if (!dados)
    return (
      <section aria-label="Ao longo do tempo" className="flex flex-col gap-4">
        <TituloBloco titulo="Ao longo do tempo" />
        <Carregando forma="evolucao" />
      </section>
    )

  return (
    <TooltipProvider>
      <motion.section
        aria-label="Ao longo do tempo"
        className="flex flex-col gap-4"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        {cabecalho}
        <AvisoFiltroSemColuna avisos={dados.avisosFiltro} />
        <div className={GRADE}>
          {itens.map((item, i) => (
            <CartaoTempo
              key={item.g.id}
              item={item}
              play={play}
              className={
                i === itens.length - 1 ? classeUltimo(itens.length) : ""
              }
            />
          ))}
        </div>
      </motion.section>
    </TooltipProvider>
  )
}
