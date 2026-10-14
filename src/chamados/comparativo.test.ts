import { describe, expect, it } from "vitest"
import { compararCompetencias, evolucao, reconstruirAnteriores } from "./index"
import { sheetChamados, type LinhaChamado } from "./test-util"

// Mesmos dados, 3 competências: o backlog cresce conforme o mês avança.
const LINHAS: LinhaChamado[] = [
  { abertura: "2026-07-10", cliente: "Cli A" },
  { abertura: "2026-08-05", cliente: "Cli B" },
  { abertura: "2026-08-10", solucao: "2026-08-20", sla: "2026-08-25" },
  { abertura: "2026-09-02", cliente: "Cli C" },
]
const e = (competencia: string) => ({
  sheet: sheetChamados(LINHAS),
  competencia,
})

describe("compararCompetencias", () => {
  const comparar = () => compararCompetencias(e("2026-07"), e("2026-09"))

  it("pareia KPIs com delta = b - a", () => {
    const c = comparar()
    const b = c.kpis.find((k) => k.id === "backlog")!
    expect(b.a).toBe(1)
    expect(b.b).toBe(3)
    expect(b.delta).toBe(2)
    expect(c.kpis.find((k) => k.id === "sla")!.delta).toBeNull()
  })

  it("une os rótulos das distribuições, 0 onde falta", () => {
    const c = comparar()
    const cli = c.distribuicoes.find((d) => d.id === "cliente")!
    expect(cli.itens).toContainEqual({ rotulo: "Cli A", a: 1, b: 1 })
    expect(cli.itens).toContainEqual({ rotulo: "Cli C", a: 0, b: 1 })
    expect(cli.itens).toContainEqual({ rotulo: "Cli B", a: 0, b: 1 })
  })
})

describe("evolucao", () => {
  it("ordena por competência e dá uma série por KPI", () => {
    const ev = evolucao([e("2026-09"), e("2026-07"), e("2026-08")])
    expect(ev.competencias).toEqual(["2026-07", "2026-08", "2026-09"])
    const back = ev.series.find((s) => s.id === "backlog")!
    expect(back.valores).toEqual([1, 2, 3])
    expect(back.formato).toBe("inteiro")
    expect(ev.series.map((s) => s.id)).toContain("tempoMedio")
  })

  it("lista vazia", () => {
    expect(evolucao([])).toEqual({ competencias: [], series: [] })
  })
})

describe("reconstruirAnteriores", () => {
  const sheet = sheetChamados(LINHAS)

  it("devolve as N competências anteriores, sem carga própria, da mais antiga à mais recente", () => {
    const r = reconstruirAnteriores(sheet, "2026-02", 3)
    expect(r.map((x) => x.competencia)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ])
    expect(r.every((x) => x.cargaPropria === false && x.sheet === sheet)).toBe(
      true
    )
    expect(reconstruirAnteriores(sheet, "2026-09", 0)).toEqual([])
  })

  it("KPIs não reconstruíveis ficam null; os reconstruíveis têm valor", () => {
    const ev = evolucao(reconstruirAnteriores(sheet, "2026-09", 2))
    expect(ev.competencias).toEqual(["2026-07", "2026-08"])
    const s = (id: string) => ev.series.find((x) => x.id === id)!.valores
    expect(s("backlog")).toEqual([1, 2])
    for (const id of ["sla", "atraso", "reabertos", "aguardandoAceite"])
      expect(s(id)).toEqual([null, null])
  })

  it("evolução mista: carga própria + reconstruídas", () => {
    const ev = evolucao([
      ...reconstruirAnteriores(sheet, "2026-09", 2),
      e("2026-09"),
    ])
    const s = (id: string) => ev.series.find((x) => x.id === id)!.valores
    expect(s("backlog")).toEqual([1, 2, 3])
    expect(s("atraso")[0]).toBeNull()
    expect(s("atraso")[1]).toBeNull()
    expect(s("atraso")[2]).not.toBeNull()
  })

  it("comparar com mês reconstruído: delta null nos não reconstruíveis", () => {
    const [ant] = reconstruirAnteriores(sheet, "2026-09", 1)
    const c = compararCompetencias(ant, e("2026-09"))
    expect(c.kpis.find((k) => k.id === "atraso")!.delta).toBeNull()
    expect(c.kpis.find((k) => k.id === "backlog")!.delta).toBe(1)
  })
})
