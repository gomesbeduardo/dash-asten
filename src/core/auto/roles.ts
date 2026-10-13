import type { Column, Row, Sheet } from "../types"

export function normalize(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

export type PercentRole = { column: Column; scale: number } // scale: 100 se os valores são fração 0–1
export type Roles = {
  pair: { meta: Column; realizado: Column } | null
  percent: PercentRole | null
  status: Column | null
  category: Column | null
  date: Column | null
  numbers: Column[] // numéricas não identificadoras, na ordem das colunas
}

const META = /meta|objetivo|previsto|planejado|orcado|alvo/
const REALIZADO = /realizado|real\b|executado|atual|alcancado|resultado/
const PERCENT_LABEL = /%|percent|conclu|progresso|taxa/
const STATUS = /status|situacao|estado|fase/
const ID_LABEL = /^(id|cod|codigo|n[ºo°]?|numero)$/

export function numericValues(rows: Row[], key: string): number[] {
  const out: number[] = []
  for (const row of rows) {
    const v = row[key]
    if (typeof v === "number" && Number.isFinite(v)) out.push(v)
  }
  return out
}

function looksLikeId(column: Column, rows: Row[]): boolean {
  if (ID_LABEL.test(normalize(column.label))) return true
  const values = numericValues(rows, column.key)
  return values.length >= 3 && values.every((v, i) => v === i + 1)
}

function percentRole(column: Column, rows: Row[]): PercentRole | null {
  if (!PERCENT_LABEL.test(normalize(column.label))) return null
  const values = numericValues(rows, column.key)
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min < 0 || max > 100) return null
  return { column, scale: max <= 1 ? 100 : 1 }
}

export function detectRoles(sheet: Sheet): Roles {
  const { columns, rows } = sheet
  const numbers = columns.filter((c) => c.type === "number" && !looksLikeId(c, rows))
  const meta = numbers.find((c) => META.test(normalize(c.label)))
  const realizado = meta
    ? numbers.find((c) => c !== meta && REALIZADO.test(normalize(c.label)))
    : undefined
  const pairCols = new Set<Column>(meta && realizado ? [meta, realizado] : [])
  let percent: PercentRole | null = null
  for (const c of numbers) {
    if (pairCols.has(c)) continue
    percent = percentRole(c, rows)
    if (percent) break
  }
  const texts = columns.filter((c) => c.type === "text" && c.filterable)
  const status = texts.find((c) => STATUS.test(normalize(c.label))) ?? null
  let category: Column | null = null
  for (const c of texts) {
    if (c === status || c.distinctCount < 2) continue
    if (!category || c.distinctCount < category.distinctCount) category = c
  }
  return {
    pair: meta && realizado ? { meta, realizado } : null,
    percent,
    status,
    category,
    date: columns.find((c) => c.type === "date") ?? null,
    numbers,
  }
}
