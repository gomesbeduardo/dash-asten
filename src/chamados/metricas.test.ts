import { describe, expect, it } from "vitest"
import { calcularMetricas } from "./index"
import {
  montarSheet,
  sheetChamados,
  sheetChamadosReab,
  type LinhaChamado,
} from "./test-util"
import { distribuicoesFinalizadosNoPeriodo } from "./metricas"

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
  // 6 Finalizado, mas Data de Solução depois do fim do mês: não é finalizado no mês nem não finalizado (D64, literal)
  {
    abertura: "2026-08-01",
    solucao: "2026-10-05",
    sla: "2026-09-20",
    situacao: "Finalizado",
  },
  // 7 aberto depois do fim: nota, fora dos números
  { abertura: "2026-10-03" },
  // 8 sem abertura: nota, fora dos números
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
const dist = (m: ReturnType<typeof calcularMetricas>, id: string) =>
  Object.fromEntries(
    m.distribuicoes
      .find((d) => d.id === id)!
      .itens.map((i) => [i.rotulo, [i.finalizados, i.naoFinalizados]])
  )

describe("calcularMetricas (foto no Mes Ref., D63/D64)", () => {
  const m = calcularMetricas({ sheet: sheetChamados(LINHAS), ...SET })

  it("nenhuma linha é excluída: abertos depois e sem abertura ficam à parte, com aviso", () => {
    expect(m.totalChamados).toBe(10)
    expect(m.abertosDepois).toBe(1)
    expect(m.linhasSemAbertura).toBe(1)
    expect(m.totalChamados! + m.abertosDepois! + m.linhasSemAbertura!).toBe(
      LINHAS.length
    )
    expect(m.avisos).toContain("1 aberto depois do Mes Ref.")
    expect(m.avisos).toContain(
      "1 chamado(s) sem Data de Abertura — mostrados à parte"
    )
    expect(m.avisos.join(" ")).not.toMatch(/ignorad/)
  })

  it("plural da nota de abertos depois", () => {
    const r = calcularMetricas({
      sheet: sheetChamados([
        { abertura: "2026-10-01" },
        { abertura: "2026-11-01" },
      ]),
      ...SET,
    })
    expect(r.avisos).toContain("2 abertos depois do Mes Ref.")
  })

  it("cards por Situação: valor literal, por frequência, e o total bate", () => {
    expect(m.situacoes).toEqual([
      { rotulo: "Finalizado", valor: 5 },
      { rotulo: "Aguardando Aceite de Solução", valor: 3 },
      { rotulo: "Em Análise", valor: 1 },
      { rotulo: "Em Desenvolvimento", valor: 1 },
    ])
    expect(m.situacoes.reduce((s, i) => s + i.valor, 0)).toBe(m.totalChamados)
  })

  it("Situação vazia vira '(sem informação)' e nenhuma situação é agrupada", () => {
    const r = calcularMetricas({
      sheet: sheetChamados([
        { abertura: "2026-09-01", situacao: "" },
        { abertura: "2026-09-02", situacao: "Em análise" },
        { abertura: "2026-09-03", situacao: "Em Análise" },
      ]),
      ...SET,
    })
    expect(
      Object.fromEntries(r.situacoes.map((i) => [i.rotulo, i.valor]))
    ).toEqual({ "(sem informação)": 1, "Em análise": 1, "Em Análise": 1 })
    // vazio é não finalizado
    expect(valor(r, "naoFinalizados")).toBe(3)
  })

  it("KPIs na ordem da D64, sem backlog/saídas/abertos após e sem selos de reconstrução", () => {
    expect(m.kpis.map((k) => k.id)).toEqual([
      "entradas",
      "finalizados",
      "naoFinalizados",
      "atraso",
      "slaVencido",
      "sla",
      "tempoMedio",
      "tempoAceite",
      "reabertos",
      "semSla",
      "slaRenegociado",
      "aguardandoAceite",
    ])
    for (const k of m.kpis) {
      expect("reconstruivel" in k).toBe(false)
      expect(k.definicao.toLowerCase()).not.toContain("backlog")
    }
  })

  it("entradas, finalizados e não finalizados", () => {
    expect(valor(m, "entradas")).toBe(4)
    expect(valor(m, "finalizados")).toBe(3)
    expect(valor(m, "naoFinalizados")).toBe(5)
  })

  it("Finalizado com solução fora do mês e Situação ≠ Finalizado com solução no mês não contam como finalizados no mês", () => {
    // linha 6 (Finalizado, solução em outubro) e linha 11 (aguardando aceite, solução em 30/09)
    expect(valor(m, "finalizados")).toBe(3)
    expect(valor(m, "naoFinalizados")).toBe(5) // inclui a linha 11
  })

  it("% no SLA usa o SLA renegociado e o fim do dia", () => {
    expect(valor(m, "sla")).toBeCloseTo(66.7, 1)
  })

  it("em atraso (por ciclo, com faixas) e SLA vencido são coisas distintas", () => {
    expect(valor(m, "atraso")).toBe(3)
    expect(m.atrasoFaixas).toEqual([
      { rotulo: "1", valor: 0 },
      { rotulo: "2–3", valor: 1 },
      { rotulo: "4–6", valor: 2 },
      { rotulo: "7+", valor: 0 },
    ])
    // SLA no último dia do mês ainda não venceu (< fim de C)
    expect(valor(m, "slaVencido")).toBe(1)
  })

  it("sem SLA e SLA renegociado olham só os não finalizados", () => {
    expect(valor(m, "semSla")).toBe(2)
    expect(valor(m, "slaRenegociado")).toBe(0)
  })

  it("tempo médio e % reabertos entre os finalizados no mês", () => {
    expect(valor(m, "tempoMedio")).toBe(19.7)
    expect(valor(m, "reabertos")).toBeCloseTo(33.3, 1)
  })

  it("aguardando aceite: situação com 'aceite' e sem aceite até o fim", () => {
    expect(valor(m, "aguardandoAceite")).toBe(2)
  })

  it("faixas de atraso: 1, 2–3, 4–6, 7+ meses entre a abertura e o Mes Ref.", () => {
    const abre = (mes: string) => ({ abertura: mes })
    const r = calcularMetricas({
      sheet: sheetChamados(
        [
          "2026-08-31", // 1
          "2026-07-01", // 2
          "2026-06-15", // 3
          "2026-05-02", // 4
          "2026-03-10", // 6
          "2026-02-10", // 7
          "2025-01-10", // 20
          "2026-09-01", // mesmo mês: não atrasa
        ].map(abre)
      ),
      ...SET,
    })
    expect(r.atrasoFaixas.map((f) => f.valor)).toEqual([1, 2, 2, 2])
    expect(valor(r, "atraso")).toBe(7)
  })

  it("duas séries por dimensão: finalizados no mês × não finalizados", () => {
    expect(m.distribuicoes.map((d) => d.id)).toEqual([
      "cliente",
      "areaSuperior",
      "atividade",
    ])
    expect(dist(m, "cliente")).toEqual({
      "Cli A": [3, 4],
      "Cli B": [0, 1],
    })
    expect(m.distribuicoes[0].itens.map((i) => i.rotulo)).toEqual([
      "Cli A",
      "Cli B",
    ])
  })

  it("valores nulos viram '(sem informação)' e mais de 10 itens agrupam em Outros", () => {
    expect(dist(m, "areaSuperior")["(sem informação)"]).toEqual([0, 1])
    const muitas = Array.from({ length: 12 }, (_, i) => ({
      abertura: "2026-09-01",
      cliente: `C${i}`,
    }))
    const g = calcularMetricas({ sheet: sheetChamados(muitas), ...SET })
    const itens = g.distribuicoes.find((d) => d.id === "cliente")!.itens
    expect(itens).toHaveLength(11)
    expect(itens[10]).toEqual({
      rotulo: "Outros",
      finalizados: 0,
      naoFinalizados: 2,
    })
  })

  it("todo KPI tem definição", () => {
    expect(m.kpis.length).toBe(12)
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
    const k = c.kpis.find((x) => x.id === "naoFinalizados")!
    expect(k.anterior).toBe(valor(ant, "naoFinalizados"))
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
    expect(valor(r, "naoFinalizados")).toBe(1)
    expect(valor(r, "finalizados")).toBeNull()
    expect(valor(r, "reabertos")).toBeNull()
    expect(valor(r, "slaVencido")).toBeNull()
    expect(r.avisos.length).toBeGreaterThan(0)
  })

  it("sem a coluna Situação nada que dependa dela é calculado (nunca zero)", () => {
    const s = montarSheet(
      ["Data Abertura", "Data de Solução"],
      [[new Date("2026-09-01T00:00:00Z"), null]]
    )
    const r = calcularMetricas({ sheet: s, ...SET })
    expect(valor(r, "entradas")).toBe(1)
    for (const id of ["finalizados", "naoFinalizados", "atraso", "semSla"])
      expect(valor(r, id)).toBeNull()
    expect(r.situacoes).toEqual([])
    expect(r.atrasoFaixas).toEqual([])
  })

  it("sem finalizados com SLA o % no SLA é null", () => {
    const r = calcularMetricas({
      sheet: sheetChamados([{ abertura: "2026-09-01" }]),
      ...SET,
    })
    expect(valor(r, "sla")).toBeNull()
    expect(valor(r, "tempoMedio")).toBeNull()
  })
})

