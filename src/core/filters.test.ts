import { describe, expect, it } from "vitest"
import { activeFilterCount, applyFilters, clearFilter, dateBounds, filterOptions } from "./filters"
import type { Sheet, SheetFilters } from "./types"

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const sheet: Sheet = {
  id: "s",
  name: "S",
  index: 0,
  columns: [
    { key: "status", label: "Status", type: "text", filterable: true, distinctCount: 2 },
    { key: "n", label: "N", type: "number", filterable: false, distinctCount: 3 },
    { key: "data", label: "Data", type: "date", filterable: true, distinctCount: 3 },
  ],
  rows: [
    { status: "Ok", n: 10, data: d("2025-01-10") },
    { status: "Atrasado", n: 2, data: d("2025-02-10") },
    { status: "Ok", n: 1, data: null },
    { status: null, n: 2, data: d("2025-03-10") },
  ],
}

describe("applyFilters", () => {
  it("sem filtros devolve tudo", () => {
    expect(applyFilters(sheet, {})).toHaveLength(4)
  })
  it("values: filtra por valor canônico", () => {
    expect(applyFilters(sheet, { status: { kind: "values", values: ["Ok"] } })).toHaveLength(2)
  })
  it("values: lista vazia = sem filtro", () => {
    expect(applyFilters(sheet, { status: { kind: "values", values: [] } })).toHaveLength(4)
  })
  it("values: número usa String(n) e null fica fora", () => {
    expect(applyFilters(sheet, { n: { kind: "values", values: ["2"] } })).toHaveLength(2)
    expect(applyFilters(sheet, { status: { kind: "values", values: ["Ok", "Atrasado"] } })).toHaveLength(3)
  })
  it("values: data usa ISO", () => {
    expect(applyFilters(sheet, { data: { kind: "values", values: ["2025-01-10"] } })).toHaveLength(1)
  })
  it("dateRange inclusivo, pontas abertas, nulos fora", () => {
    expect(applyFilters(sheet, { data: { kind: "dateRange", from: "2025-01-10", to: "2025-02-10" } })).toHaveLength(2)
    expect(applyFilters(sheet, { data: { kind: "dateRange", from: "2025-02-01", to: null } })).toHaveLength(2)
    expect(applyFilters(sheet, { data: { kind: "dateRange", from: null, to: "2025-01-31" } })).toHaveLength(1)
  })
  it("dateRange sem limites mantém linhas com data nula", () => {
    expect(applyFilters(sheet, { data: { kind: "dateRange", from: null, to: null } })).toHaveLength(4)
  })
  it("combina filtros (E) e ignora colunas inexistentes", () => {
    const f: SheetFilters = {
      status: { kind: "values", values: ["Ok"] },
      zzz: { kind: "values", values: ["x"] },
      data: { kind: "dateRange", from: "2025-01-01", to: null },
    }
    expect(applyFilters(sheet, f)).toHaveLength(1)
  })
})

describe("filterOptions", () => {
  it("distintos, não nulos, ordenados", () => {
    expect(filterOptions(sheet, "status")).toEqual(["Atrasado", "Ok"])
  })
  it("números em ordem numérica", () => {
    expect(filterOptions(sheet, "n")).toEqual(["1", "2", "10"])
  })
  it("coluna inexistente devolve vazio", () => {
    expect(filterOptions(sheet, "zzz")).toEqual([])
  })
})

describe("dateBounds", () => {
  it("min e max ISO", () => {
    expect(dateBounds(sheet, "data")).toEqual({ min: "2025-01-10", max: "2025-03-10" })
  })
  it("null sem datas", () => {
    expect(dateBounds(sheet, "status")).toBeNull()
    expect(dateBounds(sheet, "zzz")).toBeNull()
  })
})

describe("activeFilterCount / clearFilter", () => {
  it("conta filtros efetivos", () => {
    expect(
      activeFilterCount({
        a: { kind: "values", values: ["x"] },
        b: { kind: "values", values: [] },
        c: { kind: "dateRange", from: null, to: null },
        d: { kind: "dateRange", from: "2025-01-01", to: null },
      }),
    ).toBe(2)
  })
  it("clearFilter remove sem mutar", () => {
    const f: SheetFilters = { a: { kind: "values", values: ["x"] } }
    expect(clearFilter(f, "a")).toEqual({})
    expect(f).toHaveProperty("a")
  })
})
