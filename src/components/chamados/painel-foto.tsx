/** Peças do Painel da foto (D64): cards por Situação e gráficos com "comparar período". */
import { useMemo, useState } from "react"
import { CalendarRangeIcon } from "lucide-react"

import { formatarCompetencia } from "@/cargas"
import {
  distribuicoesFinalizadosNoPeriodo,
  type Distribuicao,
  type DistribuicaoCorrigida,
  type EntradaCompetencia,
  type ItemDistribuicao,
  type ItemDistribuicaoCorrigido,
} from "@/chamados"
import { motion, useReducedMotion } from "motion/react"
import { AnimatedNumber } from "@/components/app/motion/AnimatedNumber"
import { entryItemPagina } from "@/components/app/motion/variants"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { GraficoCartao } from "./cartoes"
import { COR } from "./graficos"
import { COR_FIN, COR_NAO, coresDasSituacoes, corDaFaixa } from "./cores"
import { tituloDimensao, tituloFaixas } from "./titulos-conclusao"
import { BarrasRefinadas, type LinhaRefinada } from "./barras-refinadas"
import { agruparSeries, temOutros, type ItemSerie } from "./logica"
import { MarcaCorrigido } from "./selos"
import { deltaDeContagem, SeloDelta, SeloNova } from "./selo-delta"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  /** Distribuições do período-base; `naoFinalizados` é null no mês sem posição (só as datas). */
  distribuicoes: {
    id: Distribuicao["id"]
    itens: {
      rotulo: string
      finalizados: number
      naoFinalizados: number | null
    }[]
  }[]
  atrasoFaixas: ItemDistribuicao[]
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
  // sem base (ou sem foto): o aviso aparece uma vez, junto de "Comparar com"; o item não repete
  if (semFoto || (anterior === null && !nova)) return null
  if (nova) return <SeloNova periodo={rotulo} />
  return <SeloDelta delta={deltaDeContagem(atual, anterior!, rotulo)} />
}

export { coresDasSituacoes }