describe("o conceito de reconstrução acabou: reabertos seguem a Situação", () => {
  const entrada = (ls: LinhaChamado[]) => ({
    sheet: sheetChamadosReab(ls),
    competencia: "2026-09",
  })
  const linhas: LinhaChamado[] = [
    // reaberto depois da solução e ainda Em Análise: não finalizado, mesmo com Data de Solução
    {
      abertura: "2026-07-01",
      solucao: "2026-09-03",
      ultimaReab: "2026-09-08",
      situacao: "Em Análise",
    },
    { abertura: "2026-07-01", solucao: "2026-09-03", situacao: "Finalizado" },
  ]
  it("Data de Solução sem Situação Finalizado não conta como finalizado", () => {
    const m = calcularMetricas(entrada(linhas))
    expect(valor(m, "finalizados")).toBe(1)
    expect(valor(m, "naoFinalizados")).toBe(1)
    expect(m.avisos.join(" ")).not.toMatch(/reabertos depois/)
  })
})

describe("filtro sem a coluna na carga (D61)", () => {
  const m = calcularMetricas({
    sheet: sheetChamados(LINHAS),
    ...SET,
    colunasSemFiltro: ["Autarquia"],
  })

  it("nada é calculado: sem zero numérico", () => {
    expect(m.atrasoFaixas).toEqual([])
    expect(m.situacoes).toEqual([])
    expect(m.totalChamados).toBeNull()
    expect(m.abertosDepois).toBeNull()
    expect(m.linhasSemAbertura).toBeNull()
    expect(m.kpis.every((k) => k.valor === null)).toBe(true)
  })
})

