/** Gráficos de Chamados (Recharts via shadcn chart). Cores só das fichas existentes; rótulo direto em cada barra. */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useEffect, useState } from "react"

import type { ItemDistribuicao, FormatoKpi } from "@/chamados"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { chartGrow } from "@/components/app/motion/tokens"
import { raioBarra, SOMBRA_BARRA_SVG, TRACEJADO_GRADE } from "./barra-estilo"
import { DefsGradiente, urlGradiente } from "./barra-svg"
import { corCronologica } from "./proto-padrao"
import { LegendaSeries, useSeriesOcultas } from "./LegendaSeries"
import { formatarKpi, type ItemSerie, type LinhaSerie } from "./logica"

export const COR = {
  principal: "var(--serie-finalizados)",
  verde: "var(--chart-3)",
  roxo: "var(--chart-4)",
  cinza: "var(--chart-5)",
  atraso: "var(--vencido)",
} as const

const EIXO = { fontSize: "1.0000rem", fill: "var(--muted-foreground)" }
const EIXO_TV = { fontSize: "1.1250rem", fill: "var(--muted-foreground)" }
const GRADE = "color-mix(in srgb, var(--border) 45%, transparent)"
const inteiro = new Intl.NumberFormat("pt-BR")

function curto(v: unknown, max = 26) {
  const s = String(v)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/** Tamanho da fonte raiz (px) e altura da janela: o gráfico "TV" acompanha a tipografia fluida e a viewport. */
function useEscalaTv() {
  const ler = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    return {
      rem: Number.isFinite(rem) && rem > 0 ? rem : 16,
      vh: window.innerHeight,
    }
  }
  const [escala, setEscala] = useState(ler)
  useEffect(() => {
    const aoRedimensionar = () => setEscala(ler())
    window.addEventListener("resize", aoRedimensionar)
    return () => window.removeEventListener("resize", aoRedimensionar)
  }, [])
  return escala
}

/** Tamanho do rem em px (cresce com a viewport, D67); eixos e margens em px acompanham a fonte. */
function useRem() {
  const ler = () =>
    typeof document === "undefined"
      ? 16
      : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const [rem, setRem] = useState(ler)
  useEffect(() => {
    const aoRedimensionar = () => setRem(ler())
    window.addEventListener("resize", aoRedimensionar)
    return () => window.removeEventListener("resize", aoRedimensionar)
  }, [])
  return rem
}

export function animacao(animar: boolean) {
  return {
    isAnimationActive: animar,
    animationDuration: chartGrow,
    animationEasing: "ease-out" as const,
  }
}

type TipProps = {
  active?: boolean
  label?: string | number
  payload?: {
    name?: string
    dataKey?: string | number
    value?: unknown
    color?: string
    /** A linha de dados do ponto (traz `dica` e `<id>__o`, quando houver). */
    payload?: Record<string, unknown>
  }[]
  formatar?: (v: number) => string
}

function Dica({ active, label, payload, formatar }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover p-3 text-base shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="num font-display font-semibold">
            {p.value == null
              ? "—"
              : formatar
                ? formatar(Number(p.value))
                : inteiro.format(Number(p.value))}
          </span>
        </p>
      ))}
      {typeof payload[0]?.payload?.dica === "string" &&
        payload.some((p) => p.value == null) && (
          <p className="mt-1 text-muted-foreground">
            {payload[0].payload.dica}
          </p>
        )}
      {payload.map((p) => {
        const o = p.payload?.[`${String(p.dataKey)}__o`]
        return typeof o === "number" ? (
          <p
            key={`o-${String(p.dataKey)}`}
            className="mt-1 text-muted-foreground"
          >
            {`Corrigido (${p.name}): na posição estava ${formatar ? formatar(o) : inteiro.format(o)}`}
          </p>
        ) : null
      })}
    </div>
  )
}

function Cfg(...itens: [string, string, string][]): ChartConfig {
  return Object.fromEntries(
    itens.map(([k, label, color]) => [k, { label, color }])
  )
}

