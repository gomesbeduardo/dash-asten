import { useEffect, useState } from "react"
import { TableIcon, ChartColumnIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

import type { AutoChart, ChartSeries } from "@/core"
import { Toggle } from "@/components/ui/toggle"
import { ToggleSerie } from "@/components/ui/toggle-serie"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { chartGrow } from "../motion/tokens"
import { entryItem } from "../motion/variants"
import { formatValue } from "../motion/format"
import { cn } from "@/lib/utils"
import { lineDomain, statusColors, statusOrder } from "./chartTheme"

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#b45f06",
]
const AXIS = { fontSize: 14, fill: "#475565" }

export function seriesColor(
  s: ChartSeries,
  index: number,
  statusColor?: string
): string {
  if (statusColor) return statusColor
  if (s.role === "meta") return "var(--chart-2)"
  if (s.role === "realizado") return "#043f63"
  return PALETTE[index % PALETTE.length]
}

function shorten(v: unknown, max = 22) {
  const s = String(v)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

type TipProps = {
  active?: boolean
  label?: string | number
  payload?: { dataKey?: string | number; value?: unknown }[]
  chart: AutoChart
}

function Tip({ active, label, payload, chart }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover p-3 text-base shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => {
        const s = chart.series.find((x) => x.key === p.dataKey)
        return (
          <p key={String(p.dataKey)} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{s?.label}</span>
            <span className="num font-display font-semibold">
              {formatValue(p.value as number | null, chart.valueFormat)}
            </span>
          </p>
        )
      })}
    </div>
  )
}

