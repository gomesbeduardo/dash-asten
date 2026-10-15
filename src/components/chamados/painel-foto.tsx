/** Peças do Painel da foto (D64): cards por Situação e gráficos com "comparar período". */
import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarRangeIcon,
  MinusIcon,
  SparklesIcon,
} from "lucide-react"

import { formatarCompetencia } from "@/cargas"
import {
  distribuicoesFinalizadosNoPeriodo,
  type Distribuicao,
  type EntradaCompetencia,
  type ItemDistribuicao,
  type ItemDistribuicaoCorrigido,
} from "@/chamados"
import { AnimatedNumber } from "@/components/app/motion/AnimatedNumber"
import { entryItem } from "@/components/app/motion/variants"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { GraficoCartao } from "./cartoes"
import { BarrasComparar } from "./graficos"
import { agruparSeries, temOutros } from "./logica"
import { MarcaCorrigido } from "./selos"

const inteiro = new Intl.NumberFormat("pt-BR")
const n = (v: number) => inteiro.format(v)

/**
 * Situações e total do período-base; `null` = sem base (sem carga anterior ou filtro sem coluna).
 * `semFoto` (D65): o período escolhido não tem foto; não há situações para comparar.
 */
export type BaseAnterior = {
  situacoes: ItemDistribuicao[]
  total: number
  rotulo: string
  semFoto?: string
} | null

function Variacao({
  atual,
  anterior,
  rotulo,
  nova = false,
  semFoto,
}: {
  atual: number
  anterior: number | null
  rotulo: string
  nova?: boolean
  semFoto?: string
}) {
  if (semFoto)
    return (
      <p className="text-base text-muted-foreground">
        <span aria-hidden>—</span> {semFoto}
      </p>
    )
  if (nova)
    return (
      <p className="flex items-center gap-1.5 text-base font-medium text-primary">
        <SparklesIcon className="size-5 shrink-0" aria-hidden /> nova
        <span className="font-normal text-muted-foreground">
          · não estava em {rotulo}
        </span>
      </p>
    )
  if (anterior === null)
    return (
      <p className="text-base text-muted-foreground">
        sem base no mês anterior
      </p>
    )
  const dif = atual - anterior
  const Seta = dif > 0 ? ArrowUpIcon : dif < 0 ? ArrowDownIcon : MinusIcon
  return (
    <p className="flex items-center gap-1.5 text-base text-muted-foreground">
      <Seta className="size-5 shrink-0" aria-hidden />
      <span>
        {dif === 0
          ? `sem variação vs ${rotulo}`
          : `${dif > 0 ? "+" : "-"}${n(Math.abs(dif))} vs ${rotulo}`}
      </span>
    </p>
  )
}

function CartaoContagem({
  rotulo,
  nome,
  valor,
  destaque = false,
  entrada,
  children,
}: {
  rotulo: string
  nome: string
  valor: number
  destaque?: boolean
  entrada: boolean
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.article
      aria-label={nome}
      variants={reduce ? undefined : entryItem}
      className={cn(
        "flex max-w-sm min-w-0 grow basis-56 flex-col justify-between gap-2 rounded-lg p-5 shadow-(--shadow-card) 3xl:max-w-md 4xl:max-w-lg",
        destaque ? "bg-brand-soft" : "bg-card"
      )}
    >
      <h3 className="font-sans text-lg leading-tight font-medium text-muted-foreground">
        {rotulo}
      </h3>
      <AnimatedNumber
        value={valor}
        format="integer"
        fromZero={entrada}
        className="num font-display text-5xl leading-none font-semibold text-primary"
      />
      {children}
    </motion.article>
  )
}

/** Linha do topo: total da foto e um card por Situação (valor literal, por frequência). */
export function CartoesSituacao({
  total,
  situacoes,
  anterior,
  mes,
  entrada,
  corrigidoPor = [],
}: {
  total: number
  situacoes: ItemDistribuicaoCorrigido[]
  anterior: BaseAnterior
  mes: string
  entrada: boolean
  /** Fotos posteriores que corrigiram valores ("out/26"); vazio = nada corrigido. */
  corrigidoPor?: string[]
}) {
  // situações que existiam no período-base e sumiram: card com 0 e a queda
  const sumidas: ItemDistribuicaoCorrigido[] = (anterior?.situacoes ?? [])
    .filter((b) => !situacoes.some((s) => s.rotulo === b.rotulo))
    .map((b) => ({ rotulo: b.rotulo, valor: 0 }))
  return (
    <section aria-label="Chamados por situação" className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-4">
        <CartaoContagem
          rotulo="Total de chamados"
          nome="Total de chamados"
          valor={total}
          destaque
          entrada={entrada}
        >
          <p className="text-base text-muted-foreground">na foto de {mes}</p>
          <Variacao
            atual={total}
            anterior={anterior ? anterior.total : null}
            rotulo={anterior?.rotulo ?? ""}
            semFoto={anterior?.semFoto}
          />
        </CartaoContagem>
        {[...situacoes, ...sumidas].map((s) => {
          const antes = anterior?.situacoes.find((x) => x.rotulo === s.rotulo)
          return (
            <CartaoContagem
              key={s.rotulo}
              rotulo={s.rotulo}
              nome={`Situação: ${s.rotulo}`}
              valor={s.valor}
              entrada={entrada}
            >
              <Variacao
                atual={s.valor}
                anterior={antes?.valor ?? null}
                rotulo={anterior?.rotulo ?? ""}
                nova={!!anterior && !anterior.semFoto && !antes}
                semFoto={anterior?.semFoto}
              />
              {s.original !== undefined && corrigidoPor.length > 0 && (
                <MarcaCorrigido por={corrigidoPor} original={n(s.original)} />
              )}
            </CartaoContagem>
          )
        })}
      </div>
      <p className="text-base text-muted-foreground">
        Cada situação aparece como vem na planilha.
      </p>
    </section>
  )
}

