import { describe, expect, it } from "vitest"
import type { Sheet, Workbook } from "@/core"
import { inferirCompetencia } from "./inferirCompetencia"

const hoje = new Date(Date.UTC(2026, 9, 14))
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

function wb(abas: string[], datas: (Date | null)[] = []): Workbook {
  const sheets: Sheet[] = abas.map((name, index) => ({
    id: `aba-${index}`, name, index,
    columns: datas.length
      ? [{ key: "d", label: "D", type: "date", filterable: true, distinctCount: datas.length }]
      : [],
    rows: datas.map((d) => ({ d })),
  }))
  return { fileName: "x.xlsx", importedAt: new Date(), sheets }
}

describe("inferirCompetencia", () => {
  it("mês na aba, ano mais recente <= hoje", () => {
    expect(inferirCompetencia(wb(["Orçamentário Setembro"]), "dados.xlsx", hoje)).toEqual({ competencia: "2026-09", origem: "aba" })
  })
  it("mês depois de hoje cai no ano anterior", () => {
    expect(inferirCompetencia(wb(["Dezembro"]), "a.xlsx", hoje)).toEqual({ competencia: "2025-12", origem: "aba" })
  })
  it("usa o ano de 4 dígitos quando presente", () => {
    expect(inferirCompetencia(wb(["Março 2024"]), "a.xlsx", hoje).competencia).toBe("2024-03")
  })
  it("aceita abreviação, marco sem acento e ignora palavras parecidas", () => {
    expect(inferirCompetencia(wb(["Relatorio MARCO"]), "a.xlsx", hoje).competencia).toBe("2026-03")
    expect(inferirCompetencia(wb(["Chamados jan"]), "a.xlsx", hoje).competencia).toBe("2026-01")
    expect(inferirCompetencia(wb(["Setor financeiro"]), "a.xlsx", hoje).origem).toBe("mes-anterior")
  })
  it("sem mês na aba, procura no nome do arquivo", () => {
    expect(inferirCompetencia(wb(["Dados"]), "Chamados_Agosto_2025.xlsx", hoje)).toEqual({ competencia: "2025-08", origem: "arquivo" })
  })
  it("aba tem prioridade sobre o arquivo", () => {
    expect(inferirCompetencia(wb(["Julho"]), "agosto.xlsx", hoje).competencia).toBe("2026-07")
  })
  it("sem mês, usa a data máxima se for do mês atual ou anterior", () => {
    expect(inferirCompetencia(wb(["Dados"], [utc(2026, 9, 3), utc(2026, 9, 28), utc(1899, 12, 30)]), "a.xlsx", hoje))
      .toEqual({ competencia: "2026-09", origem: "datas" })
    expect(inferirCompetencia(wb(["Dados"], [utc(2026, 10, 2)]), "a.xlsx", hoje).competencia).toBe("2026-10")
  })
  it("data máxima antiga ou ausente: mês anterior a hoje", () => {
    expect(inferirCompetencia(wb(["Dados"], [utc(2025, 3, 3)]), "a.xlsx", hoje)).toEqual({ competencia: "2026-09", origem: "mes-anterior" })
    expect(inferirCompetencia(wb(["Dados"], [utc(1900, 1, 1)]), "a.xlsx", hoje).origem).toBe("mes-anterior")
    expect(inferirCompetencia(wb(["Dados"]), "a.xlsx", hoje).origem).toBe("mes-anterior")
  })
  describe("mês em número junto do ano", () => {
    const casos: [string, string][] = [
      ["chamados-2026-07-ficticio.xlsx", "2026-07"],
      ["dados_2026_08.xlsx", "2026-08"],
      ["dados.2026.09.xlsx", "2026-09"],
      ["chamados202607.xlsx", "2026-07"],
      ["chamados-07-2026.xlsx", "2026-07"],
      ["chamados_08_2026.xlsx", "2026-08"],
      ["chamados.09.2026.xlsx", "2026-09"],
      ["chamados 07/2026.xlsx", "2026-07"],
      ["chamados-7-2026.xlsx", "2026-07"],
      ["export-2026-07-15.xlsx", "2026-07"],
      ["chamados-2026-09-v2-correcao.xlsx", "2026-09"],
    ]
    for (const [nome, esperado] of casos) {
      it(`arquivo ${nome}`, () => {
        expect(inferirCompetencia(wb(["Dados"]), nome, hoje)).toEqual({ competencia: esperado, origem: "arquivo" })
      })
    }
    it("aba com número", () => {
      expect(inferirCompetencia(wb(["2026-07"]), "x.xlsx", hoje)).toEqual({ competencia: "2026-07", origem: "aba" })
    })
    it("não confunde outros números", () => {
      for (const nome of ["relatorio-123456.xlsx", "v2.xlsx", "codigo-1307.xlsx"]) {
        expect(inferirCompetencia(wb(["Dados"]), nome, hoje).origem).toBe("mes-anterior")
      }
    })
  })
})
