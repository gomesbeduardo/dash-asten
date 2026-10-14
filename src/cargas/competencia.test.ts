import { describe, expect, it } from "vitest"
import {
  competenciaAnterior, competenciaDe, ehCompetencia, fimDaCompetencia, formatarCompetencia, inicioDaCompetencia, listarEntre,
} from "./competencia"

describe("competencia", () => {
  it("valida o formato AAAA-MM", () => {
    expect(ehCompetencia("2026-09")).toBe(true)
    expect(ehCompetencia("2026-13")).toBe(false)
    expect(ehCompetencia("2026-9")).toBe(false)
    expect(ehCompetencia("setembro")).toBe(false)
  })
  it("deriva a competência de uma data em UTC", () => {
    expect(competenciaDe(new Date(Date.UTC(2026, 8, 30, 23, 59)))).toBe("2026-09")
    expect(competenciaDe(new Date(Date.UTC(2026, 9, 1)))).toBe("2026-10")
  })
  it("calcula a anterior, virando o ano", () => {
    expect(competenciaAnterior("2026-10")).toBe("2026-09")
    expect(competenciaAnterior("2026-01")).toBe("2025-12")
  })
  it("início e fim em UTC; fim é o último dia 23:59:59.999", () => {
    expect(inicioDaCompetencia("2026-02").toISOString()).toBe("2026-02-01T00:00:00.000Z")
    expect(fimDaCompetencia("2026-02").toISOString()).toBe("2026-02-28T23:59:59.999Z")
    expect(fimDaCompetencia("2028-02").toISOString()).toBe("2028-02-29T23:59:59.999Z")
    expect(fimDaCompetencia("2026-12").toISOString()).toBe("2026-12-31T23:59:59.999Z")
  })
  it("formata curto e longo", () => {
    expect(formatarCompetencia("2026-09")).toBe("set/26")
    expect(formatarCompetencia("2026-09", "curto")).toBe("set/26")
    expect(formatarCompetencia("2026-09", "longo")).toBe("setembro de 2026")
    expect(formatarCompetencia("2026-03", "longo")).toBe("março de 2026")
  })
  it("lista competências entre duas, inclusive, em ordem crescente", () => {
    expect(listarEntre("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"])
    expect(listarEntre("2026-02", "2026-02")).toEqual(["2026-02"])
    expect(listarEntre("2026-03", "2026-01")).toEqual([])
  })
})
