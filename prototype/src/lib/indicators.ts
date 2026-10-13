import { AREAS, MONTHS, type IndicatorRow } from "@/data/mock"
import { fmtMonth } from "@/lib/format"

export type IndicatorFilters = {
  areas: string[]
  indicadores: string[]
  de: string
  ate: string
}

export const defaultIndicatorFilters: IndicatorFilters = {
  areas: [],
  indicadores: [],
  de: MONTHS[0],
  ate: MONTHS[MONTHS.length - 1],
}

export type Chip = { id: string; group: string; label: string }

export function filterIndicatorRows(rows: IndicatorRow[], f: IndicatorFilters): IndicatorRow[] {
  return rows.filter(
    (r) =>
      (f.areas.length === 0 || f.areas.includes(r.area)) &&
      (f.indicadores.length === 0 || f.indicadores.includes(r.indicador)) &&
      r.mes >= f.de &&
      r.mes <= f.ate
  )
}

export function indicatorChips(f: IndicatorFilters): Chip[] {
  const chips: Chip[] = []
  f.areas.forEach((a) => chips.push({ id: `area:${a}`, group: "Área", label: a }))
  f.indicadores.forEach((i) => chips.push({ id: `ind:${i}`, group: "Indicador", label: i }))
  if (f.de !== defaultIndicatorFilters.de || f.ate !== defaultIndicatorFilters.ate) {
    chips.push({ id: "periodo", group: "Período", label: `${fmtMonth(f.de)} a ${fmtMonth(f.ate)}` })
  }
  return chips
}

export function removeIndicatorChip(f: IndicatorFilters, id: string): IndicatorFilters {
  if (id === "periodo") return { ...f, de: defaultIndicatorFilters.de, ate: defaultIndicatorFilters.ate }
  const [kind, ...rest] = id.split(":")
  const value = rest.join(":")
  if (kind === "area") return { ...f, areas: f.areas.filter((a) => a !== value) }
  return { ...f, indicadores: f.indicadores.filter((a) => a !== value) }
}

type Pair = { meta: number; realizado: number }
const pairs = (rows: IndicatorRow[]): Pair[] =>
  rows.flatMap((r) => (r.meta !== null && r.realizado !== null ? [{ meta: r.meta, realizado: r.realizado }] : []))

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export type IndicatorKpis = {
  mesRef: string | null
  mesAnterior: string | null
  pctNaMeta: number | null
  qtdNaMeta: number
  qtdAvaliados: number
  atingimento: number | null // Σ realizado / Σ meta, em %
  variacao: number | null // pontos percentuais vs mês anterior
  ausentes: number
}

function attainment(rows: IndicatorRow[]): number | null {
  const p = pairs(rows)
  const m = sum(p.map((x) => x.meta))
  return p.length === 0 || m === 0 ? null : (sum(p.map((x) => x.realizado)) / m) * 100
}

export function indicatorKpis(rows: IndicatorRow[]): IndicatorKpis {
  const months = [...new Set(rows.map((r) => r.mes))].sort()
  const mesRef = months.at(-1) ?? null
  const mesAnterior = months.at(-2) ?? null
  const ref = rows.filter((r) => r.mes === mesRef)
  const p = pairs(ref)
  const na = p.filter((x) => x.realizado >= x.meta).length
  const prevAtt = mesAnterior ? attainment(rows.filter((r) => r.mes === mesAnterior)) : null
  const att = attainment(ref)
  return {
    mesRef,
    mesAnterior,
    pctNaMeta: p.length ? (na / p.length) * 100 : null,
    qtdNaMeta: na,
    qtdAvaliados: p.length,
    atingimento: att,
    variacao: att !== null && prevAtt !== null ? att - prevAtt : null,
    ausentes: ref.filter((r) => r.realizado === null || r.meta === null).length,
  }
}

export type MonthPoint = { mes: string; label: string; meta: number | null; realizado: number | null }

/** Média simples de meta e de realizado por mês (índice fictício em pontos). */
export function monthlySeries(rows: IndicatorRow[]): MonthPoint[] {
  const months = [...new Set(rows.map((r) => r.mes))].sort()
  return months.map((mes) => {
    const p = pairs(rows.filter((r) => r.mes === mes))
    return {
      mes,
      label: fmtMonth(mes),
      meta: p.length ? sum(p.map((x) => x.meta)) / p.length : null,
      realizado: p.length ? sum(p.map((x) => x.realizado)) / p.length : null,
    }
  })
}

export type AreaPoint = { area: string; pct: number | null }

export function attainmentByArea(rows: IndicatorRow[]): AreaPoint[] {
  return AREAS.filter((a) => rows.some((r) => r.area === a)).map((area) => ({
    area,
    pct: attainment(rows.filter((r) => r.area === area)),
  }))
}
