/** Gráficos de Chamados (Recharts via shadcn chart). Cores só das fichas existentes; rótulo direto em cada barra. */
import { useId } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { ItemDistribuicao, FormatoKpi } from "@/chamados"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { chartGrow } from "@/components/app/motion/tokens"
import { LegendaSeries, useSeriesOcultas } from "./LegendaSeries"
import { formatarKpi, type ItemSerie, type LinhaSerie } from "./logica"

export const COR = {
  principal: "var(--chart-1)",
  verde: "var(--chart-3)",
  roxo: "var(--chart-4)",
  cinza: "var(--chart-5)",
  laranja: "#b45f06",
  atraso: "var(--late)",
} as const

const EIXO = { fontSize: "1.0000rem", fill: "#475565" }
const GRADE = "#d8dee4"
const inteiro = new Intl.NumberFormat("pt-BR")

function curto(v: unknown, max = 26) {
  const s = String(v)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function animacao(animar: boolean) {
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
}: {
  itens: ItemDistribuicao[]
  nome?: string
  corDoItem?: (item: ItemDistribuicao) => string
  animar: boolean
}) {
  const altura = Math.max(200, itens.length * 40 + 24)
  return (
    <ChartContainer
      config={Cfg(["valor", nome, COR.principal])}
      className="aspect-auto w-full"
      style={{ height: altura }}
      role="img"
      aria-label={`${nome}: ${itens.map((i) => `${i.rotulo} ${i.valor}`).join("; ")}`}
    >
      <BarChart
        data={itens}
        layout="vertical"
        margin={{ top: 4, right: 64, left: 8, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={GRADE} />
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
        <Tooltip content={<Dica />} cursor={{ fill: "#e6edf2" }} />
        <Bar
          dataKey="valor"
          name={nome}
          radius={[0, 4, 4, 0]}
          barSize={24}
          fill={COR.principal}
          {...animacao(animar)}
        >
          {itens.map((i) => (
            <Cell key={i.rotulo} fill={corDoItem?.(i) ?? COR.principal} />
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

/** Envelhecimento: uma barra por faixa; "> 180 dias" em vermelho, com rótulo escrito. */
export function BarrasFaixas({
  itens,
  animar,
}: {
  itens: ItemDistribuicao[]
  animar: boolean
}) {
  const critica = (i: ItemDistribuicao) => i.rotulo.startsWith(">")
  return (
    <ChartContainer
      config={Cfg(["valor", "Chamados", COR.principal])}
      className="aspect-auto w-full"
      style={{ height: 320 }}
      role="img"
      aria-label={`Envelhecimento do backlog: ${itens.map((i) => `${i.rotulo} ${i.valor}`).join("; ")}`}
    >
      <BarChart
        data={itens}
        margin={{ top: 40, right: 12, left: 12, bottom: 8 }}
      >
        <CartesianGrid vertical={false} stroke={GRADE} />
        <XAxis dataKey="rotulo" tick={EIXO} tickMargin={8} tickLine={false} />
        <YAxis hide />
        <Tooltip content={<Dica />} cursor={{ fill: "#e6edf2" }} />
        <Bar
          dataKey="valor"
          name="Chamados"
          radius={[4, 4, 0, 0]}
          maxBarSize={72}
          {...animacao(animar)}
        >
          {itens.map((i) => (
            <Cell
              key={i.rotulo}
              fill={critica(i) ? COR.atraso : COR.principal}
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
                      fill: "#14202b",
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
                        fontSize: ".8750rem",
                        fontWeight: 600,
                        fill: "#b42318",
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
  /** Mês reconstruído pelas datas: barra hachurada, nunca cheia. */
  reconstruido?: boolean
}

// Da mais antiga à mais recente: a última (mais recente) fica sempre no azul principal e,
// com duas séries, volta ao par cinza × azul de antes. Só fichas --chart-*, mais o laranja já usado.
const PALETA_COMPARAR = [
  COR.roxo,
  COR.verde,
  "var(--chart-2)",
  COR.laranja,
  COR.cinza,
  COR.principal,
] as const
const corDaSerie = (indice: number, total: number) =>
  PALETA_COMPARAR[PALETA_COMPARAR.length - total + indice]

/** Barras agrupadas por categoria (horizontais), uma barra por competência (2 a 6), em ordem cronológica. */
export function BarrasComparar({
  itens,
  series,
  animar,
}: {
  itens: ItemSerie[]
  series: SerieComparar[]
  animar: boolean
}) {
  const uid = useId().replace(/:/g, "")
  const n = series.length
  const coloridas = series.map((s, i) => ({ ...s, cor: corDaSerie(i, n) }))
  const dados = itens.map((i) => ({
    rotulo: i.rotulo,
    ...Object.fromEntries(series.map((s, k) => [s.id, i.valores[k]])),
  }))
  const altura = Math.max(220, itens.length * (n * 21 + 16) + 24)
  const { ocultas, alternar } = useSeriesOcultas(
    series.map((s) => s.id).join("|"),
    series.map((s) => s.id)
  )
  return (
    <div className="flex flex-col gap-3">
      <LegendaSeries
        itens={coloridas.map((s) => ({
          id: s.id,
          rotulo: s.rotulo,
          cor: s.cor,
          tracejado: s.reconstruido,
        }))}
        ocultas={ocultas}
        onAlternar={alternar}
      />
      <ChartContainer
        config={Cfg(
          ...coloridas.map((s): [string, string, string] => [
            s.id,
            s.rotulo,
            s.cor,
          ])
        )}
        className="aspect-auto w-full"
        style={{ height: altura }}
        role="img"
        aria-label={`${series.map((s) => s.rotulo).join(" contra ")}: ${itens.map((i) => `${i.rotulo} ${i.valores.map((v) => v ?? "—").join(", ")}`).join("; ")}`}
      >
        <BarChart
          // remonta ao mudar as séries: o Recharts guarda a ordem em que as barras entraram
          key={series.map((s) => s.id).join("|")}
          data={dados}
          layout="vertical"
          margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
          barGap={3}
        >
          <defs>
            {coloridas.map((s) => (
              <pattern
                key={s.id}
                id={`hachura-${uid}-${s.id}`}
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
                patternTransform="rotate(45)"
              >
                <rect width="8" height="8" fill="var(--card)" />
                <rect width="4" height="8" fill={s.cor} />
              </pattern>
            ))}
          </defs>
          <CartesianGrid horizontal={false} stroke={GRADE} />
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
          <Tooltip content={<Dica />} cursor={{ fill: "#e6edf2" }} />
          {coloridas
            .filter((s) => !ocultas.includes(s.id))
            .map((s) => (
              <Bar
                key={s.id}
                dataKey={s.id}
                name={s.rotulo}
                fill={s.reconstruido ? `url(#hachura-${uid}-${s.id})` : s.cor}
                stroke={s.cor}
                strokeWidth={2}
                radius={[0, 4, 4, 0]}
                barSize={18}
                {...animacao(animar)}
              >
                <LabelList
                  dataKey={s.id}
                  position="right"
                  className="num fill-foreground"
                  style={{ fontSize: ".9375rem", fontWeight: 600 }}
                  formatter={(v) =>
                    v == null ? "—" : inteiro.format(Number(v))
                  }
                />
              </Bar>
            ))}
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export type SerieLinha = { id: string; rotulo: string; cor: string }

/** Mini gráfico de linha. Cargas próprias: linha cheia e ponto cheio; reconstruído: tracejado e ponto vazado. */
export function LinhaMini({
  linhas,
  series,
  formato,
  animar,
}: {
  linhas: LinhaSerie[]
  series: SerieLinha[]
  formato: FormatoKpi
  animar: boolean
}) {
  const ultimo = linhas.length - 1
  const { ocultas, alternar } = useSeriesOcultas(
    `${series.map((s) => s.id).join(",")}|${linhas.map((l) => l.rotulo).join(",")}`,
    series.map((s) => s.id)
  )
  const visiveis = series.filter((s) => !ocultas.includes(s.id))
  // Eixo Y se ajusta às séries visíveis (escala legível; valores não mudam).
  const tudo = linhas.flatMap((l) =>
    visiveis.flatMap((s) => [l[`${s.id}_p`], l[`${s.id}_r`]])
  )
  const nums = tudo.filter((v): v is number => typeof v === "number")
  const max = nums.length ? Math.max(...nums) : 1
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
        style={{ height: 220 }}
        role="img"
        aria-label={series
          .map(
            (s) =>
              `${s.rotulo}: ${linhas.map((l) => `${l.rotulo} ${formatarKpi((l[`${s.id}_p`] ?? l[`${s.id}_r`]) as number | null, formato)}`).join(", ")}`
          )
          .join(". ")}
      >
        <LineChart
          data={linhas}
          margin={{ top: 12, right: 20, left: 4, bottom: 4 }}
        >
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis dataKey="rotulo" tick={EIXO} tickMargin={8} tickLine={false} />
          <YAxis
            tick={EIXO}
            width={52}
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
          {visiveis.flatMap((s) => [
            <Line
              key={`${s.id}_r`}
              dataKey={`${s.id}_r`}
              name={`${s.rotulo} (reconstruído)`}
              type="linear"
              stroke={s.cor}
              strokeWidth={3}
              strokeDasharray="6 5"
              connectNulls={false}
              legendType="none"
              dot={(p: {
                cx?: number
                cy?: number
                index?: number
                payload?: LinhaSerie
              }) =>
                p.payload &&
                !p.payload.propria &&
                p.payload[`${s.id}_r`] !== null &&
                Number.isFinite(p.cy) ? (
                  <circle
                    key={`r${p.index}`}
                    cx={p.cx}
                    cy={p.cy}
                    r={5}
                    fill="var(--card)"
                    stroke={s.cor}
                    strokeWidth={2.5}
                  />
                ) : (
                  <g key={`r${p.index}`} />
                )
              }
              activeDot={false}
              {...animacao(animar)}
            />,
            <Line
              key={`${s.id}_p`}
              dataKey={`${s.id}_p`}
              name={s.rotulo}
              type="linear"
              stroke={s.cor}
              strokeWidth={3}
              connectNulls={false}
              dot={(p: {
                cx?: number
                cy?: number
                index?: number
                payload?: LinhaSerie
              }) =>
                p.payload?.[`${s.id}_p`] !== null && Number.isFinite(p.cy) ? (
                  <circle
                    key={`p${p.index}`}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.index === ultimo ? 8 : 5}
                    fill={s.cor}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ) : (
                  <g key={`p${p.index}`} />
                )
              }
              {...animacao(animar)}
            />,
          ])}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
