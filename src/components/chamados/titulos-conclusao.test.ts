import { describe, expect, it } from "vitest"

import {
  tituloAreaSla,
  tituloClienteSituacao,
  tituloDimensao,
  tituloFaixas,
  tituloOperadorAtraso,
  tituloTempo,
} from "./titulos-conclusao"

const FIXO = "Por cliente"

describe("tituloDimensao (finalizados × não finalizados)", () => {
  it("quem lidera os finalizados e quem tem mais pendentes", () => {
    const t = tituloDimensao(
      [
        { rotulo: "Prefeitura Alfa", fin: 42, nao: 18 },
        { rotulo: "Câmara Beta", fin: 35, nao: 25 },
        { rotulo: "Cliente Delta", fin: 19, nao: 9 },
      ],
      FIXO
    )
    expect(t).toBe("Prefeitura Alfa lidera os finalizados; Câmara Beta tem mais pendentes")
  })
  it("o mesmo item nos dois: uma frase só", () => {
    expect(
      tituloDimensao(
        [
          { rotulo: "A", fin: 9, nao: 8 },
          { rotulo: "B", fin: 3, nao: 2 },
        ],
        FIXO
      )
    ).toBe("A lidera os finalizados e os pendentes")
  })
  it("empate no topo de um dos lados: só fala do outro", () => {
    expect(
      tituloDimensao(
        [
          { rotulo: "A", fin: 5, nao: 8 },
          { rotulo: "B", fin: 5, nao: 2 },
        ],
        FIXO
      )
    ).toBe("A tem mais pendentes")
  })
  it("volta ao nome fixo com empate nos dois lados, dado vazio, zeros ou um item só", () => {
    expect(
      tituloDimensao(
        [
          { rotulo: "A", fin: 5, nao: 2 },
          { rotulo: "B", fin: 5, nao: 2 },
        ],
        FIXO
      )
    ).toBe(FIXO)
    expect(tituloDimensao([], FIXO)).toBe(FIXO)
    expect(tituloDimensao([{ rotulo: "A", fin: 4, nao: 1 }], FIXO)).toBe(FIXO)
    expect(
      tituloDimensao(
        [
          { rotulo: "A", fin: 0, nao: 0 },
          { rotulo: "B", fin: 0, nao: 0 },
        ],
        FIXO
      )
    ).toBe(FIXO)
  })
  it("o grupo 'Outros' não vira líder", () => {
    expect(
      tituloDimensao(
        [
          { rotulo: "Outros", fin: 90, nao: 90 },
          { rotulo: "A", fin: 5, nao: 2 },
          { rotulo: "B", fin: 3, nao: 4 },
        ],
        FIXO
      )
    ).toBe("A lidera os finalizados; B tem mais pendentes")
  })
})

describe("tituloFaixas (em atraso por meses)", () => {
  it("diz a maior faixa", () => {
    expect(
      tituloFaixas(
        [
          { rotulo: "1", valor: 2 },
          { rotulo: "2–3", valor: 9 },
          { rotulo: "7+", valor: 4 },
        ],
        "Em atraso"
      )
    ).toBe("A maior faixa é 2–3 meses, com 9 chamados")
  })
  it("fala no singular, e volta ao nome fixo com empate ou tudo zero", () => {
    expect(
      tituloFaixas(
        [
          { rotulo: "7+", valor: 1 },
          { rotulo: "1", valor: 0 },
        ],
        "Em atraso"
      )
    ).toBe("A maior faixa é 7+ meses, com 1 chamado")
    expect(
      tituloFaixas(
        [
          { rotulo: "1", valor: 3 },
          { rotulo: "2–3", valor: 3 },
        ],
        "Em atraso"
      )
    ).toBe("Em atraso")
    expect(tituloFaixas([{ rotulo: "1", valor: 0 }], "Em atraso")).toBe("Em atraso")
  })
})

