import { describe, expect, it } from "vitest"
import {
  classificarLinha,
  classificarLinhas,
  reabertoPendente,
  ROTULO_SITUACAO_COMPETENCIA,
} from "./situacao"
import { mapearColunas } from "./mapeamento"
import {
  sheetChamados,
  sheetChamadosReab,
  type LinhaChamado,
} from "./test-util"

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

describe("reaberto pendente: a classificação segue só as datas (D34)", () => {
  const reab = (l: LinhaChamado, competencia = C) => {
    const s = sheetChamadosReab([l])
    return classificarLinha(s.rows[0], mapearColunas(s).mapa, competencia)
  }
  const base: LinhaChamado = {
    abertura: "2026-07-01",
    solucao: "2026-08-10",
    ultimaReab: "2026-09-05",
    situacao: "Em Análise",
  }
  it("reaberto depois da solução e não finalizado continua resolvido pela Data de Solução", () => {
    expect(reab(base)).toBe("resolvido-antes")
    expect(reab(base, "2026-10")).toBe("resolvido-antes")
    expect(reab(base, "2026-08")).toBe("resolvido-no-mes")
    expect(reab({ ...base, solucao: "2026-09-02" })).toBe("resolvido-no-mes")
  })
  it("a coluna de reabertura não muda a classificação", () => {
    const sem = sheetChamados([{ abertura: "2026-07-01", solucao: "2026-08-10" }])
    expect(classificarLinha(sem.rows[0], mapearColunas(sem).mapa, C)).toBe(
      reab(base)
    )
  })
})

describe("reabertoPendente", () => {
  const pend = (l: LinhaChamado) => {
    const s = sheetChamadosReab([l])
    return reabertoPendente(s.rows[0], mapearColunas(s).mapa)
  }
  const base: LinhaChamado = {
    abertura: "2026-07-01",
    solucao: "2026-08-10",
    ultimaReab: "2026-09-05",
    situacao: "Em Análise",
  }
  it("reabertura > solução e situação diferente de finalizado", () => {
    expect(pend(base)).toBe(true)
    expect(pend({ ...base, situacao: "Aguardando Aceite de Solução" })).toBe(
      true
    )
  })
  it("finalizado (qualquer caixa/acento), reabertura <= solução, ou sem datas: não", () => {
    expect(pend({ ...base, situacao: "FINALIZADO" })).toBe(false)
    expect(pend({ ...base, ultimaReab: "2026-08-10" })).toBe(false)
    expect(pend({ ...base, ultimaReab: null })).toBe(false)
    expect(pend({ ...base, solucao: null })).toBe(false)
  })
  it("sem a coluna de reabertura ou de situação: não", () => {
    const s = sheetChamados([{ abertura: "2026-07-01", solucao: "2026-08-10" }])
    expect(reabertoPendente(s.rows[0], mapearColunas(s).mapa)).toBe(false)
  })
})