describe("distribuições por operador e por área", () => {
  const ROT = ["Data de abertura", "Situação", "Área", "Operador"]
  const d = (s: string) => new Date(`${s}T00:00:00Z`)
  const sheet = montarSheet(ROT, [
    [d("2026-09-01"), "Em Análise", "Financeiro", "Ana"],
    [d("2026-09-02"), "Em Análise", "Financeiro", "Ana"],
    [d("2026-09-03"), "Em Análise", "Fiscal", "Bia"],
    [d("2026-09-04"), "Em Análise", null, null],
  ])
  const m = calcularMetricas({ sheet, ...SET })

  it("por operador, vazios em (sem informação)", () => {
    expect(m.distribuicoes.find((x) => x.id === "operador")!.itens).toEqual([
      { rotulo: "Ana", finalizados: 0, naoFinalizados: 2 },
      { rotulo: "(sem informação)", finalizados: 0, naoFinalizados: 1 },
      { rotulo: "Bia", finalizados: 0, naoFinalizados: 1 },
    ])
  })

  it("por área", () => {
    const a = m.distribuicoes.find((x) => x.id === "area")!.itens
    expect(a).toContainEqual({
      rotulo: "Financeiro",
      finalizados: 0,
      naoFinalizados: 2,
    })
    expect(a).toContainEqual({
      rotulo: "(sem informação)",
      finalizados: 0,
      naoFinalizados: 1,
    })
  })

  it("sem a coluna não há distribuição", () => {
    const s = calcularMetricas({
      sheet: montarSheet(
        ["Data de abertura", "Situação"],
        [[d("2026-09-01"), "Em Análise"]]
      ),
      ...SET,
    })
    expect(s.distribuicoes.find((x) => x.id === "operador")).toBeUndefined()
    expect(s.distribuicoes.find((x) => x.id === "area")).toBeUndefined()
  })
})

