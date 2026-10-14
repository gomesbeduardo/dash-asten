import type { CellValue } from "./types"
import type { Column, ColumnType } from "./types"

/** Data em ISO YYYY-MM-DD, sempre em UTC (evita deslocar o dia por fuso). */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Forma canônica usada em filtros: texto como está, número String(n), data ISO. */
export function canonical(value: CellValue): string | null {
  if (value === null) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : toIsoDate(value)
  return typeof value === "number" ? String(value) : value
}

export function formatCell(value: CellValue, type: ColumnType): string {
  if (value === null) return "—"
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—"
    const [y, m, d] = toIsoDate(value).split("-")
    return `${d}/${m}/${y}`
  }
  if (typeof value === "number" && type !== "text") {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  }
  return String(value)
}

/** Como formatCell, mas respeita Column.format (identificadores sem separador de milhar). */
export function formatColumnValue(value: CellValue, column: Column): string {
  if (column.format === "id" && typeof value === "number") return String(value)
  return formatCell(value, column.type)
}
