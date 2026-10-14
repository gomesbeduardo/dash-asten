import { describe, expect, it } from "vitest"
import { calcularMetricas } from "./index"
import { montarSheet, sheetChamados, type LinhaChamado } from "./test-util"

const LINHAS: LinhaChamado[] = [
  // 1 aberto antes do mês, ainda aberto, SLA vencido
  { abertura: "2026-07-10", sla: "2026-09-15", situacao: "Em Desenvolvimento" },
  // 2 aberto antes, sem SLA, > 180 dias
  { abertura: "2026-03-01", cliente: "Cli B", areaSuperior: null },
  // 3 aberto e resolvido no mês, dentro do SLA
  { abertura: "2026-09-02", solucao: "2026-09-10", sla: "2026-09-12", situacao: "Finalizado" },
  // 4 resolvido no mês, fora do SLA, reaberto
  { abertura: "2026-09-05", solucao: "2026-09-20", sla: "2026-09-10", reab: 1, situacao: "Finalizado" },
  // 5 SLA renegociado prevalece (previsto vencido, renegociado ok)
  { abertura: "2026-08-20", solucao: "2026-09-25", sla: "2026-09-01", slaReneg: "2026-09-30", situacao: "Finalizado" },
  // 6 resolvido depois do fim do mês: ainda é backlog em setembro
  { abertura: "2026-08-01", solucao: "2026-10-05", sla: "2026-09-20", situacao: "Finalizado" },
  // 7 aberto depois do fim: ignorado
  { abertura: "2026-10-03" },
  // 8 sem abertura: ignorado
  { abertura: null },
  // 9 fechado antes do mês
  { abertura: "2026-06-01", solucao: "2026-08-15", situacao: "Finalizado" },
  // 10 aberto no fim do mês, aguardando aceite
  { abertura: "2026-09-28", sla: "2026-10-30", situacao: "Aguardando Aceite de Solução" },
  // 11 resolvido no último dia, SLA no último dia, aceite só depois de F
  { abertura: "2026-09-01", solucao: "2026-09-30", sla: "2026-09-30", aceite: "2026-10-02", situacao: "Aguardando Aceite de Solução" },
  // 12 aceite dado antes de F: não conta
  { abertura: "2026-05-01", solucao: "2026-07-01", aceite: "2026-07-05", situacao: "Aguardando Aceite de Solução" },
]
const valor = (m: ReturnType<typeof calcularMetricas>, id: string) => m.kpis.find((k) => k.id === id)?.valor
const SET = { competencia: "2026-09" }

describe("calcularMetricas (corte no fim da competência, D34)", () => {
  const m = calcularMetricas({ sheet: sheetChamados(LINHAS), ...SET })

  it("ignora linhas sem abertura ou abertas depois do fim, com aviso", () => {
    expect(m.linhasConsideradas).toBe(10)
    expect(m.linhasIgnoradas).toBe(2)
    expect(m.avisos.some((a) => a.includes("2"))).toBe(true)
  })

  it("backlog, entradas e saídas", () => {
    expect(valor(m, "backlog")).toBe(4)
    expect(valor(m, "entradas")).toBe(4)
    expect(valor(m, "saidas")).toBe(4)
  })

  it("% no SLA usa o SLA renegociado e o fim do dia", () => {
    expect(valor(m, "sla")).toBe(75)
  })

  it("em atraso e sem SLA vêm do backlog", () => {
    expect(valor(m, "atraso")).toBe(2)
    expect(valor(m, "semSla")).toBe(1)
  })

  it("tempo médio e % reabertos entre as saídas", () => {
    expect(valor(m, "tempoMedio")).toBe(22)
    expect(valor(m, "reabertos")).toBe(25)
  })

  it("aguardando aceite: situação com 'aceite' e sem aceite até o fim", () => {
    expect(valor(m, "aguardandoAceite")).toBe(2)
  })

  it("distribuição e envelhecimento do backlog", () => {
    const cli = m.distribuicoes.find((d) => d.id === "cliente")!
    expect(cli.itens).toEqual([{ rotulo: "Cli A", valor: 3 }, { rotulo: "Cli B", valor: 1 }])
    expect(m.distribuicoes.map((d) => d.id)).toEqual(["cliente", "areaSuperior", "atividade", "situacao"])
    expect(m.envelhecimento).toEqual([
      { rotulo: "0–30 dias", valor: 1 },
      { rotulo: "31–90 dias", valor: 2 },
      { rotulo: "91–180 dias", valor: 0 },
      { rotulo: "> 180 dias", valor: 1 },
    ])
  })

  it("valores nulos viram '(sem informação)' e mais de 10 itens agrupam em Outros", () => {
    const area = m.distribuicoes.find((d) => d.id === "areaSuperior")!
    expect(area.itens).toContainEqual({ rotulo: "(sem informação)", valor: 1 })
    const muitas = Array.from({ length: 12 }, (_, i) => ({ abertura: "2026-09-01", cliente: `C${i}` }))
    const g = calcularMetricas({ sheet: sheetChamados(muitas), ...SET })
    const itens = g.distribuicoes.find((d) => d.id === "cliente")!.itens
    expect(itens).toHaveLength(11)
    expect(itens[10]).toEqual({ rotulo: "Outros", valor: 2 })
  })

  it("todo KPI tem definição", () => {
    expect(m.kpis.length).toBe(9)
    for (const k of m.kpis) expect(k.definicao.length).toBeGreaterThan(5)
  })

  it("anterior preenche anterior e delta", () => {
    const ant = calcularMetricas({ sheet: sheetChamados(LINHAS), competencia: "2026-08" })
    const c = calcularMetricas({ sheet: sheetChamados(LINHAS), ...SET }, { sheet: sheetChamados(LINHAS), competencia: "2026-08" })
    const k = c.kpis.find((x) => x.id === "backlog")!
    expect(k.anterior).toBe(valor(ant, "backlog"))
    expect(k.delta).toBe(k.valor! - k.anterior!)
    expect(m.kpis[0].anterior).toBeNull()
    expect(m.kpis[0].delta).toBeNull()
  })

  it("campos ausentes viram null e avisos, sem quebrar", () => {
    const s = montarSheet(["Data Abertura", "Situação"], [[new Date("2026-09-01T00:00:00Z"), "Em Análise"]])
    const r = calcularMetricas({ sheet: s, ...SET })
    expect(valor(r, "entradas")).toBe(1)
    expect(valor(r, "backlog")).toBeNull()
    expect(valor(r, "reabertos")).toBeNull()
    expect(r.avisos.length).toBeGreaterThan(0)
  })

  it("sem saídas com SLA o % no SLA é null", () => {
    const r = calcularMetricas({ sheet: sheetChamados([{ abertura: "2026-09-01" }]), ...SET })
    expect(valor(r, "sla")).toBeNull()
    expect(valor(r, "tempoMedio")).toBeNull()
  })
})
