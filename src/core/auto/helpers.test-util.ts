import type { CellValue, Column, ColumnType, Row, Sheet } from "../types"

type Spec = { label: string; type: ColumnType }

/** Monta uma Sheet à mão: colunas c0..cN, linhas como arrays na mesma ordem. */
export function makeSheet(specs: Spec[], data: CellValue[][]): Sheet {
  const columns: Column[] = specs.map((s, i) => {
    const key = `c${i}`
    const distinct = new Set(data.map((r) => r[i]).filter((v) => v !== null).map((v) => (v instanceof Date ? v.toISOString() : String(v))))
    return { key, label: s.label, type: s.type, filterable: s.type === "text" && distinct.size <= 50, distinctCount: distinct.size }
  })
  const rows: Row[] = data.map((r) => Object.fromEntries(r.map((v, i) => [`c${i}`, v])))
  return { id: "s", name: "Aba", index: 0, columns, rows }
}

export const d = (iso: string): Date => new Date(`${iso}T00:00:00Z`)
