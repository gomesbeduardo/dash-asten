import { describe, expect, it } from "vitest"
import { calcularMetricas } from "./index"
import {
  montarSheet,
  sheetChamados,
  sheetChamadosReab,
  type LinhaChamado,
} from "./test-util"

const LINHAS: LinhaChamado[] = [
  // 1 aberto antes do mês, ainda aberto, SLA vencido
  { abertura: "2026-07-10", sla: "2026-09-15", situacao: "Em Desenvolvimento" },
  // 2 aberto antes, sem SLA, > 180 dias
  { abertura: "2026-03-01", cliente: "Cli B", areaSuperior: null },
  // 3 aberto e resolvido no mês, dentro do SLA
  {
    abertura: "2026-09-02",
    solucao: "2026-09-10",
    sla: "2026-09-12",
    situacao: "Finalizado",
  },
  // 4 resolvido no mês, fora do SLA, reaberto
  {
    abertura: "2026-09-05",
    solucao: "2026-09-20",
    sla: "2026-09-10",
    reab: 1,
    situacao: "Finalizado",
  },
  // 5 SLA renegociado prevalece (previsto vencido, renegociado ok)
  {
    abertura: "2026-08-20",
    solucao: "2026-09-25",
    sla: "2026-09-01",
    slaReneg: "2026-09-30",
    situacao: "Finalizado",
  },
  // 6 resolvido depois do fim do mês: ainda é backlog em setembro
  {
    abertura: "2026-08-01",
    solucao: "2026-10-05",
    sla: "2026-09-20",
    situacao: "Finalizado",
  },
  // 7 aberto depois do fim: ignorado
  { abertura: "2026-10-03" },
  // 8 sem abertura: ignorado
  { abertura: null },
  // 9 fechado antes do mês
  { abertura: "2026-06-01", solucao: "2026-08-15", situacao: "Finalizado" },
  // 10 aberto no fim do mês, aguardando aceite
  {
    abertura: "2026-09-28",
    sla: "2026-10-30",
    situacao: "Aguardando Aceite de Solução",
  },
  // 11 resolvido no último dia, SLA no último dia, aceite só depois de F
  {
    abertura: "2026-09-01",
    solucao: "2026-09-30",
    sla: "2026-09-30",
    aceite: "2026-10-02",
    situacao: "Aguardando Aceite de Solução",
  },
  // 12 aceite dado antes de F: não conta
  {
    abertura: "2026-05-01",
    solucao: "2026-07-01",
    aceite: "2026-07-05",
    situacao: "Aguardando Aceite de Solução",
  },
]
const valor = (m: ReturnType<typeof calcularMetricas>, id: string) =>
  m.kpis.find((k) => k.id === id)?.valor
const SET = { competencia: "2026-09" }