/** Ranking horizontal: rótulo na esquerda, valor na ponta de cada barra. */
export function BarrasRanking({
  itens,
  nome = "Chamados",
  corDoItem,
  animar,
  ponta,
}: {
  itens: ItemDistribuicao[]
  nome?: string
  corDoItem?: (item: ItemDistribuicao) => string
  animar: boolean
  /** Raio da ponta em px (padrão do Painel: 4); sem ele a ponta é meia espessura. */
  ponta?: number
}) {
  const altura = Math.max(200, itens.length * 40 + 24)
  return (
    <ChartContainer
      config={Cfg(["valor", nome, COR.principal])}
      className={`aspect-auto w-full ${SOMBRA_BARRA_SVG}`}
      style={{ height: altura }}
      role="img"
      aria-label={`${nome}: ${itens.map((i) => `${i.rotulo} ${i.valor}`).join("; ")}`}
    >
      <BarChart
        data={itens}
        layout="vertical"
        margin={{ top: 4, right: 64, left: 8, bottom: 4 }}
      >
        <DefsGradiente
          cores={itens.map((i) => corDoItem?.(i) ?? COR.principal)}
        />
        <CartesianGrid
          horizontal={false}
          stroke={GRADE}
          strokeDasharray={TRACEJADO_GRADE}
        />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="rotulo"
          width={220}
          tick={EIXO}
          tickFormatter={(v) => curto(v)}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<Dica />}
          cursor={{ fill: "color-mix(in srgb, var(--muted) 55%, transparent)" }}
        />
        <Bar
          dataKey="valor"
          name={nome}
          radius={raioBarra(24, "horizontal", ponta)}
          barSize={24}
          fill={COR.principal}
          {...animacao(animar)}
        >
          {itens.map((i) => (
            <Cell
              key={i.rotulo}
              fill={urlGradiente(corDoItem?.(i) ?? COR.principal)}
            />
          ))}
          <LabelList
            dataKey="valor"
            position="right"
            className="num fill-foreground"
            style={{ fontSize: "1.0000rem", fontWeight: 600 }}
            formatter={(v) => inteiro.format(Number(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** Atraso por ciclo: uma barra por faixa de meses; "7+" em vermelho, com rótulo escrito. */
export function BarrasFaixas({
  itens,
  animar,
}: {
  itens: ItemDistribuicao[]
  animar: boolean
}) {
  const critica = (i: ItemDistribuicao) => i.rotulo === "7+"
  return (
    <ChartContainer
      config={Cfg(["valor", "Chamados", COR.principal])}
      className={`aspect-auto w-full ${SOMBRA_BARRA_SVG}`}
      style={{ height: "clamp(20rem, 40vh, 44rem)" }}
      role="img"
      aria-label={`Em atraso por meses desde a abertura: ${itens.map((i) => `${i.rotulo} ${i.valor}`).join("; ")}`}
    >
      <BarChart
        data={itens}
        margin={{ top: 40, right: 12, left: 12, bottom: 8 }}
      >
        <DefsGradiente
          cores={[COR.atraso, COR.principal]}
          orientacao="vertical"
        />
        <CartesianGrid
          vertical={false}
          stroke={GRADE}
          strokeDasharray={TRACEJADO_GRADE}
        />
        <XAxis dataKey="rotulo" tick={EIXO} tickMargin={8} tickLine={false} />
        <YAxis hide />
        <Tooltip
          content={<Dica />}
          cursor={{ fill: "color-mix(in srgb, var(--muted) 55%, transparent)" }}
        />
        <Bar
          dataKey="valor"
          name="Chamados"
          radius={raioBarra(40, "vertical")}
          maxBarSize={72}
          {...animacao(animar)}
        >
          {itens.map((i) => (
            <Cell
              key={i.rotulo}
              fill={urlGradiente(
                critica(i) ? COR.atraso : COR.principal,
                "vertical"
              )}
            />
          ))}
          <LabelList
            dataKey="valor"
            position="top"
            content={(p) => {
              const { x, y, width, index, value } = p as unknown as {
                x: number
                y: number
                width: number
                index: number
                value: number
              }
              const item = itens[index]
              const cx = Number(x) + Number(width) / 2
              return (
                <g>
                  <text
                    x={cx}
                    y={Number(y) - (critica(item) ? 24 : 8)}
                    textAnchor="middle"
                    className="num"
                    style={{
                      fontSize: "1.1250rem",
                      fontWeight: 700,
                      fill: "var(--foreground)",
                    }}
                  >
                    {inteiro.format(Number(value))}
                  </text>
                  {critica(item) && (
                    <text
                      x={cx}
                      y={Number(y) - 6}
                      textAnchor="middle"
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        fill: "var(--late)",
                      }}
                    >
                      crítico
                    </text>
                  )}
                </g>
              )
            }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

export type SerieComparar = {
  id: string
  rotulo: string
  /** Cor própria da série; sem ela vale a paleta cronológica. */
  cor?: string
}

// Da mais antiga à mais recente: a última (mais recente) fica sempre no azul petróleo dos finalizados
// e as anteriores recuam para tons de contexto e da paleta curta (sem o laranja de "não finalizados"
// nem o vermelho de alerta).
const PALETA_COMPARAR = [
  "var(--contexto)",
  "var(--chart-5)",
  "var(--sit-atendimento)",
  "var(--sit-aguardando-cliente)",
  "var(--sit-aceite)",
  COR.principal,
] as const
const corDaSerie = (indice: number, total: number) =>
  PALETA_COMPARAR[PALETA_COMPARAR.length - total + indice]

/** Barras agrupadas por categoria (horizontais), uma barra por competência (2 a 6), em ordem cronológica. */
export function BarrasComparar({
  itens,
  series,
  animar,
  tv = false,
  itensParaAltura,
  padrao = false,
}: {
  itens: ItemSerie[]
  series: SerieComparar[]
  animar: boolean
  /** Acabamento do Painel: ponta de 4 px e competências em tons cronológicos. */
  padrao?: boolean
  /** Painel/TV: altura proporcional à viewport, barras e rótulos em rem (acompanham a tipografia fluida). */
  tv?: boolean
  /** Dimensiona a altura como se houvesse este número de itens (cartões lado a lado ficam com a mesma altura). */
  itensParaAltura?: number
}) {
  const n = series.length
  const { rem, vh } = useEscalaTv()
  const coloridas = series.map((s, i) => ({
    ...s,
    cor: s.cor ?? (padrao ? corCronologica(i, n) : corDaSerie(i, n)),
  }))
  const dados = itens.map((i) => ({
    rotulo: i.rotulo,
    ...Object.fromEntries(series.map((s, k) => [s.id, i.valores[k]])),
  }))
  // TV: a altura é no mínimo ~30% da viewport; se sobra espaço, a barra engrossa (1,3 a 2,6 rem).
  const barraMin = tv ? Math.round((n >= 4 ? 0.95 : 1.3) * rem) : 18
  // espaço "Médio": 0,5 rem entre barras do grupo e 1,5 rem entre categorias
  const entreBarras = Math.round(0.5 * rem)
  const folga = Math.round(1.5 * rem)
  const minimo = tv ? Math.round(vh * 0.3) : 220
  const altura = Math.max(
    minimo,
    Math.max(itens.length, itensParaAltura ?? 0) *
      (n * (barraMin + entreBarras) + folga) +
      24
  )
  const barra = tv
    ? Math.round(
        Math.min(
          2.6 * rem,
          Math.max(
            barraMin,
            ((altura - 24) / Math.max(1, itens.length) - folga) / n -
              entreBarras
          )
        )
      )
    : 18
  const { ocultas, alternar } = useSeriesOcultas(
    series.map((s) => s.id).join("|"),
    series.map((s) => s.id)
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <LegendaSeries
        itens={coloridas.map((s) => ({
          id: s.id,
          rotulo: s.rotulo,
          cor: s.cor,
        }))}
        ocultas={ocultas}
        onAlternar={alternar}
      />
      {/* o gráfico preenche o cartão: a altura calculada é o mínimo; sobrando espaço (cartão vizinho mais alto) ele cresce */}
      <div className="relative flex-1" style={{ minHeight: altura }}>
        <ChartContainer
          config={Cfg(
            ...coloridas.map((s): [string, string, string] => [
              s.id,
              s.rotulo,
              s.cor,
            ])
          )}
          className={`absolute inset-0 aspect-auto h-full w-full ${SOMBRA_BARRA_SVG}`}
          role="img"
          aria-label={`${series.map((s) => s.rotulo).join(" contra ")}: ${itens.map((i) => `${i.rotulo} ${i.valores.map((v) => v ?? "—").join(", ")}`).join("; ")}`}
        >
          <BarChart
            // remonta ao mudar as séries: o Recharts guarda a ordem em que as barras entraram
            key={series.map((s) => s.id).join("|")}
            data={dados}
            layout="vertical"
            margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
            barGap={entreBarras}
            barCategoryGap={folga}
          >
            <DefsGradiente cores={coloridas.map((s) => s.cor)} />
            <CartesianGrid
              horizontal={false}
              stroke={GRADE}
              strokeDasharray={TRACEJADO_GRADE}
            />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="rotulo"
              width={tv ? Math.round(15 * rem) : 220}
              tick={tv ? EIXO_TV : EIXO}
              tickFormatter={(v) => curto(v, tv ? 32 : 26)}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<Dica />}
              cursor={{
                fill: "color-mix(in srgb, var(--muted) 55%, transparent)",
              }}
            />
            {coloridas
              .filter((s) => !ocultas.includes(s.id))
              .map((s) => (
                <Bar
                  key={s.id}
                  dataKey={s.id}
                  name={s.rotulo}
                  fill={urlGradiente(s.cor)}
                  radius={raioBarra(barra, "horizontal", padrao ? 4 : undefined)}
                  barSize={barra}
                  {...animacao(animar)}
                >
                  <LabelList
                    dataKey={s.id}
                    position="right"
                    className="num fill-foreground"
                    style={{
                      fontSize: tv ? "1.1250rem" : "1rem",
                      fontWeight: 600,
                    }}
                    formatter={(v) =>
                      v == null ? "—" : inteiro.format(Number(v))
                    }
                  />
                </Bar>
              ))}
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}

export type SerieLinha = { id: string; rotulo: string; cor: string }

export type TipoPonto = "ultimo" | "corrigido" | "isolado" | null

/**
 * Quais pontos da série em área ganham marca: só o último mês (anel e valor), os meses corrigidos por
 * posição posterior (anel vazado, tem significado) e o ponto isolado (sem vizinho com dado, senão sumiria).
 */
export function tipoDoPonto(
  linhas: LinhaSerie[],
  id: string,
  i: number
): TipoPonto {
  const tem = (k: number) => {
    const v = linhas[k]?.[id]
    return v !== null && v !== undefined && Number.isFinite(v as number)
  }
  if (!tem(i)) return null
  if (i === linhas.length - 1) return "ultimo"
  if (linhas[i][`${id}__o`] !== undefined) return "corrigido"
  if (!tem(i - 1) && !tem(i + 1)) return "isolado"
  return null
}

/**
 * Rótulo do valor final: com duas séries visíveis, a de valor menor (ou a segunda, em empate) vai
 * abaixo do ponto e a outra acima, para os números não se sobreporem.
 */
export function rotuloFinalAbaixo(
  finais: (number | null)[],
  indice: number
): boolean {
  const v = finais[indice]
  if (v === null || v === undefined) return false
  return finais.some(
    (o, k) =>
      k !== indice && o !== null && (o > v || (o === v && k < indice))
  )
}

/** Série em área: linha de 2 px, curva suave e área a 10% de opacidade; sem pontos em todos os meses. */
export function LinhaMini({
  linhas,
  series,
  formato,
  animar,
  altura = "clamp(13rem, 22vh, 30rem)",
}: {
  linhas: LinhaSerie[]
  series: SerieLinha[]
  formato: FormatoKpi
  animar: boolean
  /** Altura CSS do gráfico; o padrão acompanha a viewport (legível na TV, D67). */
  altura?: string
}) {
  const rem = useRem()
  const { ocultas, alternar } = useSeriesOcultas(
    `${series.map((s) => s.id).join(",")}|${linhas.map((l) => l.rotulo).join(",")}`,
    series.map((s) => s.id)
  )
  const visiveis = series.filter((s) => !ocultas.includes(s.id))
  // Eixo Y se ajusta às séries visíveis (escala legível; valores não mudam).
  const tudo = linhas.flatMap((l) => visiveis.map((s) => l[s.id]))
  const nums = tudo.filter((v): v is number => typeof v === "number")
  const max = nums.length ? Math.max(...nums) : 1
  const finais = visiveis.map((s) => {
    const v = linhas[linhas.length - 1]?.[s.id]
    return typeof v === "number" ? v : null
  })
  const topo =
    formato === "percentual" ? 100 : Math.max(1, Math.ceil(max * 1.15))
  return (
    <div className="flex flex-col gap-3">
      <LegendaSeries itens={series} ocultas={ocultas} onAlternar={alternar} />
      <ChartContainer
        config={Object.fromEntries(
          series.map((s) => [s.id, { label: s.rotulo, color: s.cor }])
        )}
        className="aspect-auto w-full"
        style={{ height: altura }}
        role="img"
        aria-label={series
          .map(
            (s) =>
              `${s.rotulo}: ${linhas.map((l) => `${l.rotulo} ${formatarKpi(l[s.id] as number | null, formato)}`).join(", ")}`
          )
          .join(". ")}
      >
        <AreaChart
          data={linhas}
          margin={{
            top: 0.75 * rem,
            right: 1.5 * rem,
            left: 0.25 * rem,
            bottom: 0.25 * rem,
          }}
        >
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis
            dataKey="rotulo"
            tick={EIXO}
            tickMargin={0.5 * rem}
            tickLine={false}
            padding={{ left: 0.75 * rem, right: 0.75 * rem }}
            minTickGap={0.75 * rem}
          />
          <YAxis
            tick={EIXO}
            width={Math.round(4.25 * rem)}
            domain={[0, topo]}
            tickCount={3}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              formato === "percentual" ? `${v}%` : inteiro.format(Number(v))
            }
          />
          <Tooltip
            content={<Dica formatar={(v) => formatarKpi(v, formato)} />}
          />
          {visiveis.map((s, indiceSerie) => (
            <Area
              key={s.id}
              dataKey={s.id}
              name={s.rotulo}
              type="monotone"
              stroke={s.cor}
              strokeWidth={2}
              fill={s.cor}
              fillOpacity={0.1}
              connectNulls={false}
              dot={(p: {
                cx?: number
                cy?: number
                index?: number
                payload?: LinhaSerie
              }) => {
                const i = p.index ?? 0
                const tipo = tipoDoPonto(linhas, s.id, i)
                if (!tipo || !Number.isFinite(p.cy)) return <g key={`p${i}`} />
                const corrigido = p.payload?.[`${s.id}__o`] !== undefined
                if (tipo === "ultimo")
                  return (
                    <g key={`p${i}`}>
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r={1.1 * rem}
                        fill={s.cor}
                        opacity={0.18}
                      />
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r={0.5 * rem}
                        fill="var(--card)"
                        stroke={s.cor}
                        strokeWidth={corrigido ? 3 : 2.5}
                        strokeDasharray={corrigido ? "2 2" : undefined}
                      />
                      {visiveis.length <= 2 && (
                        <text
                          x={(p.cx ?? 0) - 0.8 * rem}
                          y={
                            (p.cy ?? 0) +
                            (rotuloFinalAbaixo(finais, indiceSerie)
                              ? 1.9 * rem
                              : -0.9 * rem)
                          }
                          textAnchor="end"
                          className="num fill-foreground"
                          style={{ fontSize: "1.125rem", fontWeight: 600 }}
                        >
                          {formatarKpi(
                            p.payload?.[s.id] as number | null,
                            formato
                          )}
                        </text>
                      )}
                    </g>
                  )
                if (tipo === "corrigido")
                  // Ponto corrigido pelas posições posteriores: anel vazado (tem significado).
                  return (
                    <circle
                      key={`p${i}`}
                      cx={p.cx}
                      cy={p.cy}
                      r={0.4 * rem}
                      fill="var(--card)"
                      stroke={s.cor}
                      strokeWidth={3}
                    />
                  )
                return (
                  <circle
                    key={`p${i}`}
                    cx={p.cx}
                    cy={p.cy}
                    r={0.3 * rem}
                    fill={s.cor}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )
              }}
              {...animacao(animar)}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
