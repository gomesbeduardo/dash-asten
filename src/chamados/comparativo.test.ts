import { describe, expect, it } from "vitest"
import { compararCompetencias, evolucao } from "./index"
import { sheetChamados, type LinhaChamado } from "./test-util"

// Mesma foto lida em 3 Mes Ref.: quem já foi aberto e ainda não foi finalizado conta como não finalizado.
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
    const b = c.kpis.find((k) => k.id === "naoFinalizados")!
    expect(b.a).toBe(1)
    expect(b.b).toBe(3)
    expect(b.delta).toBe(2)
    // julho não tem finalizados com SLA: sem base, sem delta
    expect(c.kpis.find((k) => k.id === "sla")!.delta).toBeNull()
  })

  it("une os rótulos das distribuições (não finalizados), 0 onde falta", () => {
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
    const nao = ev.series.find((s) => s.id === "naoFinalizados")!
    expect(nao.valores).toEqual([1, 2, 3])
    expect(nao.formato).toBe("inteiro")
    expect(ev.series.map((s) => s.id)).toContain("tempoMedio")
    expect(ev.series.map((s) => s.id)).not.toContain("backlog")
  })

  it("lista vazia", () => {
    expect(evolucao([])).toEqual({ competencias: [], series: [] })
  })
})
