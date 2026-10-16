import { describe, expect, it } from "vitest"
import type { Competencia } from "@/cargas/types"
import { calcularMetricas, distribuicoesFinalizadosNoPeriodo } from "./metricas"
import type { MetricasChamados } from "./tipos"
import { foto, mai, out, v1, v2, type L } from "./fotos-teste"

/**
 * Aceite da fatia A (D63/D64): os mesmos chamados de docs/exemplos/gerar-teste-foto.cjs,
 * conferidos contra a tabela "Números esperados por foto" de docs/exemplos/LEIA-ME-testes.md.
 */
const calc = (linhas: L[], mesRef: string, comp: Competencia) =>
  calcularMetricas({ sheet: foto(linhas, mesRef), competencia: comp })

const kv = (m: MetricasChamados, id: string) => {
  const k = m.kpis.find((x) => x.id === id)
  if (!k) throw new Error(`KPI ${id} não existe`)
  return k.valor
}
const cards = (m: MetricasChamados) =>
  Object.fromEntries(m.situacoes.map((s) => [s.rotulo, s.valor]))
const faixas = (m: MetricasChamados) =>
  Object.fromEntries(
    m.atrasoFaixas.filter((f) => f.valor > 0).map((f) => [f.rotulo, f.valor])
  )
const dist = (m: MetricasChamados, id: string) =>
  Object.fromEntries(
    m.distribuicoes
      .find((d) => d.id === id)!
      .itens.map((i) => [i.rotulo, [i.finalizados, i.naoFinalizados]])
  )

describe("foto de abril v1 (Mes Ref. 2026-04)", () => {
  const m = calc(v1, "2026-04-01", "2026-04")
  it("cards por Situação e total", () => {
    expect(m.totalChamados).toBe(5)
    expect(cards(m)).toEqual({
      "Em Atendimento": 1,
      "Em Análise": 1,
      "Aguardando aceite": 1,
      Finalizado: 2,
    })
    expect(m.situacoes[0]).toEqual({ rotulo: "Finalizado", valor: 2 })
  })
  it("KPIs", () => {
    expect(kv(m, "entradas")).toBe(2)
    expect(kv(m, "finalizados")).toBe(2)
    expect(kv(m, "naoFinalizados")).toBe(3)
    expect(kv(m, "atraso")).toBe(2)
    expect(faixas(m)).toEqual({ "2–3": 1, "4–6": 1 })
    expect(kv(m, "slaVencido")).toBe(1)
    expect(kv(m, "sla")).toBe(50)
    expect(kv(m, "tempoMedio")).toBe(19.5)
    expect(kv(m, "tempoAceite")).toBe(1.5)
    expect(kv(m, "reabertos")).toBe(50)
    expect(kv(m, "semSla")).toBe(1)
    expect(kv(m, "slaRenegociado")).toBe(1)
    expect(kv(m, "aguardandoAceite")).toBe(1)
  })
  it("não há KPIs de backlog", () => {
    const ids = m.kpis.map((k) => k.id)
    for (const id of ["backlog", "saidas", "abertosApos"])
      expect(ids).not.toContain(id)
  })
  it("por cliente e por operador (finalizados · não finalizados)", () => {
    expect(dist(m, "cliente")).toEqual({
      "Cliente Ômega": [0, 3],
      "Cliente Delta": [2, 0],
    })
    expect(dist(m, "operador")).toEqual({
      "Operador 04": [2, 1],
      "Operador 05": [0, 2],
    })
  })
  it("sem nota de abertos depois", () => {
    expect(m.abertosDepois).toBe(0)
  })
})

describe("foto de abril v2", () => {
  const m = calc(v2, "2026-04-01", "2026-04")
  it("números", () => {
    expect(m.totalChamados).toBe(6)
    expect(cards(m)).toEqual({ "Em Análise": 2, Finalizado: 4 })
    expect(kv(m, "entradas")).toBe(3)
    expect(kv(m, "finalizados")).toBe(4)
    expect(kv(m, "naoFinalizados")).toBe(2)
    expect(kv(m, "atraso")).toBe(1)
    expect(faixas(m)).toEqual({ "2–3": 1 })
    expect(kv(m, "slaVencido")).toBe(0)
    expect(kv(m, "sla")).toBeCloseTo(33.3, 1)
    expect(kv(m, "tempoMedio")).toBe(51.3)
    expect(kv(m, "tempoAceite")).toBe(1.5)
    expect(kv(m, "reabertos")).toBe(25)
    expect(kv(m, "semSla")).toBe(0)
    expect(kv(m, "slaRenegociado")).toBe(1)
    expect(kv(m, "aguardandoAceite")).toBe(0)
  })
  it("por cliente e por operador", () => {
    expect(dist(m, "cliente")).toEqual({
      "Cliente Ômega": [2, 1],
      "Cliente Delta": [2, 1],
    })
    expect(dist(m, "operador")).toEqual({
      "Operador 04": [3, 0],
      "Operador 05": [1, 2],
    })
  })
})

