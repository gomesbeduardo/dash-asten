import { describe, expect, it } from "vitest"

import {
  type PorSituacao,
  clientesPorTotal,
  operadoresPorAtraso,
  ordemFaixas,
  ordemSituacoes,
} from "./cruzamentos-ordem"

describe("ordem das situações na pilha", () => {
  const a: PorSituacao[] = [
    {
      rotulo: "A",
      total: 9,
      porSituacao: {
        "Em Análise": 2,
        "Em Atendimento": 5,
        "Aguardando aceite": 2,
      },
    },
    {
      rotulo: "B",
      total: 4,
      porSituacao: { "Em Análise": 1, "Em Atendimento": 3 },
    },
  ]
  it("a situação de maior total no gráfico fica na base, igual para todas as barras", () => {
    expect(
      ordemSituacoes(["Em Análise", "Em Atendimento", "Aguardando aceite"], [a])
    ).toEqual(["Em Atendimento", "Em Análise", "Aguardando aceite"])
  })
  it("soma também o mês comparado, para a ordem valer nas duas linhas", () => {
    const base = [
      { rotulo: "A", total: 20, porSituacao: { "Aguardando aceite": 20 } },
    ]
    expect(
      ordemSituacoes(
        ["Em Análise", "Em Atendimento", "Aguardando aceite"],
        [a, base]
      )[0]
    ).toBe("Aguardando aceite")
  })
  it("empate mantém a ordem de chegada", () => {
    expect(
      ordemSituacoes(
        ["X", "Y"],
        [[{ rotulo: "A", total: 2, porSituacao: { X: 1, Y: 1 } }]]
      )
    ).toEqual(["X", "Y"])
  })
})

describe("ordem das faixas de atraso", () => {
  it("7+ na base e 'No ciclo' na ponta", () => {
    expect(ordemFaixas(["1", "2–3", "4–6", "7+"])).toEqual([
      "7+",
      "4–6",
      "2–3",
      "1",
      "No ciclo",
    ])
  })
})

describe("ordem das linhas", () => {
  it("clientes pelo total, do maior para o menor", () => {
    const r = clientesPorTotal([
      { rotulo: "B", total: 4, porSituacao: {} },
      { rotulo: "A", total: 9, porSituacao: {} },
    ])
    expect(r.map((i) => i.rotulo)).toEqual(["A", "B"])
  })
  it("operadores por 7+ e, no empate, pelo total", () => {
    const r = operadoresPorAtraso([
      { rotulo: "X", total: 5, porFaixa: { "7+": 1 } },
      { rotulo: "Y", total: 3, porFaixa: { "7+": 4 } },
      { rotulo: "Z", total: 9, porFaixa: { "7+": 1 } },
    ])
    expect(r.map((i) => i.rotulo)).toEqual(["Y", "Z", "X"])
  })
})
