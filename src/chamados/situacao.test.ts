import { describe, expect, it } from "vitest"
import {
  classificarLinha,
  classificarLinhas,
  mesesAteCompetencia,
} from "./situacao"
import { mapearColunas } from "./mapeamento"
import { dia, sheetChamados, type LinhaChamado } from "./test-util"

const C = "2026-09"
const cls = (l: LinhaChamado) => {
  const s = sheetChamados([l])
  return classificarLinha(s.rows[0], mapearColunas(s).mapa, C)
}

describe("classificarLinha: posição na foto do Mes Ref. (D64)", () => {
  it("sem abertura", () => expect(cls({ abertura: null })).toBe("sem-abertura"))
  it("aberto depois do fim do Mes Ref. fica à parte; até o último dia entra", () => {
    expect(cls({ abertura: "2026-10-01" })).toBe("aberto-depois")
    expect(cls({ abertura: "2026-09-30" })).toBe("na-foto")
  })
  it("a Situação e a Data de Solução não mudam a posição (nada é deduzido pelas datas)", () => {
    expect(cls({ abertura: "2026-08-01" })).toBe("na-foto")
    expect(cls({ abertura: "2026-08-01", solucao: "2026-10-01" })).toBe(
      "na-foto"
    )
    expect(cls({ abertura: "2026-07-01", solucao: "2026-08-31" })).toBe(
      "na-foto"
    )
  })
  it("classificarLinhas mantém a ordem das linhas", () => {
    const s = sheetChamados([
      { abertura: null },
      { abertura: "2026-10-02" },
      { abertura: "2026-08-01" },
    ])
    expect(classificarLinhas(s, C)).toEqual([
      "sem-abertura",
      "aberto-depois",
      "na-foto",
    ])
  })
})

describe("mesesAteCompetencia (faixas do atraso por ciclo)", () => {
  const m = (abertura: string, c: string) =>
    mesesAteCompetencia(dia(abertura).getTime(), c)
  it("conta meses de calendário entre o mês da abertura e o Mes Ref.", () => {
    expect(m("2026-01-18", "2026-04")).toBe(3)
    expect(m("2025-12-05", "2026-04")).toBe(4)
    expect(m("2026-03-31", "2026-04")).toBe(1)
    expect(m("2026-04-01", "2026-04")).toBe(0)
  })
})
