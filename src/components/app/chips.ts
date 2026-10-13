import type { ColumnFilter, Sheet, SheetFilters } from "@/core"

const brDate = (iso: string) => iso.split("-").reverse().join("/")

export function describeFilter(filter: ColumnFilter): string {
  if (filter.kind === "values") return filter.values.join(", ")
  if (filter.from && filter.to)
    return `${brDate(filter.from)} a ${brDate(filter.to)}`
  if (filter.from) return `a partir de ${brDate(filter.from)}`
  if (filter.to) return `até ${brDate(filter.to)}`
  return ""
}

export function chipsFor(sheet: Sheet, filters: SheetFilters) {
  return Object.entries(filters).flatMap(([key, filter]) => {
    const column = sheet.columns.find((c) => c.key === key)
    return column
      ? [{ key, label: column.label, text: describeFilter(filter) }]
      : []
  })
}
