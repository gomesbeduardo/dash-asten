import { describe, expect, it } from "vitest"
import { dataEmTexto, mesEmTexto } from "./mesEmTexto"

const hoje = new Date(Date.UTC(2026, 9, 14)) // 14/10/2026

const positivos: [string, string][] = [
  // nome do mês + ano, qualquer ordem e separador
  ["setembro-2026", "2026-09"],
  ["set/26", "2026-09"],
  ["SET26", "2026-09"],
  ["setembro2026", "2026-09"],
  ["2026set", "2026-09"],
  ["26-set", "2026-09"],
  ["Set de 2026", "2026-09"],
  ["setembro de 2026", "2026-09"],
  ["sep 2026", "2026-09"],
  ["2026 September", "2026-09"],
  ["Sept.2026", "2026-09"],
  ["set. 2026", "2026-09"],
  ["Março_2025", "2025-03"],
  ["MARCO.2025", "2025-03"],
  ["julho/2026", "2026-07"],
  ["Jul-26", "2026-07"],
  ["Dezembro 2025", "2025-12"],
  ["Chamados Agosto_2025", "2025-08"],
  // número + ano
  ["2026-09", "2026-09"],
  ["2026_09", "2026-09"],
  ["202609", "2026-09"],
  ["09-2026", "2026-09"],
  ["9/2026", "2026-09"],
  ["09.26", "2026-09"],
  ["2026/9", "2026-09"],
  ["chamados 07/2026", "2026-07"],
  // data completa
  ["30/09/2026", "2026-09"],
  ["30-09-26", "2026-09"],
  ["2026-09-30", "2026-09"],
  ["30.09.2026", "2026-09"],
  ["30-set-2026", "2026-09"],
  ["30set2026", "2026-09"],
  ["30 de setembro de 2026", "2026-09"],
  ["Sep 30, 2026", "2026-09"],
  ["20260930", "2026-09"],
  ["export-2026-07-15", "2026-07"],
  // ambiguidade dd/mm x mm/dd
  ["05/07/2026", "2026-07"], // padrão brasileiro dd/mm
  ["09/30/2026", "2026-09"], // 2º número > 12: mm/dd
  ["13/02/2026", "2026-02"], // 1º número > 12: dia
  // sem ano: ano mais recente em que o mês já passou
  ["setembro", "2026-09"],
  ["Dezembro", "2025-12"],
  ["Relatorio MARCO", "2026-03"],
  ["Chamados jan", "2026-01"],
  ["Orçamentário Setembro", "2026-09"],
]

const negativos = [
  "v2",
  "v10",
  "relatorio-123456",
  "codigo-1307",
  "marketing",
  "marketing 2026",
  "Setor financeiro",
  "setor-2026",
  "relatorio-202345",
  "chamado 8374",
  "dados",
  "versao 3.2",
  "2026-13",
  "2026-1307",
  "novembroX",
  "ID 20261",
]

describe("mesEmTexto", () => {
  for (const [texto, esperado] of positivos) {
    it(`"${texto}" -> ${esperado}`, () => {
      expect(mesEmTexto(texto, hoje)).toBe(esperado)
    })
  }
  for (const texto of negativos) {
    it(`"${texto}" não é competência`, () => {
      expect(mesEmTexto(texto, hoje)).toBeNull()
    })
  }
})

describe("dataEmTexto", () => {
  const d = (y: number, m: number, dia: number) => new Date(Date.UTC(y, m - 1, dia))
  it("lê datas completas em vários formatos", () => {
    expect(dataEmTexto("30/09/2026", hoje)).toEqual(d(2026, 9, 30))
    expect(dataEmTexto("2026-09-30T10:20:00", hoje)).toEqual(d(2026, 9, 30))
    expect(dataEmTexto("30-set-2026", hoje)).toEqual(d(2026, 9, 30))
    expect(dataEmTexto("09/30/2026", hoje)).toEqual(d(2026, 9, 30))
    expect(dataEmTexto("30 de setembro de 2026", hoje)).toEqual(d(2026, 9, 30))
  })
  it("sem dia ou sem ano não é data", () => {
    expect(dataEmTexto("setembro 2026", hoje)).toBeNull()
    expect(dataEmTexto("30/09", hoje)).toBeNull()
    expect(dataEmTexto("Aberto", hoje)).toBeNull()
    expect(dataEmTexto("31/02/2026", hoje)).toBeNull()
  })
})
