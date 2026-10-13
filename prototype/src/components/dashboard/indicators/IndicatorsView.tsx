import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, Bar, BarChart, Cell, LabelList, ReferenceLine, XAxis, YAxis, Legend } from "recharts"
import { ArrowDownRight, ArrowUpRight, CircleSlash, Gauge, Target, Minus } from "lucide-react"
import { AREAS, MONTHS } from "@/data/mock"
import {
  attainmentByArea,
  defaultIndicatorFilters,
  filterIndicatorRows,
  indicatorChips,
  indicatorKpis,
  monthlySeries,
  removeIndicatorChip,
} from "@/lib/indicators"
import { fmtMonth, fmtNum, fmtPct, MISSING } from "@/lib/format"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartCard } from "../shared/ChartCard"
import { DataTable } from "../shared/DataTable"
import { FilterBar } from "../shared/FilterBar"
import { KpiCard } from "../shared/KpiCard"
import { MultiSelectFilter } from "../shared/MultiSelectFilter"
import type { IndicatorsViewProps } from "../shared/contracts"
import { detailColumns, toDetailRows } from "./detailColumns"

const lineConfig = {
  meta: { label: "Meta", color: "var(--chart-2)" },
  realizado: { label: "Realizado", color: "var(--chart-1)" },
} satisfies ChartConfig

const barConfig = { pct: { label: "Atingimento", color: "var(--chart-1)" } } satisfies ChartConfig

const AXIS = { fontSize: 14, fill: "var(--foreground)" }
type SeriesKey = "meta" | "realizado"

function PeriodSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((m) => (
            <SelectItem key={m} value={m}>
              {fmtMonth(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function IndicatorsView({ rows, filters, onFiltersChange }: IndicatorsViewProps) {
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({ meta: false, realizado: false })

  const filtered = useMemo(() => filterIndicatorRows(rows, filters), [rows, filters])
  const kpis = useMemo(() => indicatorKpis(filtered), [filtered])
  const series = useMemo(() => monthlySeries(filtered), [filtered])
  const byArea = useMemo(() => attainmentByArea(filtered), [filtered])
  const detail = useMemo(() => toDetailRows(filtered), [filtered])
  const indicatorOptions = useMemo(
    () =>
      [...new Set(rows.filter((r) => filters.areas.length === 0 || filters.areas.includes(r.area)).map((r) => r.indicador))].sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
    [rows, filters.areas]
  )

  const isEmpty = filtered.length === 0
  const period = `${fmtMonth(filters.de)} a ${fmtMonth(filters.ate)}`
  const toggle = (k: SeriesKey) => setHidden((h) => ({ ...h, [k]: !h[k] }))

  const variacao = kpis.variacao
  const varTone = variacao === null || Math.abs(variacao) < 0.05 ? "neutral" : variacao > 0 ? "good" : "bad"
  const VarIcon = variacao === null || varTone === "neutral" ? Minus : variacao > 0 ? ArrowUpRight : ArrowDownRight
  const barMax = Math.max(120, Math.ceil(Math.max(...byArea.map((a) => a.pct ?? 0)) / 10) * 10 + 10)

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        chips={indicatorChips(filters)}
        onRemoveChip={(id) => onFiltersChange(removeIndicatorChip(filters, id))}
        onClear={() => onFiltersChange(defaultIndicatorFilters)}
      >
        <MultiSelectFilter
          label="Área"
          options={AREAS}
          value={filters.areas}
          onChange={(areas) => {
            const allowed = new Set(rows.filter((r) => areas.length === 0 || areas.includes(r.area)).map((r) => r.indicador))
            onFiltersChange({ ...filters, areas, indicadores: filters.indicadores.filter((i) => allowed.has(i)) })
          }}
        />
        <MultiSelectFilter
          label="Indicador"
          options={indicatorOptions}
          value={filters.indicadores}
          onChange={(indicadores) => onFiltersChange({ ...filters, indicadores })}
        />
        <PeriodSelect
          label="Mês inicial"
          value={filters.de}
          options={MONTHS.filter((m) => m <= filters.ate)}
          onChange={(de) => onFiltersChange({ ...filters, de })}
        />
        <PeriodSelect
          label="Mês final"
          value={filters.ate}
          options={MONTHS.filter((m) => m >= filters.de)}
          onChange={(ate) => onFiltersChange({ ...filters, ate })}
        />
      </FilterBar>

      <section aria-label="Indicadores-chave" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Na meta em ${kpis.mesRef ? fmtMonth(kpis.mesRef) : MISSING}`}
          value={fmtPct(kpis.pctNaMeta, 0)}
          hint={`${kpis.qtdNaMeta} de ${kpis.qtdAvaliados} indicadores`}
          icon={<Target className="size-5" aria-hidden />}
          tone={kpis.pctNaMeta === null ? "neutral" : kpis.pctNaMeta >= 70 ? "good" : "bad"}
        />
        <KpiCard
          label="Atingimento"
          value={fmtPct(kpis.atingimento, 1)}
          hint="Realizado somado ÷ meta somada"
          icon={<Gauge className="size-5" aria-hidden />}
          tone={kpis.atingimento === null ? "neutral" : kpis.atingimento >= 100 ? "good" : "bad"}
        />
        <KpiCard
          label={`Variação vs ${kpis.mesAnterior ? fmtMonth(kpis.mesAnterior) : "mês anterior"}`}
          value={variacao === null ? MISSING : `${variacao > 0 ? "+" : ""}${fmtNum(variacao, 1)} p.p.`}
          hint="Atingimento, em pontos percentuais"
          tone={varTone}
          icon={<VarIcon className="size-5" aria-hidden />}
        />
        <KpiCard
          label="Valores ausentes"
          value={kpis.mesRef ? String(kpis.ausentes) : MISSING}
          hint={kpis.mesRef ? `Sem meta ou realizado em ${fmtMonth(kpis.mesRef)}` : "Sem dados no período"}
          tone={kpis.ausentes > 0 ? "bad" : "neutral"}
          icon={<CircleSlash className="size-5" aria-hidden />}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Meta vs realizado por mês"
          subtitle={`Média dos indicadores (pontos) · ${period}`}
          isEmpty={isEmpty}
          dataView={
            <table className="w-full text-base">
              <caption className="sr-only">Meta e realizado por mês</caption>
              <thead>
                <tr className="text-left">
                  <th className="py-1.5 pr-4">Mês</th>
                  <th className="py-1.5 pr-4 text-right">Meta</th>
                  <th className="py-1.5 text-right">Realizado</th>
                </tr>
              </thead>
              <tbody>
                {series.map((p) => (
                  <tr key={p.mes} className="border-t">
                    <td className="py-1.5 pr-4">{p.label}</td>
                    <td className="num py-1.5 pr-4 text-right">{fmtNum(p.meta)}</td>
                    <td className="num py-1.5 text-right">{fmtNum(p.realizado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <ChartContainer config={lineConfig} className="h-[340px] w-full">
            <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} domain={["auto", "auto"]} tickFormatter={(v: number) => fmtNum(v, 0)} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend
                verticalAlign="top"
                align="left"
                content={() => (
                  <div className="mb-2 flex gap-2">
                    {(["meta", "realizado"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={!hidden[k]}
                        onClick={() => toggle(k)}
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-base font-medium transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                          hidden[k] ? "opacity-40 line-through" : ""
                        }`}
                      >
                        <svg width="28" height="8" aria-hidden>
                          <line
                            x1="0"
                            y1="4"
                            x2="28"
                            y2="4"
                            stroke={lineConfig[k].color}
                            strokeWidth="3"
                            strokeDasharray={k === "meta" ? "6 4" : undefined}
                          />
                        </svg>
                        {lineConfig[k].label}
                      </button>
                    ))}
                  </div>
                )}
              />
              <Line
                dataKey="meta"
                hide={hidden.meta}
                stroke="var(--color-meta)"
                strokeWidth={2.5}
                strokeDasharray="7 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                dataKey="realizado"
                hide={hidden.realizado}
                stroke="var(--color-realizado)"
                strokeWidth={3.5}
                dot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          className="xl:col-span-2"
          title="Atingimento por área"
          subtitle={`Realizado ÷ meta (%) · ${period}`}
          isEmpty={isEmpty}
          dataView={
            <table className="w-full text-base">
              <caption className="sr-only">Atingimento por área</caption>
              <thead>
                <tr className="text-left">
                  <th className="py-1.5 pr-4">Área</th>
                  <th className="py-1.5 pr-4 text-right">Atingimento</th>
                  <th className="py-1.5">Situação</th>
                </tr>
              </thead>
              <tbody>
                {byArea.map((a) => (
                  <tr key={a.area} className="border-t">
                    <td className="py-1.5 pr-4">{a.area}</td>
                    <td className="num py-1.5 pr-4 text-right">{fmtPct(a.pct, 1)}</td>
                    <td className="py-1.5">{a.pct === null ? "Sem dado" : a.pct >= 100 ? "Na meta" : "Abaixo da meta"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <ChartContainer config={barConfig} className="h-[340px] w-full">
            <BarChart data={byArea} layout="vertical" margin={{ top: 32, right: 72, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, barMax]} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="area" tick={AXIS} tickLine={false} axisLine={false} width={96} />
              <ReferenceLine x={100} stroke="var(--foreground)" strokeDasharray="5 4" strokeWidth={2} label={{ value: "Meta 100%", position: "top", fontSize: 14, fill: "var(--foreground)" }} />
              <Bar dataKey="pct" barSize={26} radius={4} isAnimationActive={false}>
                {byArea.map((a) => (
                  <Cell key={a.area} fill={a.pct !== null && a.pct < 100 ? "var(--late)" : "var(--chart-3)"} />
                ))}
                <LabelList
                  dataKey="pct"
                  position="right"
                  content={(p) => {
                    const { x, y, width, height, value } = p as unknown as { x: number; y: number; width: number; height: number; value: number | null }
                    if (value === null || value === undefined) return null
                    const below = value < 100
                    return (
                      <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" fontSize={14} fontWeight={600} fill={below ? "var(--late)" : "var(--foreground)"}>
                        {below ? "▼ " : "✓ "}
                        {fmtPct(value, 1)}
                      </text>
                    )
                  }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <DataTable caption="Detalhe dos indicadores" data={detail} columns={detailColumns} pageSize={10} />
    </div>
  )
}