describe("distribuicoesFinalizadosNoPeriodo (toggle da D64)", () => {
  const entrada = { sheet: sheetChamados(LINHAS), ...SET }
  const ms = (s: string) => new Date(`${s}T00:00:00Z`).getTime()
  const cli = (ini: string, fim: string) =>
    Object.fromEntries(
      distribuicoesFinalizadosNoPeriodo(entrada, {
        inicio: ms(ini),
        fim: ms(fim) + 86_400_000 - 1,
      })
        .find((x) => x.id === "cliente")!
        .itens.map((i) => [i.rotulo, [i.finalizados, i.naoFinalizados]])
    )

  it("o período do mês dá os mesmos números do mês", () => {
    expect(cli("2026-09-01", "2026-09-30")).toEqual(
      dist(calcularMetricas(entrada), "cliente")
    )
  })
  it("um período maior traz mais finalizados; os não finalizados não mudam", () => {
    // inclui a linha 9 (solução 15/08) e a 6? (a 6 é 05/10, fora)
    expect(cli("2026-08-01", "2026-09-30")).toEqual({
      "Cli A": [4, 4],
      "Cli B": [0, 1],
    })
  })
  it("sem a coluna Situação ou com filtro sem coluna: vazio", () => {
    expect(
      distribuicoesFinalizadosNoPeriodo(
        { ...entrada, colunasSemFiltro: ["Autarquia"] },
        { inicio: 0, fim: Date.now() }
      )
    ).toEqual([])
  })
})

describe("KPIs tempoAceite e slaRenegociado", () => {
  const val = (linhas: LinhaChamado[], id: string) =>
    valor(calcularMetricas({ sheet: sheetChamados(linhas), ...SET }), id)

  it("tempoAceite: média de aceite - solução dos aceitos no mês; ignora fora do mês, sem solução e negativo", () => {
    const linhas: LinhaChamado[] = [
      { abertura: "2026-08-01", solucao: "2026-09-01", aceite: "2026-09-05" }, // 4
      { abertura: "2026-08-01", solucao: "2026-09-10", aceite: "2026-09-12" }, // 2
      { abertura: "2026-08-01", solucao: "2026-08-01", aceite: "2026-10-05" }, // fora do mês
      { abertura: "2026-08-01", solucao: "2026-07-01", aceite: "2026-08-20" }, // antes do mês
      { abertura: "2026-08-01", aceite: "2026-09-15" }, // sem solução
      { abertura: "2026-08-01", solucao: "2026-09-20", aceite: "2026-09-18" }, // negativo
    ]
    expect(val(linhas, "tempoAceite")).toBe(3)
  })

  it("tempoAceite sem aceites válidos ou sem coluna é null", () => {
    expect(val([{ abertura: "2026-09-01" }], "tempoAceite")).toBeNull()
    const s = montarSheet(
      ["Data Abertura", "Situação", "Data de Solução"],
      [[new Date("2026-09-01T00:00:00Z"), "Em Análise", null]]
    )
    const r = calcularMetricas({ sheet: s, ...SET })
    expect(valor(r, "tempoAceite")).toBeNull()
    const k = r.kpis.find((x) => x.id === "tempoAceite")!
    expect(k.formato).toBe("dias")
    expect(k.melhorQuando).toBe("menor")
    expect(k.definicao.length).toBeGreaterThan(5)
  })

  it("slaRenegociado conta só os não finalizados com SLA renegociado", () => {
    const linhas: LinhaChamado[] = [
      { abertura: "2026-08-01", slaReneg: "2026-10-01" }, // não finalizado, conta
      { abertura: "2026-08-01", sla: "2026-09-01" }, // sem reneg
      {
        abertura: "2026-08-01",
        solucao: "2026-09-10",
        slaReneg: "2026-09-30",
      }, // finalizado
    ]
    const r = calcularMetricas({ sheet: sheetChamados(linhas), ...SET })
    const k = r.kpis.find((x) => x.id === "slaRenegociado")!
    expect(k.valor).toBe(1)
    expect(k.formato).toBe("inteiro")
    expect(k.melhorQuando).toBe("neutro")
  })

  it("slaRenegociado sem a coluna é null", () => {
    const s = montarSheet(
      ["Data Abertura", "Situação", "Data de Solução"],
      [[new Date("2026-09-01T00:00:00Z"), "Em Análise", null]]
    )
    expect(
      valor(calcularMetricas({ sheet: s, ...SET }), "slaRenegociado")
    ).toBeNull()
  })

  it("filtro sem coluna anula os dois", () => {
    const r = calcularMetricas({
      sheet: sheetChamados([{ abertura: "2026-09-01" }]),
      ...SET,
      colunasSemFiltro: ["Cliente"],
    })
    expect(valor(r, "tempoAceite")).toBeNull()
    expect(valor(r, "slaRenegociado")).toBeNull()
  })
})