function DataTable({ chart }: { chart: AutoChart }) {
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-left text-base">
        <caption className="sr-only">{chart.title}: dados do gráfico</caption>
        <thead>
          <tr className="border-b-2 border-primary/30 text-primary">
            <th scope="col" className="px-3 py-2 font-display font-semibold">
              {chart.xLabel}
            </th>
            {chart.series.map((s) => (
              <th
                key={s.key}
                scope="col"
                className="px-3 py-2 text-right font-display font-semibold"
              >
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.data.map((d, i) => (
            <tr key={`${d.x}-${i}`} className="border-b">
              <th scope="row" className="px-3 py-2 font-normal">
                {d.x}
              </th>
              {chart.series.map((s) => (
                <td key={s.key} className="num px-3 py-2 text-right">
                  {formatValue(d[s.key] as number | null, chart.valueFormat)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AutoChartCard({
  chart,
  main = false,
  entry,
}: {
  chart: AutoChart
  main?: boolean
  entry: boolean
}) {
  const reduce = useReducedMotion()
  const [hidden, setHidden] = useState<string[]>([])
  const [showTable, setShowTable] = useState(false)
  // Revisita: monta sem animar; depois liga, para o filtro só transitar valores.
  const [armed, setArmed] = useState(entry)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 0)
    return () => clearTimeout(t)
  }, [])
  const animated = !reduce && armed

  const horizontal = chart.horizontal && chart.kind !== "line"
  const height = main ? 420 : 300
  const hHeight = horizontal
    ? Math.max(height, chart.data.length * 40 + 40)
    : height
  const stacked = chart.kind === "stackedBar"
  const colorsByStatus = stacked ? statusColors(chart.series) : null
  const config: ChartConfig = Object.fromEntries(
    chart.series.map((s, i) => [
      `s${i}`,
      { label: s.label, color: seriesColor(s, i, colorsByStatus?.[i]) },
    ])
  )
  const empty = chart.data.length === 0
  const common = {
    isAnimationActive: animated,
    animationDuration: chartGrow,
    animationEasing: "ease-out" as const,
  }

  const order = stacked
    ? statusOrder(chart.series)
    : chart.series.map((_, i) => i)
  const series = order.map((i) => ({
    s: chart.series[i],
    color: seriesColor(chart.series[i], i, colorsByStatus?.[i]),
    hide: hidden.includes(chart.series[i].key),
  }))
  const lineValues =
    chart.kind === "line"
      ? series
          .filter((x) => !x.hide)
          .flatMap(({ s }) => chart.data.map((d) => d[s.key]))
          .filter((v): v is number => typeof v === "number")
      : []

  const chartBody =
    chart.kind === "line" ? (
      <LineChart
        data={chart.data}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        <CartesianGrid vertical={false} stroke="#d8dee4" />
        <XAxis
          dataKey="x"
          tick={AXIS}
          tickFormatter={(v) => shorten(v)}
          tickMargin={8}
        />
        <YAxis
          tick={AXIS}
          width={72}
          domain={lineDomain(lineValues)}
          allowDecimals={chart.valueFormat !== "integer"}
          tickFormatter={(v) => formatValue(v, chart.valueFormat)}
        />
        <Tooltip content={<Tip chart={chart} />} />
        {series.map(({ s, color, hide }) => (
          <Line
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stroke={color}
            strokeWidth={3}
            strokeDasharray={s.role === "meta" ? "8 6" : undefined}
            dot={s.role === "meta" ? false : { r: 4, fill: color }}
            hide={hide}
            connectNulls
            {...common}
          />
        ))}
      </LineChart>
    ) : (
      <BarChart
        data={chart.data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        <CartesianGrid
          horizontal={!horizontal}
          vertical={horizontal}
          stroke="#d8dee4"
        />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tick={AXIS}
              tickFormatter={(v) => formatValue(v, chart.valueFormat)}
            />
            <YAxis
              type="category"
              dataKey="x"
              tick={AXIS}
              width={170}
              tickFormatter={(v) => shorten(v)}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="x"
              tick={AXIS}
              tickFormatter={(v) => shorten(v)}
              tickMargin={8}
            />
            <YAxis
              tick={AXIS}
              width={72}
              tickFormatter={(v) => formatValue(v, chart.valueFormat)}
            />
          </>
        )}
        <Tooltip content={<Tip chart={chart} />} cursor={{ fill: "#e6edf2" }} />
        {series.map(({ s, color, hide }) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={color}
            stackId={chart.kind === "stackedBar" ? "a" : undefined}
            radius={chart.kind === "stackedBar" ? 0 : 3}
            hide={hide}
            {...common}
          />
        ))}
      </BarChart>
    )

  return (
    <motion.section
      variants={reduce ? undefined : entryItem}
      aria-label={chart.title}
      className="flex min-w-0 flex-col gap-3 rounded-lg bg-card p-5 shadow-(--shadow-card)"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            className={cn(
              "font-display font-semibold text-primary",
              main ? "text-3xl" : "text-2xl"
            )}
          >
            {chart.title}
          </h3>
          <p className="text-base text-muted-foreground">{chart.subtitle}</p>
        </div>
        {!empty && (
          <Toggle
            variant="outline"
            pressed={showTable}
            onPressedChange={setShowTable}
            className="press shrink-0 gap-2"
          >
            {showTable ? (
              <ChartColumnIcon className="size-5" aria-hidden />
            ) : (
              <TableIcon className="size-5" aria-hidden />
            )}
            Ver dados
          </Toggle>
        )}
      </header>

      {empty ? (
        <p className="py-12 text-center text-lg text-muted-foreground">
          Sem dados para este filtro
        </p>
      ) : (
        <>
          {chart.series.length > 1 && (
            <ul className="flex flex-wrap gap-2" aria-label="Séries">
              {series.map(({ s, color, hide }) => (
                <li key={s.key}>
                  <ToggleSerie
                    ligada={!hide}
                    cor={color}
                    tracejado={s.role === "meta"}
                    rotulo={s.label}
                    onAlternar={() =>
                      setHidden((h) =>
                        h.includes(s.key)
                          ? h.filter((k) => k !== s.key)
                          : [...h, s.key]
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {showTable && <DataTable chart={chart} />}
          <div hidden={showTable}>
            <ChartContainer
              config={config}
              className="aspect-auto w-full"
              style={{ height: hHeight }}
              role="img"
              aria-label={`${chart.title}. ${chart.subtitle}`}
            >
              {chartBody}
            </ChartContainer>
          </div>
        </>
      )}
    </motion.section>
  )
}
