import { describe, expect, it } from "vitest"
import {
  areaPorSla,
  clientePorSituacao,
  clientePorTempo,
  operadorPorAtraso,
} from "./cruzamentos"
import { corrigirFoto } from "./fotos"
import { CAB, foto, mai, out, v1, v2 } from "./fotos-teste"
import { dia, montarSheet } from "./test-util"
import type { EntradaCompetencia } from "./tipos"

const e = (
  linhas: typeof v1,
  mesRef: string,
  c: string
): EntradaCompetencia => ({ sheet: foto(linhas, mesRef), competencia: c })
const abr1 = e(v1, "2026-04-01", "2026-04")
const abr2 = e(v2, "2026-04-01", "2026-04")
const maio = e(mai, "2026-05-01", "2026-05")
const outu = e(out, "2026-10-01", "2026-10")

describe("clientePorSituacao", () => {
  it("abr v1: Ômega com 3 não finalizados em 3 situações; Delta (0) omitido", () => {
    const r = clientePorSituacao(abr1)!
    expect(r.itens).toEqual([
      {
        rotulo: "Cliente Ômega",
        total: 3,
        porSituacao: {
          "Em Atendimento": 1,
          "Em Análise": 1,
          "Aguardando aceite": 1,
        },
      },
    ])
    expect([...r.situacoes].sort()).toEqual([
      "Aguardando aceite",
      "Em Análise",
      "Em Atendimento",
    ])
  })

  it("out: Aguardando cliente aparece; 5026 (aberto depois) fica fora", () => {
    const r = clientePorSituacao(outu)!
    expect(r.itens.map((i) => [i.rotulo, i.total])).toEqual([
      ["Cliente Delta", 1],
      ["Cliente Ômega", 1],
    ])
    expect(
      r.itens.find((i) => i.rotulo === "Cliente Ômega")!.porSituacao
    ).toEqual({ "Aguardando cliente": 1 })
    expect(r.situacoes).toEqual(["Aguardando cliente", "Em Análise"])
  })

  it("sem entrada (mês sem foto) ou sem coluna Cliente → null", () => {
    expect(clientePorSituacao(undefined)).toBeNull()
    const sheet = montarSheet(
      ["Data Abertura", "Situação"],
      [[dia("2026-04-03"), "Em Análise"]]
    )
    expect(clientePorSituacao({ sheet, competencia: "2026-04" })).toBeNull()
  })

  it("agrupa em Outros acima do máximo e vazio vira (sem informação)", () => {
    const clientes = ["A", "B", "C", null]
    const sheet = montarSheet(
      ["Data Abertura", "Cliente", "Situação"],
      clientes.map((c) => [dia("2026-04-03"), c, "Em Análise"])
    )
    const r = clientePorSituacao({ sheet, competencia: "2026-04" }, 2)!
    expect(r.itens).toHaveLength(3)
    expect(r.itens[2]).toEqual({
      rotulo: "Outros",
      total: 2,
      porSituacao: { "Em Análise": 2 },
    })
    const todos = clientePorSituacao({ sheet, competencia: "2026-04" })!
    expect(todos.itens.map((i) => i.rotulo)).toContain("(sem informação)")
  })
})

describe("operadorPorAtraso", () => {
  it("abr v1: Op 05 {No ciclo 1, 2–3 1}; Op 04 {4–6 1}", () => {
    const r = operadorPorAtraso(abr1)!
    expect(r).toEqual([
      {
        rotulo: "Operador 05",
        total: 2,
        porFaixa: { "No ciclo": 1, "1": 0, "2–3": 1, "4–6": 0, "7+": 0 },
      },
      {
        rotulo: "Operador 04",
        total: 1,
        porFaixa: { "No ciclo": 0, "1": 0, "2–3": 0, "4–6": 1, "7+": 0 },
      },
    ])
  })

  it("sem coluna Operador → null; sem foto → null", () => {
    const sheet = montarSheet(
      ["Data Abertura", "Situação"],
      [[dia("2026-04-03"), "Em Análise"]]
    )
    expect(operadorPorAtraso({ sheet, competencia: "2026-04" })).toBeNull()
    expect(operadorPorAtraso(undefined)).toBeNull()
  })
})

describe("areaPorSla", () => {
  it("abr v1: Logística 0%, Cadastro 100% com 1 vencido (5000); Armazém sem dados omitida", () => {
    const r = areaPorSla(abr1)!
    expect(r).toEqual(
      expect.arrayContaining([
        { rotulo: "Logística", slaPct: 0, finalizadosComSla: 1, slaVencido: 0 },
        {
          rotulo: "Cadastro",
          slaPct: 100,
          finalizadosComSla: 1,
          slaVencido: 1,
        },
      ])
    )
    expect(r).toHaveLength(2)
  })

  it("abr v2: Armazém finaliza 5010 sem SLA → sem % e fora; 5003 reneg. não vence", () => {
    const r = areaPorSla(abr2)!
    expect(r.map((x) => x.rotulo).sort()).toEqual(["Cadastro", "Logística"])
    expect(r.find((x) => x.rotulo === "Cadastro")!.slaVencido).toBe(0)
  })

  it("sem coluna Área → null", () => {
    const sheet = montarSheet(
      ["Data Abertura", "Situação"],
      [[dia("2026-04-03"), "Em Análise"]]
    )
    expect(areaPorSla({ sheet, competencia: "2026-04" })).toBeNull()
  })
})

describe("clientePorTempo", () => {
  it("abr v1: Delta 19,5 dias e aceite 1,5; Ômega sem finalizados fica fora", () => {
    expect(clientePorTempo(abr1)).toEqual([
      {
        rotulo: "Cliente Delta",
        tempoMedio: 19.5,
        tempoAceite: 1.5,
        finalizados: 2,
      },
    ])
  })

  it("out: Delta 1 finalizado (5024, 8 dias, aceite 1); Ômega fora", () => {
    const r = clientePorTempo(outu)!
    expect(r).toEqual([
      {
        rotulo: "Cliente Delta",
        tempoMedio: 8,
        tempoAceite: 1,
        finalizados: 1,
      },
    ])
  })

  it("sem coluna Cliente → null", () => {
    expect(clientePorTempo(undefined)).toBeNull()
    const sheet = montarSheet(CAB.slice(0, 2), [
      [dia("2026-04-01"), dia("2026-04-03")],
    ])
    expect(clientePorTempo({ sheet, competencia: "2026-04" })).toBeNull()
  })
})

describe("com foto de comparação corrigida", () => {
  it("maio corrigido pela foto de out: 5015 finalizado em maio (20 dias)", () => {
    const corr = corrigirFoto(maio, [outu]).entrada
    const r = clientePorTempo(corr)!
    const omega = r.find((x) => x.rotulo === "Cliente Ômega")!
    expect(omega.finalizados).toBe(1)
    expect(omega.tempoMedio).toBe(20)
    expect(clientePorSituacao(corr)!.itens.map((i) => i.rotulo)).toEqual([
      "Cliente Ômega",
    ])
  })
})
