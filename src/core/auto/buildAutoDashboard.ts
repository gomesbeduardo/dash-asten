import type { CellValue, Column, Row, Sheet } from "../types"
import type { AutoChart, AutoDashboard, AutoKpi, ChartPoint, ChartSeries, ValueFormat } from "./types"
import { detectRoles, normalize, numericValues, type PercentRole, type Roles } from "./roles"

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const MAX_CATEGORIES = 12
const DONE = /conclu|finaliz|feito|entregue/
const LATE = /atras|bloque|pausad/

const ptNumber = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const mean = (xs: number[]): number | null => (xs.length === 0 ? null : sum(xs) / xs.length)
const cmp = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }) || (a < b ? -1 : a > b ? 1 : 0)

function validDate(v: CellValue | undefined): Date | null {
  return v instanceof Date && !Number.isNaN(v.getTime()) ? v : null
}
function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7)
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-")
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`
}
function text(row: Row, key: string): string | null {
  const v = row[key]
  if (v === null || v === undefined) return null
  if (v instanceof Date) return validDate(v)?.toISOString().slice(0, 10) ?? null
  return String(v)
}
function num(row: Row, key: string): number | null {
  const v = row[key]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}
function slug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "valor"
}
function group<T>(items: T[], keyOf: (t: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = keyOf(item)
    if (k === null) continue
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

function periodOf(rows: Row[], date: Column | null): { min: string; max: string } | null {
  if (!date) return null
  const keys = rows.map((r) => validDate(r[date.key])).filter((d): d is Date => d !== null).map(monthKey).sort()
  return keys.length === 0 ? null : { min: keys[0], max: keys[keys.length - 1] }
}

function buildKpis(sheet: Sheet, rows: Row[], roles: Roles): AutoKpi[] {
  const kpis: AutoKpi[] = []
  const linhas: AutoKpi = { id: "kpi-linhas", label: "Linhas", value: rows.length, format: "integer" }
  if (rows.length !== sheet.rows.length) linhas.hint = `de ${sheet.rows.length}`
  kpis.push(linhas)

  const period = periodOf(rows, roles.date)
  if (period) {
    kpis.push({
      id: "kpi-periodo", label: "Período", value: null, format: "integer",
      display: `${monthLabel(period.min)} – ${monthLabel(period.max)}`,
    })
  }

  if (roles.pair) {
    const both = rows
      .map((r) => [num(r, roles.pair!.meta.key), num(r, roles.pair!.realizado.key)] as const)
      .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null)
    const totalMeta = sum(both.map((p) => p[0]))
    const att = totalMeta === 0 ? null : (sum(both.map((p) => p[1])) / totalMeta) * 100
    kpis.push({
      id: "kpi-atingimento", label: "Atingimento (Realizado ÷ Meta)", value: att, format: "percent",
      hint: "Realizado ÷ Meta", tone: att === null ? "neutral" : att >= 100 ? "good" : "bad",
    })
    const hit = both.filter((p) => p[1] >= p[0]).length
    kpis.push({
      id: "kpi-na-meta", label: "Na meta", value: both.length === 0 ? null : (hit / both.length) * 100,
      format: "percent", hint: `${hit} de ${both.length}`,
    })
  }

  if (roles.status) {
    const counts = group(rows, (r) => text(r, roles.status!.key))
    const values = [...counts.keys()].sort(cmp)
    const done = values.find((v) => DONE.test(normalize(v)))
    if (done) {
      const n = counts.get(done)!.length
      kpis.push({ id: "kpi-status-concluido", label: `% ${done}`, value: rows.length === 0 ? null : (n / rows.length) * 100, format: "percent", hint: `${n} de ${rows.length}` })
    }
    const late = values.filter((v) => LATE.test(normalize(v)))
    if (late.length > 0) {
      kpis.push({
        id: "kpi-atrasados", label: late.length === 1 ? late[0] : late.join(" + "),
        value: sum(late.map((v) => counts.get(v)!.length)), format: "integer", tone: "bad",
      })
    }
  }

  if (roles.percent) {
    const { column, scale } = roles.percent
    const avg = mean(numericValues(rows, column.key))
    kpis.push({ id: "kpi-media-percentual", label: `Média de ${column.label}`, value: avg === null ? null : avg * scale, format: "percent" })
  }

  const shown = new Set<Column>(roles.percent ? [roles.percent.column] : [])
  for (const c of roles.numbers) {
    if (kpis.length >= 6) break
    if (shown.has(c)) continue
    const values = numericValues(rows, c.key)
    kpis.push({
      id: `kpi-media-${slug(c.label)}`, label: `Média de ${c.label}`, value: mean(values), format: "decimal",
      hint: `total ${ptNumber(sum(values))}`,
    })
  }
  return kpis.slice(0, 6)
}

function subtitle(unit: string, period: { min: string; max: string } | null): string {
  return period ? `${unit} · ${monthLabel(period.min)} a ${monthLabel(period.max)}` : unit
}

function isHorizontal(data: ChartPoint[]): boolean {
  return data.length > 6 || data.some((p) => p.x.length > 14)
}

/** Ordena categorias por total desc, mantém as 12 maiores e devolve o resto agrupado. */
function topCategories(groups: Map<string, Row[]>): { names: string[]; others: Row[] } {
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || cmp(a[0], b[0]))
  return {
    names: sorted.slice(0, MAX_CATEGORIES).map(([k]) => k),
    others: sorted.slice(MAX_CATEGORIES).flatMap(([, v]) => v),
  }
}

function byMonth(rows: Row[], date: Column): [string, Row[]][] {
  const g = group(rows, (r) => {
    const d = validDate(r[date.key])
    return d ? monthKey(d) : null
  })
  return [...g.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

function buildCharts(rows: Row[], roles: Roles): AutoChart[] {
  const charts: AutoChart[] = []
  const period = periodOf(rows, roles.date)
  const { pair, status, category, date, percent } = roles
  const meanOf = (rs: Row[], key: string, scale = 1) => {
    const m = mean(numericValues(rs, key))
    return m === null ? null : m * scale
  }

  if (pair && (date || category)) {
    const series: ChartSeries[] = [
      { key: "meta", label: pair.meta.label, role: "meta" },
      { key: "realizado", label: pair.realizado.label, role: "realizado" },
    ]
    const point = (x: string, rs: Row[]): ChartPoint => ({
      x, meta: meanOf(rs, pair.meta.key), realizado: meanOf(rs, pair.realizado.key),
    })
    if (date) {
      charts.push({
        id: "chart-meta-realizado", kind: "line", title: `${pair.meta.label} × ${pair.realizado.label} por mês`,
        subtitle: subtitle("média por mês", period), xLabel: "Mês", series, valueFormat: "decimal",
        data: byMonth(rows, date).map(([k, rs]) => point(monthLabel(k), rs)),
      })
    } else if (category) {
      const g = group(rows, (r) => text(r, category.key))
      const { names, others } = topCategories(g)
      const data = names.map((n) => point(n, g.get(n)!))
      if (others.length > 0) data.push(point("Outros", others))
      charts.push({
        id: "chart-meta-realizado", kind: "bar", title: `${pair.meta.label} × ${pair.realizado.label} por ${category.label}`,
        subtitle: "média por categoria", xLabel: category.label, series, valueFormat: "decimal", data,
        horizontal: isHorizontal(data),
      })
    }
  }

  if (status && category) {
    const statusValues = [...new Set(rows.map((r) => text(r, status.key)).filter((v): v is string => v !== null))].sort(cmp)
    const keys = new Map<string, string>()
    const used = new Set<string>()
    for (const v of statusValues) {
      let k = slug(v)
      while (used.has(k) || k === "x") k += "-"
      used.add(k)
      keys.set(v, k)
    }
    const g = group(rows, (r) => text(r, category.key))
    const { names, others } = topCategories(g)
    const point = (x: string, rs: Row[]): ChartPoint => {
      const p: ChartPoint = { x }
      for (const v of statusValues) p[keys.get(v)!] = rs.filter((r) => text(r, status.key) === v).length
      return p
    }
    const data = names.map((n) => point(n, g.get(n)!))
    if (others.length > 0) data.push(point("Outros", others))
    charts.push({
      id: "chart-status-categoria", kind: "stackedBar", title: `${status.label} por ${category.label}`,
      subtitle: subtitle("contagem", period), xLabel: category.label, valueFormat: "integer", data,
      series: statusValues.map((v) => ({ key: keys.get(v)!, label: v, role: "default" as const })),
      horizontal: isHorizontal(data),
    })
  }

  if (date) {
    charts.push({
      id: "chart-linhas-mes", kind: "line", title: "Linhas por mês", subtitle: subtitle("contagem", period),
      xLabel: "Mês", valueFormat: "integer", series: [{ key: "linhas", label: "Linhas", role: "default" }],
      data: byMonth(rows, date).map(([k, rs]) => ({ x: monthLabel(k), linhas: rs.length })),
    })
  }

  if (category) {
    const g = group(rows, (r) => text(r, category.key))
    const { names, others } = topCategories(g)
    const data: ChartPoint[] = names.map((n) => ({ x: n, linhas: g.get(n)!.length }))
    if (others.length > 0) data.push({ x: "Outros", linhas: others.length })
    charts.push({
      id: "chart-linhas-categoria", kind: "bar", title: `Linhas por ${category.label}`, subtitle: subtitle("contagem", period),
      xLabel: category.label, valueFormat: "integer", series: [{ key: "linhas", label: "Linhas", role: "default" }],
      data, horizontal: isHorizontal(data),
    })
  }

  if (percent && category) {
    const g = group(rows, (r) => text(r, category.key))
    const { names, others } = topCategories(g)
    const point = (x: string, rs: Row[]): ChartPoint => ({ x, media: meanOf(rs, percent.column.key, percent.scale) })
    const data = names.map((n) => point(n, g.get(n)!))
    if (others.length > 0) data.push(point("Outros", others))
    charts.push({
      id: "chart-percentual-categoria", kind: "bar", title: `Média de ${percent.column.label} por ${category.label}`,
      subtitle: subtitle("média em %", period), xLabel: category.label, valueFormat: "percent",
      series: [{ key: "media", label: `Média de ${percent.column.label}`, role: "default" }],
      data, horizontal: isHorizontal(data),
    })
  }

  return charts.slice(0, 4)
}

export function buildAutoDashboard(sheet: Sheet, rows: Row[]): AutoDashboard {
  const roles = detectRoles(sheet)
  return { kpis: buildKpis(sheet, rows, roles), charts: buildCharts(rows, roles) }
}

export type { PercentRole, ValueFormat }
