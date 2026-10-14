import { describe, expect, it } from "vitest"
import {
  classificarLinha,
  classificarLinhas,
  ROTULO_SITUACAO_COMPETENCIA,
} from "./situacao"
import { mapearColunas } from "./mapeamento"
import { sheetChamados, type LinhaChamado } from "./test-util"

const C = "2026-09"
const cls = (l: LinhaChamado) => {
  const s = sheetChamados([l])
  return classificarLinha(s.rows[0], mapearColunas(s).mapa, C)
}

describe("classificarLinha (D34 revista)", () => {
  it("sem abertura", () => expect(cls({ abertura: null })).toBe("sem-abertura"))
  it("aberto após o fim da competência", () => {
    expect(cls({ abertura: "2026-10-01" })).toBe("aberto-apos")
    expect(cls({ abertura: "2026-09-30" })).toBe("aberto-no-fim")
  })
  it("sem solução ou solução depois do fim: aberto no fim", () => {
    expect(cls({ abertura: "2026-08-01" })).toBe("aberto-no-fim")
    expect(cls({ abertura: "2026-08-01", solucao: "2026-10-01" })).toBe(
      "aberto-no-fim"
    )
  })
  it("resolvido no mês (limites do mês)", () => {
    expect(cls({ abertura: "2026-08-01", solucao: "2026-09-01" })).toBe(
      "resolvido-no-mes"
    )
    expect(cls({ abertura: "2026-08-01", solucao: "2026-09-30" })).toBe(
      "resolvido-no-mes"
    )
  })
  it("resolvido antes do mês", () => {
    expect(cls({ abertura: "2026-07-01", solucao: "2026-08-31" })).toBe(
      "resolvido-antes"
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
      "aberto-apos",
      "aberto-no-fim",
    ])
  })
  it("rótulos pt-BR", () => {
    expect(ROTULO_SITUACAO_COMPETENCIA).toEqual({
      "aberto-no-fim": "Aberto no fim do mês",
      "resolvido-no-mes": "Resolvido no mês",
      "resolvido-antes": "Resolvido antes do mês",
      "aberto-apos": "Aberto após a competência",
      "sem-abertura": "Sem data de abertura",
    })
  })
})
