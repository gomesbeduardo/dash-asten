import { canonical } from "./format"
import type { Row, Sheet, SheetFilters } from "./types"

function isEffective(filter: SheetFilters[string]): boolean {
  return filter.kind === "values"
    ? filter.values.length > 0
    : filter.from !== null || filter.to !== null
}

export function applyFilters(sheet: Sheet, filters: SheetFilters): Row[] {
  const keys = new Set(sheet.columns.map((c) => c.key))
  const active = Object.entries(filters).filter(([key, f]) => keys.has(key) && isEffective(f))
  if (active.length === 0) return sheet.rows
  return sheet.rows.filter((row) =>
    active.every(([key, filter]) => {
      const value = canonical(row[key] ?? null)
      if (filter.kind === "values") return value !== null && filter.values.includes(value)
      if (value === null) return false
      if (filter.from !== null && value < filter.from) return false
      if (filter.to !== null && value > filter.to) return false
      return true
    }),
  )
}

export function filterOptions(sheet: Sheet, columnKey: string): string[] {
  const column = sheet.columns.find((c) => c.key === columnKey)
  if (!column) return []
  const set = new Set<string>()
  for (const row of sheet.rows) {
    const v = canonical(row[columnKey] ?? null)
    if (v !== null) set.add(v)
  }
  const list = [...set]
  if (column.type === "number") return list.sort((a, b) => Number(a) - Number(b))
  return list.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }) || (a < b ? -1 : a > b ? 1 : 0))
}

export function dateBounds(sheet: Sheet, columnKey: string): { min: string; max: string } | null {
  const column = sheet.columns.find((c) => c.key === columnKey)
  if (!column || column.type !== "date") return null
  let min: string | null = null
  let max: string | null = null
  for (const row of sheet.rows) {
    const v = row[columnKey]
    if (!(v instanceof Date)) continue
    const iso = canonical(v)
    if (iso === null) continue
    if (min === null || iso < min) min = iso
    if (max === null || iso > max) max = iso
  }
  return min !== null && max !== null ? { min, max } : null
}

export function activeFilterCount(filters: SheetFilters): number {
  return Object.values(filters).filter(isEffective).length
}

export function clearFilter(filters: SheetFilters, key: string): SheetFilters {
  const rest = { ...filters }
  delete rest[key]
  return rest
}