describe("tituloClienteSituacao", () => {
  it("o cliente com mais pendentes e a situação que mais pesa nele", () => {
    expect(
      tituloClienteSituacao(
        [
          { rotulo: "Câmara Beta", total: 25, porSituacao: { "Em Análise": 9, "Em Atendimento": 6 } },
          { rotulo: "Alfa", total: 18, porSituacao: { "Em Análise": 4 } },
        ],
        "Cliente × Situação"
      )
    ).toBe("Câmara Beta tem mais pendentes, puxado por Em Análise")
  })
  it("sem situação dominante, só o cliente; com empate no topo, nome fixo", () => {
    expect(
      tituloClienteSituacao(
        [
          { rotulo: "A", total: 6, porSituacao: { X: 3, Y: 3 } },
          { rotulo: "B", total: 2, porSituacao: { X: 2 } },
        ],
        "Cliente × Situação"
      )
    ).toBe("A tem mais pendentes")
    expect(
      tituloClienteSituacao(
        [
          { rotulo: "A", total: 6, porSituacao: { X: 6 } },
          { rotulo: "B", total: 6, porSituacao: { X: 6 } },
        ],
        "Cliente × Situação"
      )
    ).toBe("Cliente × Situação")
    expect(tituloClienteSituacao([], "Cliente × Situação")).toBe("Cliente × Situação")
  })
})

describe("tituloOperadorAtraso", () => {
  it("quem tem mais chamados na faixa mais antiga", () => {
    expect(
      tituloOperadorAtraso(
        [
          { rotulo: "Operador 05", maisAntigos: 5, total: 14 },
          { rotulo: "Operador 02", maisAntigos: 1, total: 10 },
        ],
        "7+ meses",
        "Operador × Atraso"
      )
    ).toBe("Operador 05 tem 5 chamados com 7+ meses")
  })
  it("sem ninguém na faixa ou com empate: nome fixo", () => {
    expect(
      tituloOperadorAtraso([{ rotulo: "A", maisAntigos: 0, total: 3 }], "7+ meses", "Operador × Atraso")
    ).toBe("Operador × Atraso")
    expect(
      tituloOperadorAtraso(
        [
          { rotulo: "A", maisAntigos: 2, total: 3 },
          { rotulo: "B", maisAntigos: 2, total: 5 },
        ],
        "7+ meses",
        "Operador × Atraso"
      )
    ).toBe("Operador × Atraso")
  })
})

describe("tituloAreaSla", () => {
  it("as áreas abaixo da média do mês no SLA", () => {
    expect(
      tituloAreaSla(
        [
          { rotulo: "Logística", pct: 62, vencidos: 9 },
          { rotulo: "Armazém", pct: 78, vencidos: 6 },
          { rotulo: "Cadastro", pct: 91, vencidos: 3 },
          { rotulo: "Financeiro", pct: 96, vencidos: 1 },
          { rotulo: "Comercial", pct: 100, vencidos: 0 },
        ],
        "Área × SLA"
      )
    ).toBe("Logística e Armazém estão abaixo da média no SLA")
  })
  it("uma só área abaixo; ou nada abaixo / sem percentual: nome fixo", () => {
    expect(
      tituloAreaSla(
        [
          { rotulo: "A", pct: 50, vencidos: 1 },
          { rotulo: "B", pct: 90, vencidos: 0 },
          { rotulo: "C", pct: 100, vencidos: 0 },
        ],
        "Área × SLA"
      )
    ).toBe("A está abaixo da média no SLA")
    expect(
      tituloAreaSla(
        [
          { rotulo: "A", pct: 80, vencidos: 1 },
          { rotulo: "B", pct: 80, vencidos: 0 },
        ],
        "Área × SLA"
      )
    ).toBe("Área × SLA")
    expect(tituloAreaSla([{ rotulo: "A", pct: null, vencidos: 1 }], "Área × SLA")).toBe("Área × SLA")
  })
})

describe("tituloTempo", () => {
  it("o cliente que mais demora para resolver", () => {
    expect(
      tituloTempo(
        [
          { rotulo: "Prefeitura Alfa", resolucao: 13 },
          { rotulo: "Câmara Beta", resolucao: 9 },
        ],
        "Cliente × Tempo médio"
      )
    ).toBe("Prefeitura Alfa leva 13 dias para resolver")
  })
  it("um dia no singular; empate, vazio ou um item só: nome fixo", () => {
    expect(
      tituloTempo(
        [
          { rotulo: "A", resolucao: 1 },
          { rotulo: "B", resolucao: 0.5 },
        ],
        "Cliente × Tempo médio"
      )
    ).toBe("A leva 1 dia para resolver")
    expect(
      tituloTempo(
        [
          { rotulo: "A", resolucao: 4 },
          { rotulo: "B", resolucao: 4 },
        ],
        "Cliente × Tempo médio"
      )
    ).toBe("Cliente × Tempo médio")
    expect(tituloTempo([{ rotulo: "A", resolucao: 4 }], "Cliente × Tempo médio")).toBe("Cliente × Tempo médio")
    expect(tituloTempo([], "Cliente × Tempo médio")).toBe("Cliente × Tempo médio")
  })
})