describe("calcularMetricas (corte no fim da competência, D34)", () => {
  const m = calcularMetricas({ sheet: sheetChamados(LINHAS), ...SET })

  it("nenhuma linha é excluída: posteriores e sem abertura ficam à parte, com aviso", () => {
    expect(m.linhasConsideradas).toBe(10)
    expect(m.linhasPosteriores).toBe(1)
    expect(m.linhasSemAbertura).toBe(1)
    expect(
      m.linhasConsideradas + m.linhasPosteriores + m.linhasSemAbertura
    ).toBe(LINHAS.length)
    expect(m.avisos).toContain(
      "1 chamado(s) abertos após o fim da competência — mostrados à parte"
    )
    expect(m.avisos.join(" ")).not.toMatch(/ignorad/)
    expect("linhasIgnoradas" in m).toBe(false)
  })

  it("porSituacaoNaCompetencia traz as 5 classes e soma o total de linhas", () => {
    expect(m.porSituacaoNaCompetencia).toEqual([
      { rotulo: "Aberto no fim do mês", valor: 4 },
      { rotulo: "Resolvido no mês", valor: 4 },
      { rotulo: "Resolvido antes do mês", valor: 2 },
      { rotulo: "Aberto após a competência", valor: 1 },
      { rotulo: "Sem data de abertura", valor: 1 },
    ])
    expect(m.porSituacaoNaCompetencia.reduce((s, i) => s + i.valor, 0)).toBe(
      LINHAS.length
    )
  })

  it("KPI abertosApos e flags reconstruivel", () => {
    expect(valor(m, "abertosApos")).toBe(1)
    const k = m.kpis.find((x) => x.id === "abertosApos")!
    expect(k.rotulo).toBe("Abertos após a competência")
    expect(k.melhorQuando).toBe("neutro")
    expect(k.definicao).toMatch(/competência seguinte/)
    const rec = Object.fromEntries(m.kpis.map((x) => [x.id, x.reconstruivel]))
    expect(rec).toEqual({
      backlog: true,
      entradas: true,
      saidas: true,
      abertosApos: true,
      tempoMedio: true,
      semSla: true,
      aguardandoAceite: false,
      reabertos: false,
      sla: false,
      atraso: false,
    })
  })

  it("distribuição por situação é do estado atual e não reconstruível", () => {
    const d = Object.fromEntries(m.distribuicoes.map((x) => [x.id, x]))
    expect(d.situacao.titulo).toBe("Backlog por situação atual (na exportação)")
    expect(d.situacao.reconstruivel).toBe(false)
    expect(d.cliente.reconstruivel).toBe(true)
    expect(d.areaSuperior.reconstruivel).toBe(true)
    expect(d.atividade.reconstruivel).toBe(true)
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
    expect(cli.itens).toEqual([
      { rotulo: "Cli A", valor: 3 },
      { rotulo: "Cli B", valor: 1 },
    ])
    expect(m.distribuicoes.map((d) => d.id)).toEqual([
      "cliente",
      "areaSuperior",
      "atividade",
      "situacao",
    ])
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
    const muitas = Array.from({ length: 12 }, (_, i) => ({
      abertura: "2026-09-01",
      cliente: `C${i}`,
    }))
    const g = calcularMetricas({ sheet: sheetChamados(muitas), ...SET })
    const itens = g.distribuicoes.find((d) => d.id === "cliente")!.itens
    expect(itens).toHaveLength(11)
    expect(itens[10]).toEqual({ rotulo: "Outros", valor: 2 })
  })

  it("todo KPI tem definição", () => {
    expect(m.kpis.length).toBe(10)
    for (const k of m.kpis) expect(k.definicao.length).toBeGreaterThan(5)
  })

  it("anterior preenche anterior e delta", () => {
    const ant = calcularMetricas({
      sheet: sheetChamados(LINHAS),
      competencia: "2026-08",
    })
    const c = calcularMetricas(
      { sheet: sheetChamados(LINHAS), ...SET },
      { sheet: sheetChamados(LINHAS), competencia: "2026-08" }
    )
    const k = c.kpis.find((x) => x.id === "backlog")!
    expect(k.anterior).toBe(valor(ant, "backlog"))
    expect(k.delta).toBe(k.valor! - k.anterior!)
    expect(m.kpis[0].anterior).toBeNull()
    expect(m.kpis[0].delta).toBeNull()
  })

  it("campos ausentes viram null e avisos, sem quebrar", () => {
    const s = montarSheet(
      ["Data Abertura", "Situação"],
      [[new Date("2026-09-01T00:00:00Z"), "Em Análise"]]
    )
    const r = calcularMetricas({ sheet: s, ...SET })
    expect(valor(r, "entradas")).toBe(1)
    expect(valor(r, "backlog")).toBeNull()
    expect(valor(r, "reabertos")).toBeNull()
    expect(r.avisos.length).toBeGreaterThan(0)
  })

  it("sem saídas com SLA o % no SLA é null", () => {
    const r = calcularMetricas({
      sheet: sheetChamados([{ abertura: "2026-09-01" }]),
      ...SET,
    })
    expect(valor(r, "sla")).toBeNull()
    expect(valor(r, "tempoMedio")).toBeNull()
  })

  it("entrada sem carga própria anula KPIs não reconstruíveis; o delta fica null", () => {
    const r = calcularMetricas({
      sheet: sheetChamados(LINHAS),
      ...SET,
      cargaPropria: false,
    })
    for (const id of ["aguardandoAceite", "reabertos", "sla", "atraso"]) {
      const k = r.kpis.find((x) => x.id === id)!
      expect(k.valor).toBeNull()
      expect(k.detalhe).toBe("exige a carga daquele mês")
    }
    expect(valor(r, "backlog")).toBe(4)
    const c = calcularMetricas(
      { sheet: sheetChamados(LINHAS), ...SET },
      {
        sheet: sheetChamados(LINHAS),
        competencia: "2026-08",
        cargaPropria: false,
      }
    )
    expect(c.kpis.find((x) => x.id === "sla")!.delta).toBeNull()
    expect(c.kpis.find((x) => x.id === "sla")!.anterior).toBeNull()
    expect(c.kpis.find((x) => x.id === "backlog")!.delta).not.toBeNull()
  })
})

describe("reabertos depois da solução (aviso informativo, sem mudar KPI)", () => {
  const kpisDe = (m: ReturnType<typeof calcularMetricas>) =>
    Object.fromEntries(m.kpis.map((k) => [k.id, k.valor]))
  const linhas: LinhaChamado[] = [
    // reaberto pendente, resolvido em agosto: continua resolvido pela solução
    {
      abertura: "2026-07-01",
      solucao: "2026-08-10",
      ultimaReab: "2026-09-05",
      situacao: "Em Análise",
    },
    // reaberto pendente, solução em setembro: continua em saídas
    {
      abertura: "2026-08-01",
      solucao: "2026-09-03",
      ultimaReab: "2026-09-08",
      situacao: "Em Análise",
    },
    // reaberto já finalizado: não entra no aviso
    {
      abertura: "2026-07-01",
      solucao: "2026-08-10",
      ultimaReab: "2026-09-05",
      situacao: "Finalizado",
    },
    // aberto de verdade
    { abertura: "2026-08-15", situacao: "Em Análise" },
  ]
  const entrada = (ls: LinhaChamado[]) => ({
    sheet: sheetChamadosReab(ls),
    competencia: "2026-09",
  })

  it("KPIs seguem só as datas e o aviso conta os reabertos pendentes já resolvidos", () => {
    const m = calcularMetricas(entrada(linhas))
    const k = kpisDe(m)
    expect(k.backlog).toBe(1)
    expect(k.saidas).toBe(1)
    expect(m.avisos).toContain(
      "2 chamado(s) reabertos depois da solução e não finalizados contam como resolvidos pela Data de Solução"
    )
  })

  it("com a coluna mas sem reaberto pendente, ou sem a coluna: sem aviso e KPIs idênticos", () => {
    const ls = linhas.map((l) => ({ ...l, ultimaReab: null }))
    const com = calcularMetricas(entrada(ls))
    const sem = calcularMetricas({
      sheet: sheetChamados(ls),
      competencia: "2026-09",
    })
    expect(com.avisos.join(" ")).not.toMatch(/reabertos depois/)
    expect(kpisDe(com)).toEqual(kpisDe(sem))
    expect(sem.avisos.join(" ")).not.toMatch(/reabertos depois/)
    // e os KPIs também não mudam com a reabertura presente
    expect(kpisDe(calcularMetricas(entrada(linhas)))).toEqual(kpisDe(com))
  })
})