/** Faixa única do topo (decisão 26): total à esquerda; à direita, barra empilhada por Situação e a legenda com contagem e Δ. */
export function FaixaSituacao({
  total,
  situacoes,
  anterior,
  mes,
  entrada,
  corrigidoPor = [],
  cores,
}: {
  total: number
  situacoes: ItemDistribuicaoCorrigido[]
  anterior: BaseAnterior
  mes: string
  entrada: boolean
  /** Fotos posteriores que corrigiram valores (["out/26"]); vazio = nada corrigido. */
  corrigidoPor?: string[]
  cores: Map<string, string>
}) {
  // situações que existiam no período-base e sumiram: item com 0 e a queda
  const sumidas: ItemDistribuicaoCorrigido[] = (anterior?.situacoes ?? [])
    .filter((b) => !situacoes.some((s) => s.rotulo === b.rotulo))
    .map((b) => ({ rotulo: b.rotulo, valor: 0 }))
  const reduce = useReducedMotion()
  const soma = situacoes.reduce((acc, s) => acc + s.valor, 0)
  const cor = (r: string) => cores.get(r) ?? COR.cinza
  return (
    <motion.section
      aria-label="Chamados por situação"
      variants={reduce ? undefined : entryItemPagina}
      className="rounded-lg bg-card p-7 shadow-(--shadow-card)"
    >
      <div className="flex flex-col gap-6 min-[1100px]:flex-row min-[1100px]:items-stretch min-[1100px]:gap-10">
        <article
          aria-label="Total de chamados"
          className="flex shrink-0 flex-col justify-center gap-1 min-[1100px]:min-w-60 min-[1100px]:border-r min-[1100px]:border-border/60 min-[1100px]:pr-10"
        >
          <h3 className="font-sans text-xl leading-tight font-medium text-muted-foreground">
            Total de chamados
          </h3>
          <AnimatedNumber
            value={total}
            format="integer"
            fromZero={entrada}
            className="num font-display text-[5.5rem] leading-none font-semibold text-primary"
          />
          <p className="text-base text-muted-foreground">na posição de {mes}</p>
          <Variacao
            atual={total}
            anterior={anterior ? anterior.total : null}
            rotulo={anterior?.rotulo ?? ""}
            semFoto={anterior?.semFoto}
          />
        </article>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-5">
          <div
            role="img"
            aria-label={`Situações: ${situacoes.map((s) => `${s.rotulo} ${s.valor}`).join("; ")}`}
            className="flex h-14 w-full gap-0.5 overflow-hidden rounded-lg bg-muted"
          >
            {situacoes.map((s) => (
              <div
                key={s.rotulo}
                data-situacao={s.rotulo}
                title={`${s.rotulo}: ${n(s.valor)}`}
                className="num flex min-w-1.5 items-center justify-center font-display text-lg font-semibold text-white"
                style={{
                  flexGrow: s.valor,
                  flexBasis: 0,
                  backgroundColor: cor(s.rotulo),
                }}
              >
                {soma > 0 && s.valor / soma >= 0.06 && (
                  <span aria-hidden>{n(s.valor)}</span>
                )}
              </div>
            ))}
          </div>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-x-6 gap-y-4">
            {[...situacoes, ...sumidas].map((s) => {
              const antes = anterior?.situacoes.find(
                (x) => x.rotulo === s.rotulo
              )
              return (
                <li
                  key={s.rotulo}
                  aria-label={`Situação: ${s.rotulo}`}
                  className="flex min-w-0 flex-col gap-1.5"
                >
                  <span className="flex items-center gap-2 text-lg font-medium text-foreground/80">
                    <span
                      aria-hidden
                      className="size-3.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: cor(s.rotulo) }}
                    />
                    <span className="truncate" title={s.rotulo}>
                      {s.rotulo}
                    </span>
                  </span>
                  <AnimatedNumber
                    value={s.valor}
                    format="integer"
                    fromZero={entrada}
                    className="num font-display text-4xl leading-none font-semibold text-primary"
                  />
                  <Variacao
                    atual={s.valor}
                    anterior={antes?.valor ?? null}
                    rotulo={anterior?.rotulo ?? ""}
                    nova={!!anterior && !anterior.semFoto && !antes}
                    semFoto={anterior?.semFoto}
                  />
                  {s.original !== undefined && corrigidoPor.length > 0 && (
                    <MarcaCorrigido
                      por={corrigidoPor}
                      original={n(s.original)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-base text-muted-foreground">
            Cada situação aparece como vem na planilha.
          </p>
        </div>
      </div>
    </motion.section>
  )
}

/** Cores das barras de "No mês" e da evolução: tokens de série em index.css. */
export const SERIE_FIN = COR_FIN
export const SERIE_NAO = COR_NAO

const SERIES_MES = [
  { id: "finalizados", rotulo: "Finalizados no mês", cor: COR_FIN },
  { id: "naoFinalizados", rotulo: "Não finalizados", cor: COR_NAO },
]
const SERIES_PERIODO = [
  { id: "finalizadosPeriodo", rotulo: "Finalizados no período", cor: COR_FIN },
  { id: "naoFinalizados", rotulo: "Não finalizados", cor: COR_NAO },
]
/** Mês escolhido em tom claro, o Mes Ref. no tom cheio (mesma cor = mesma medida). */
const claro = (cor: string) => `color-mix(in srgb, ${cor} 38%, white)`
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

/** Gráfico por dimensão: Mes Ref. ao lado do mês escolhido (finalizados no mês × não finalizados); "Comparar período" troca por finalizados nos últimos N meses. */
export function GraficoMes({
  dist,
  base,
  entrada,
  competencia,
  sub,
  max,
  className,
  animar,
  corrigidoPor = [],
}: {
  dist: DistribuicaoCorrigida
  /** Período-base escolhido (seletor da página); `null` sem base. */
  base: BaseAnterior
  /** Mês da carga já com os filtros aplicados; base do cálculo por período. */
  entrada: EntradaCompetencia | null
  competencia: string
  /** Complemento do subtítulo, ex.: "por atividade". */
  sub: string
  max?: number
  className?: string
  animar: boolean
  /** Fotos posteriores que corrigiram valores deste gráfico (["out/26"]). */
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
  const mesRef = formatarCompetencia(competencia)
  // com o "comparar período" ligado o gráfico mostra só o Mes Ref. (o mês escolhido não entra)
  const baseItens =
    !doPeriodo && base
      ? base.distribuicoes.find((d) => d.id === dist.id)?.itens
      : undefined
  const comBase = baseItens !== undefined && base !== null
  const rotuloBase = base?.rotulo ?? ""

  const atual = new Map(fonte.itens.map((i) => [i.rotulo, i]))
  const doMesBase = new Map((baseItens ?? []).map((i) => [i.rotulo, i]))
  const rotulos = [
    ...fonte.itens.map((i) => i.rotulo),
    ...(baseItens ?? [])
      .filter((i) => !atual.has(i.rotulo))
      .map((i) => i.rotulo),
  ]

  let series: { id: string; rotulo: string; cor: string }[]
  let linhas: ItemSerie[]
  if (!comBase) {
    series = doPeriodo ? SERIES_PERIODO : SERIES_MES
    linhas = rotulos.map((r) => ({
      rotulo: r,
      valores: [
        atual.get(r)?.finalizados ?? 0,
        atual.get(r)?.naoFinalizados ?? 0,
      ],
    }))
  } else {
    const semFoto = base.semFoto !== undefined
    series = [
      {
        id: "finBase",
        rotulo: `Finalizados ${rotuloBase}`,
        cor: claro(COR_FIN),
      },
      { id: "finAtual", rotulo: `Finalizados ${mesRef}`, cor: COR_FIN },
      ...(semFoto
        ? []
        : [
            {
              id: "naoBase",
              rotulo: `Não finalizados ${rotuloBase}`,
              cor: claro(COR_NAO),
            },
          ]),
      { id: "naoAtual", rotulo: `Não finalizados ${mesRef}`, cor: COR_NAO },
    ]
    linhas = rotulos.map((r) => ({
      rotulo: r,
      valores: [
        doMesBase.get(r)?.finalizados ?? 0,
        atual.get(r)?.finalizados ?? 0,
        ...(semFoto ? [] : [doMesBase.get(r)?.naoFinalizados ?? 0]),
        atual.get(r)?.naoFinalizados ?? 0,
      ],
    }))
  }
  const itens = max ? agruparSeries(linhas, max) : linhas
  const subtitulo = doPeriodo
    ? `finalizados nos últimos ${meses} meses (${formatarCompetencia(competenciaDe(periodo.primeira))} a ${formatarCompetencia(competencia)}) × não finalizados, ${sub}`
    : `finalizados no mês × não finalizados, ${sub}`
  const contexto = doPeriodo
    ? undefined
    : comBase
      ? `${mesRef} ao lado de ${rotuloBase}`
      : formatarCompetencia(competencia, "longo")
  // posições em `valores`: sem base [fin, nao]; com base [finBase, finAtual, (naoBase), naoAtual]
  const refinadas: LinhaRefinada[] = itens.map((i) => {
    const v = i.valores
    if (!comBase)
      return {
        rotulo: i.rotulo,
        valores: [{ valor: v[0] ?? 0 }, { valor: v[1] ?? 0 }],
      }
    const semFotoBase = base.semFoto !== undefined
    return {
      rotulo: i.rotulo,
      valores: [
        { valor: v[1] ?? 0, base: v[0] ?? 0 },
        {
          valor: v[v.length - 1] ?? 0,
          base: semFotoBase ? null : (v[2] ?? 0),
        },
      ],
    }
  })
  const notas = [
    comBase && base.semFoto
      ? `${base.semFoto}: de ${rotuloBase} só os finalizados no mês, pelas datas.`
      : null,
    corrigidoPor.length > 0 && !doPeriodo && dist.itens.some((i) => i.original)
      ? `Valores corrigidos pela posição de ${corrigidoPor.join(" e ")}.`
      : null,
  ].filter((x) => x !== null)

  return (
    <GraficoCartao
      id={dist.id}
      titulo={dist.titulo}
      conclusao={tituloDimensao(
        refinadas.map((r) => ({
          rotulo: r.rotulo,
          fin: r.valores[0].valor ?? 0,
          nao: r.valores[1].valor ?? 0,
        })),
        dist.titulo
      )}
      subtitulo={subtitulo}
      contexto={contexto}
      tabela={{
        colunas: ["Categoria", ...series.map((s) => s.rotulo)],
        linhas: itens.map((i) => [
          i.rotulo,
          ...i.valores.map((v) => (v === null ? "—" : n(v))),
        ]),
      }}
      selos={temOutros(itens) ? ["outros"] : []}
      nota={notas.length ? notas.join(" ") : undefined}
      className={className}
      acoes={
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={ligado}
                onPressedChange={setLigado}
                aria-label="Comparar período"
                className="press h-10 min-w-10 px-0 text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                <CalendarRangeIcon className="size-5" aria-hidden />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent className="text-base">
              Comparar período
            </TooltipContent>
          </Tooltip>
          {ligado && (
            <Select
              value={String(meses)}
              onValueChange={(v) => setMeses(Number(v))}
            >
              <SelectTrigger aria-label="Período" className="w-auto min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    Últimos {m} meses
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      }
    >
      <BarrasRefinadas
        linhas={refinadas}
        series={[
          {
            id: "fin",
            rotulo: doPeriodo ? "Finalizados no período" : "Finalizados no mês",
            cor: SERIE_FIN,
          },
          { id: "nao", rotulo: "Não finalizados", cor: SERIE_NAO },
        ]}
        rotuloBase={comBase ? rotuloBase : undefined}
        animar={animar}
      />
    </GraficoCartao>
  )
}

/** Em atraso por meses desde a abertura: faixas do Mes Ref. ao lado das do mês escolhido (sem posição dele, só o Mes Ref.). */
export function AtrasoMes({
  faixas,
  base,
  competencia,
  animar,
  tabelaVazia,
  className,
}: {
  faixas: ItemDistribuicao[]
  base: BaseAnterior
  competencia: string
  animar: boolean
  /** Mostrado no lugar do gráfico quando o filtro deixa o mês sem dados. */
  tabelaVazia?: boolean
  className?: string
}) {
  const mesRef = formatarCompetencia(competencia)
  const comBase = !!base && !base.semFoto && base.atrasoFaixas.length > 0
  const mapaBase = new Map(base?.atrasoFaixas.map((f) => [f.rotulo, f.valor]))
  const series = comBase
    ? [
        { id: "base", rotulo: base.rotulo, cor: claro(SERIE_NAO) },
        { id: "atual", rotulo: mesRef, cor: SERIE_NAO },
      ]
    : [{ id: "atual", rotulo: "Chamados", cor: SERIE_NAO }]
  const itens: ItemSerie[] = faixas.map((f) => ({
    rotulo: f.rotulo,
    valores: comBase ? [mapaBase.get(f.rotulo) ?? 0, f.valor] : [f.valor],
  }))
  return (
    <GraficoCartao
      id="atrasoFaixas"
      titulo="Em atraso por meses desde a abertura"
      conclusao={tituloFaixas(
        faixas.map((f) => ({ rotulo: f.rotulo, valor: f.valor })),
        "Em atraso por meses desde a abertura"
      )}
      subtitulo="não finalizados abertos antes do mês do Mes Ref."
      contexto={comBase ? `${mesRef} ao lado de ${base.rotulo}` : undefined}
      nota={
        base?.semFoto
          ? `${base.semFoto}: o atraso depende da Situação e só mostra o Mes Ref.`
          : undefined
      }
      tabela={{
        colunas: ["Categoria", ...series.map((s) => s.rotulo)],
        linhas: itens.map((i) => [
          i.rotulo,
          ...i.valores.map((v) => n(v ?? 0)),
        ]),
      }}
      className={className}
    >
      {tabelaVazia ? (
        <p className="py-10 text-center text-lg text-muted-foreground">
          Sem dados com este filtro nesta carga
        </p>
      ) : (
        <BarrasRefinadas
          linhas={itens.map((i) => ({
            rotulo: i.rotulo,
            valores: comBase
              ? [{ valor: i.valores[1] ?? 0, base: i.valores[0] ?? 0 }]
              : [{ valor: i.valores[0] ?? 0 }],
          }))}
          series={[{ id: "atual", rotulo: "Não finalizados", cor: SERIE_NAO }]}
          corDaLinha={corDaFaixa}
          rotuloBase={comBase ? base.rotulo : undefined}
          animar={animar}
        />
      )}
    </GraficoCartao>
  )
}
