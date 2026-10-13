import { describe, expect, it } from "vitest"
import type { Sheet } from "@/core"
import { chipsFor, describeFilter } from "./chips"

const sheet: Sheet = {
  id: "s",
  name: "S",
  index: 0,
  rows: [],
  columns: [
    {
      key: "a",
      label: "Área",
      type: "text",
      filterable: true,
      distinctCount: 2,
    },
    {
      key: "d",
      label: "Prazo",
      type: "date",
      filterable: true,
      distinctCount: 2,
    },
  ],
}

describe("chips de filtro", () => {
  it("descreve valores e intervalos de data em pt-BR", () => {
    expect(describeFilter({ kind: "values", values: ["TI", "RH"] })).toBe(
      "TI, RH"
    )
    expect(
      describeFilter({
        kind: "dateRange",
        from: "2026-01-05",
        to: "2026-02-10",
      })
    ).toBe("05/01/2026 a 10/02/2026")
    expect(
      describeFilter({ kind: "dateRange", from: "2026-01-05", to: null })
    ).toBe("a partir de 05/01/2026")
    expect(
      describeFilter({ kind: "dateRange", from: null, to: "2026-02-10" })
    ).toBe("até 10/02/2026")
  })
  it("usa o rótulo da coluna e ignora colunas desconhecidas", () => {
    const chips = chipsFor(sheet, {
      a: { kind: "values", values: ["TI"] },
      zz: { kind: "values", values: ["x"] },
    })
    expect(chips).toEqual([{ key: "a", label: "Área", text: "TI" }])
  })
})