const SERIES_MES = [
  { id: "finalizados", rotulo: "Finalizados no mês" },
  { id: "naoFinalizados", rotulo: "Não finalizados" },
]
const SERIES_PERIODO = [
  { id: "finalizadosPeriodo", rotulo: "Finalizados no período" },
  { id: "naoFinalizados", rotulo: "Não finalizados" },
]
export const PERIODOS = [3, 6, 12] as const

/** Início (UTC) do período de `meses` meses que termina no mês `competencia` ("AAAA-MM"). */
function periodoAte(competencia: string, meses: number) {
  const [ano, mes] = competencia.split("-").map(Number)
  return {
    inicio: Date.UTC(ano, mes - meses, 1),
    fim: Date.UTC(ano, mes, 1) - 1,
    primeira: new Date(Date.UTC(ano, mes - meses, 1)),
  }
}
const competenciaDe = (dt: Date) =>
  `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`

/** Gráfico por dimensão: finalizados (no mês ou no período) × não finalizados, com o toggle no próprio card. */
export function GraficoFoto({
  dist,
  entrada,
  competencia,
  sub,
  max,
  className,
  animar,
  corrigidoPor = [],
}: {
  dist: Distribuicao
  /** Mês da carga já com os filtros aplicados; base do cálculo por período. */
  entrada: EntradaCompetencia | null
  competencia: string
  /** Complemento do subtítulo, ex.: "por atividade". */
  sub: string
  max?: number
  className?: string
  animar: boolean
  /** Fotos posteriores que corrigiram valores deste gráfico ("out/26"). */
  corrigidoPor?: string[]
}) {
  const [ligado, setLigado] = useState(false)
  const [meses, setMeses] = useState<number>(6)
  const periodo = useMemo(
    () => periodoAte(competencia, meses),
    [competencia, meses]
  )
  const doPeriodo = useMemo(() => {
    if (!ligado || !entrada) return null
    return (
      distribuicoesFinalizadosNoPeriodo(entrada, periodo).find(
        (d) => d.id === dist.id
      ) ?? null
    )
  }, [ligado, entrada, periodo, dist.id])

  const fonte = doPeriodo ?? dist
  const series = doPeriodo ? SERIES_PERIODO : SERIES_MES
  const rotuloFin = series[0].rotulo
  const base = fonte.itens.map((i) => ({
    rotulo: i.rotulo,
    valores: [i.finalizados, i.naoFinalizados] as (number | null)[],
  }))
  const itens = max ? agruparSeries(base, max) : base
  const mesRef = formatarCompetencia(competencia, "longo")
  const subtitulo = doPeriodo
    ? `finalizados nos últimos ${meses} meses (${formatarCompetencia(competenciaDe(periodo.primeira))} a ${formatarCompetencia(competencia)}) × não finalizados, ${sub}`
    : `finalizados no mês × não finalizados, ${sub} · ${mesRef}`

  return (
    <GraficoCartao
      id={dist.id}
      titulo={dist.titulo}
      subtitulo={subtitulo}
      tabela={{
        colunas: ["Categoria", rotuloFin, "Não finalizados"],
        linhas: fonte.itens.map((i) => [
          i.rotulo,
          n(i.finalizados),
          n(i.naoFinalizados),
        ]),
      }}
      selos={temOutros(itens) ? ["outros"] : []}
      nota={
        corrigidoPor.length > 0 &&
        !doPeriodo &&
        (dist.itens as { original?: unknown }[]).some((i) => i.original)
          ? `Valores corrigidos pela foto de ${corrigidoPor.join(" e ")}.`
          : undefined
      }
      className={className}
      acoes={
        <>
          <Toggle
            variant="outline"
            pressed={ligado}
            onPressedChange={setLigado}
            className="press gap-2"
          >
            <CalendarRangeIcon className="size-5" aria-hidden />
            Comparar período
          </Toggle>
          {ligado && (
            <select
              aria-label="Período"
              value={meses}
              onChange={(e) => setMeses(Number(e.target.value))}
              className="h-11 rounded-lg border border-input bg-card px-3 text-base text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {PERIODOS.map((m) => (
                <option key={m} value={m}>
                  Últimos {m} meses
                </option>
              ))}
            </select>
          )}
        </>
      }
    >
      <BarrasComparar itens={itens} series={series} animar={animar} tv />
    </GraficoCartao>
  )
}