describe("foto de maio", () => {
  const m = calc(mai, "2026-05-01", "2026-05")
  it("números", () => {
    expect(m.totalChamados).toBe(7)
    expect(cards(m)).toEqual({
      "Em Atendimento": 1,
      "Em Análise": 1,
      Finalizado: 5,
    })
    expect(kv(m, "entradas")).toBe(1)
    expect(kv(m, "finalizados")).toBe(1)
    expect(kv(m, "naoFinalizados")).toBe(2)
    expect(kv(m, "atraso")).toBe(1)
    expect(faixas(m)).toEqual({ "4–6": 1 })
    expect(kv(m, "slaVencido")).toBe(2)
    expect(kv(m, "sla")).toBe(100)
    expect(kv(m, "tempoMedio")).toBe(13)
    expect(kv(m, "tempoAceite")).toBe(2)
    expect(kv(m, "reabertos")).toBe(0)
    expect(kv(m, "semSla")).toBe(0)
    expect(kv(m, "slaRenegociado")).toBe(1)
    expect(kv(m, "aguardandoAceite")).toBe(0)
  })
  it("por cliente e por operador", () => {
    expect(dist(m, "cliente")).toEqual({
      "Cliente Ômega": [0, 2],
      "Cliente Delta": [1, 0],
    })
    expect(dist(m, "operador")).toEqual({
      "Operador 04": [0, 1],
      "Operador 05": [1, 1],
    })
  })
})

describe("foto de outubro (com 1 aberto depois do mês de referência)", () => {
  const m = calc(out, "2026-10-01", "2026-10")
  it("números", () => {
    expect(m.totalChamados).toBe(10)
    expect(m.abertosDepois).toBe(1)
    expect(m.avisos).toContain("1 aberto depois do mês de referência")
    expect(cards(m)).toEqual({
      "Em Análise": 1,
      "Aguardando cliente": 1,
      Finalizado: 8,
    })
    expect(kv(m, "entradas")).toBe(2)
    expect(kv(m, "finalizados")).toBe(1)
    expect(kv(m, "naoFinalizados")).toBe(2)
    expect(kv(m, "atraso")).toBe(1)
    expect(faixas(m)).toEqual({ "2–3": 1 })
    expect(kv(m, "slaVencido")).toBe(2)
    expect(kv(m, "sla")).toBe(100)
    expect(kv(m, "tempoMedio")).toBe(8)
    expect(kv(m, "tempoAceite")).toBe(1)
    expect(kv(m, "reabertos")).toBe(100)
    expect(kv(m, "semSla")).toBe(0)
    expect(kv(m, "slaRenegociado")).toBe(0)
    expect(kv(m, "aguardandoAceite")).toBe(0)
  })
  it("por cliente e por operador", () => {
    expect(dist(m, "cliente")).toEqual({
      "Cliente Ômega": [0, 1],
      "Cliente Delta": [1, 1],
    })
    expect(dist(m, "operador")).toEqual({
      "Operador 04": [0, 1],
      "Operador 05": [1, 1],
    })
  })
  it("o aberto depois não entra em nenhum número (nem nos cards)", () => {
    expect(m.situacoes.reduce((s, i) => s + i.valor, 0)).toBe(10)
  })
  it("finalizados no período: recalcula só a série de finalizados", () => {
    const d = distribuicoesFinalizadosNoPeriodo(
      { sheet: foto(out, "2026-10-01"), competencia: "2026-10" },
      { inicio: Date.UTC(2026, 5, 1), fim: Date.UTC(2026, 10, 1) - 1 }
    )
    const cli = Object.fromEntries(
      d
        .find((x) => x.id === "cliente")!
        .itens.map((i) => [i.rotulo, [i.finalizados, i.naoFinalizados]])
    )
    // jun–out: 5003 (Ômega, 20/06) e 5024 (Delta, 09/10); não finalizados não mudam
    expect(cli).toEqual({ "Cliente Ômega": [1, 1], "Cliente Delta": [1, 1] })
  })
})
