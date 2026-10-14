import { describe, expect, it } from "vitest"
import type { CargaMeta } from "@/cargas"
import type { Leitura, MetricasChamados } from "@/chamados"
import { sheetChamados } from "@/chamados/test-util"
import {
  agruparAxB,
  chipsDosFiltros,
  evidenciaDaLeitura,
  numerosDaLeitura,
  regraDaLeitura,
  selosDaLeitura,
  temOutros,
  definirFiltro,
  filtrarSheet,
  filtroDaLeitura,
  opcoesDoFiltro,
  recorteTexto,
  descreverDelta,
  formatarKpi,
  idAlvo,
  linhasDeSerie,
  motivoSemDelta,
  metaAnterior,
  opcoesDeCompetencia,
  pontosDaEvolucao,
  primeiraCompetencia,
  ultimasVersoes,
} from "./logica"

const meta = (competencia: string, versao = 1): CargaMeta => ({
  id: `${competencia}-v${versao}`,
  tipo: "chamados",
  competencia,
  versao,
  importadaEm: "2026-10-01T10:00:00Z",
  arquivo: "x.xlsx",
  linhas: 1,
})

describe("formatarKpi", () => {
  it("formata inteiro, percentual e dias em pt-BR; nulo vira traço", () => {
    expect(formatarKpi(1234, "inteiro")).toBe("1.234")
    expect(formatarKpi(49.23, "percentual")).toBe("49,2%")
    expect(formatarKpi(50.3, "dias")).toBe("50,3 dias")
    expect(formatarKpi(null, "inteiro")).toBe("—")
  })
})

describe("descreverDelta", () => {
  it("backlog (menor é melhor): subir é ruim", () => {
    const d = descreverDelta(
      { delta: 18, formato: "inteiro", melhorQuando: "menor" },
      "ago/26"
    )
    expect(d).toMatchObject({
      texto: "+18 vs ago/26",
      sentido: "alta",
      tom: "ruim",
      rotuloTom: "pior",
    })
  })
  it("saídas (maior é melhor): subir é bom; queda de percentual em p.p.", () => {
    expect(
      descreverDelta(
        { delta: 5, formato: "inteiro", melhorQuando: "maior" },
        "ago/26"
      )
    ).toMatchObject({ tom: "bom", rotuloTom: "melhor" })
    expect(
      descreverDelta(
        { delta: -3.24, formato: "percentual", melhorQuando: "maior" },
        "ago/26"
      )
    ).toMatchObject({
      texto: "-3,2 p.p. vs ago/26",
      sentido: "queda",
      tom: "ruim",
    })
  })
  it("contra mês reconstruído o texto diz '(reconstruído)'", () => {
    expect(
      descreverDelta(
        { delta: -60, formato: "inteiro", melhorQuando: "menor" },
        "ago/26",
        true
      )
    ).toMatchObject({ texto: "-60 vs ago/26 (reconstruído)", tom: "bom" })
  })
  it("neutro não ganha cor de bom/ruim; zero é 'sem variação'; nulo não tem delta", () => {
    expect(
      descreverDelta(
        { delta: 4, formato: "inteiro", melhorQuando: "neutro" },
        "ago/26"
      )
    ).toMatchObject({ tom: "neutro", rotuloTom: "" })
    expect(
      descreverDelta(
        { delta: 0, formato: "inteiro", melhorQuando: "menor" },
        "ago/26"
      )
    ).toMatchObject({ sentido: "igual", tom: "neutro", texto: "0 vs ago/26" })
    expect(
      descreverDelta(
        { delta: null, formato: "inteiro", melhorQuando: "menor" },
        "ago/26"
      )
    ).toBeNull()
  })
})

describe("evidência", () => {
  it("o id do alvo é estável por indicador/gráfico", () => {
    expect(idAlvo("backlog")).toBe("ev-backlog")
  })
})

describe("versões e anterior", () => {
  const metas = [
    meta("2026-08", 1),
    meta("2026-08", 2),
    meta("2026-09", 1),
    meta("2026-07", 1),
  ]
  it("ultimasVersoes: a mais recente de cada mês, do mais antigo ao mais novo", () => {
    expect(ultimasVersoes(metas).map((m) => m.id)).toEqual([
      "2026-07-v1",
      "2026-08-v2",
      "2026-09-v1",
    ])
  })
  it("metaAnterior: versão mais recente da competência anterior, ou null", () => {
    expect(metaAnterior(metas, "2026-09")?.id).toBe("2026-08-v2")
    expect(metaAnterior(metas, "2026-07")).toBeNull()
  })
})

describe("primeiraCompetencia", () => {
  it("mês da menor data de abertura", () => {
    const s = sheetChamados([
      { abertura: "2026-07-20" },
      { abertura: "2026-05-02" },
      { abertura: null },
    ])
    expect(primeiraCompetencia(s)).toBe("2026-05")
  })
})

describe("opcoesDeCompetencia", () => {
  it("com várias cargas lista só as cargas (mais recente primeiro)", () => {
    const o = opcoesDeCompetencia([meta("2026-08"), meta("2026-09")], "2026-01")
    expect(o.map((x) => [x.competencia, x.propria])).toEqual([
      ["2026-09", true],
      ["2026-08", true],
    ])
  })
  it("com uma carga oferece meses reconstruídos anteriores (até onde há dados)", () => {
    const o = opcoesDeCompetencia([meta("2026-09")], "2026-07")
    expect(o.map((x) => [x.competencia, x.propria])).toEqual([
      ["2026-09", true],
      ["2026-08", false],
      ["2026-07", false],
    ])
    expect(o[1].rotulo).toBe("Agosto de 2026 (reconstruído)")
  })
})

describe("opcoesDeCompetencia com mês faltando no meio", () => {
  it("oferece o mês faltante como reconstruído pela carga seguinte", () => {
    const o = opcoesDeCompetencia([meta("2026-07"), meta("2026-09")], "2026-01")
    expect(o.map((x) => [x.competencia, x.propria, x.deCarga])).toEqual([
      ["2026-09", true, undefined],
      ["2026-08", false, "2026-09"],
      ["2026-07", true, undefined],
    ])
    expect(o[1].rotulo).toBe("Agosto de 2026 (reconstruído)")
  })
  it("só oferece buracos dentro da janela de 6 meses", () => {
    const o = opcoesDeCompetencia(
      [meta("2026-01"), meta("2026-08"), meta("2026-09")],
      "2026-01"
    )
    expect(o.map((x) => [x.competencia, x.propria])).toEqual([
      ["2026-09", true],
      ["2026-08", true],
      ["2026-07", false],
      ["2026-06", false],
      ["2026-05", false],
      ["2026-04", false],
      ["2026-01", true],
    ])
  })
})

describe("pontosDaEvolucao", () => {
  describe("mês faltando no meio", () => {
    const longa = sheetChamados(
      ["01", "02", "03", "04", "05", "06", "07", "08", "09"].map((m) => ({
        abertura: `2026-${m}-05`,
      }))
    )
    const proprias = (...cs: string[]) =>
      cs.map((c) => ({ meta: meta(c), sheet: longa }))
    it("jul+set: ago vem reconstruído pela carga de set", () => {
      const { pontos } = pontosDaEvolucao(proprias("2026-07", "2026-09"), 6)
      expect(pontos.map((p) => [p.competencia, p.propria])).toEqual([
        ["2026-04", false],
        ["2026-05", false],
        ["2026-06", false],
        ["2026-07", true],
        ["2026-08", false],
        ["2026-09", true],
      ])
    })
    it("mai+set: abr pela de mai; jun, jul e ago pela de set", () => {
      const a = sheetChamados([{ abertura: "2026-04-05" }])
      const b = sheetChamados([
        { abertura: "2026-04-05" },
        { abertura: "2026-06-05" },
      ])
      const { pontos } = pontosDaEvolucao(
        [
          { meta: meta("2026-05"), sheet: a },
          { meta: meta("2026-09"), sheet: b },
        ],
        6
      )
      expect(pontos.map((p) => [p.competencia, p.propria])).toEqual([
        ["2026-04", false],
        ["2026-05", true],
        ["2026-06", false],
        ["2026-07", false],
        ["2026-08", false],
        ["2026-09", true],
      ])
      // jun foi montado pela planilha de set (tem chamado aberto em jun); abr pela de mai
      expect(pontos[2].valores.backlog).toBe(2)
      expect(pontos[0].valores.backlog).toBe(1)
    })
  })
  const a = sheetChamados([
    { abertura: "2026-07-05", solucao: "2026-07-20" },
    { abertura: "2026-08-03", solucao: "2026-09-10", situacao: "Finalizado" },
    { abertura: "2026-08-10" },
    { abertura: "2026-09-02" },
  ])
  it("kpis dizem quais dependem da carga do mês (reconstruivel)", () => {
    const { kpis } = pontosDaEvolucao([{ meta: meta("2026-09"), sheet: a }], 6)
    expect(kpis.find((k) => k.id === "backlog")?.reconstruivel).toBe(true)
    expect(kpis.find((k) => k.id === "sla")?.reconstruivel).toBe(false)
  })
  it("junta cargas próprias (versão mais recente) e meses reconstruídos marcados", () => {
    const { pontos, kpis } = pontosDaEvolucao(
      [{ meta: meta("2026-09"), sheet: a }],
      6
    )
    expect(pontos.map((p) => [p.competencia, p.propria])).toEqual([
      ["2026-07", false],
      ["2026-08", false],
      ["2026-09", true],
    ])
    expect(kpis.map((k) => k.id)).toContain("backlog")
    const ago = pontos[1]
    expect(ago.valores.backlog).toBe(2) // 08-03 (solução só em setembro) e 08-10
    // KPIs que exigem a carga do mês ficam nulos nos reconstruídos
    expect(ago.valores.sla).toBeNull()
  })
  it("limita o total de pontos ao máximo informado", () => {
    const { pontos } = pontosDaEvolucao([{ meta: meta("2026-09"), sheet: a }], 2)
    expect(pontos.map((p) => p.competencia)).toEqual(["2026-08", "2026-09"])
  })
  describe("exatamente as 6 competências mais recentes", () => {
    const longa = sheetChamados(
      ["01", "02", "03", "04", "05", "06", "07", "08", "09"].map((m) => ({
        abertura: `2026-${m}-05`,
      }))
    )
    const proprias = (...cs: string[]) =>
      cs.map((c) => ({ meta: meta(c), sheet: longa }))
    it("3 próprias + 3 reconstruídos", () => {
      const { pontos } = pontosDaEvolucao(
        proprias("2026-07", "2026-08", "2026-09"),
        6
      )
      expect(pontos.map((p) => [p.competencia, p.propria])).toEqual([
        ["2026-04", false],
        ["2026-05", false],
        ["2026-06", false],
        ["2026-07", true],
        ["2026-08", true],
        ["2026-09", true],
      ])
    })
    it("7 próprias: só as 6 mais recentes", () => {
      const { pontos } = pontosDaEvolucao(
        proprias(
          "2026-03", "2026-04", "2026-05", "2026-06",
          "2026-07", "2026-08", "2026-09"
        ),
        6
      )
      expect(pontos.map((p) => p.competencia)).toEqual([
        "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
      ])
      expect(pontos.every((p) => p.propria)).toBe(true)
    })
    it("1 própria: 5 reconstruídos + 1", () => {
      const { pontos } = pontosDaEvolucao(proprias("2026-09"), 6)
      expect(pontos.map((p) => p.propria)).toEqual([
        false, false, false, false, false, true,
      ])
      expect(pontos[0].competencia).toBe("2026-04")
    })
    it("sem cargas: vazio", () => {
      expect(pontosDaEvolucao([], 6)).toEqual({ pontos: [], kpis: [] })
    })
  })
})

describe("linhasDeSerie", () => {
  it("separa o trecho próprio do reconstruído, ligando os dois", () => {
    const pontos = [
      { competencia: "2026-08", rotulo: "ago/26", propria: false, valores: { x: 3 } },
      { competencia: "2026-09", rotulo: "set/26", propria: true, valores: { x: 5 } },
    ]
    expect(linhasDeSerie(pontos, ["x"])).toEqual([
      { competencia: "2026-08", rotulo: "ago/26", propria: false, x_p: null, x_r: 3 },
      { competencia: "2026-09", rotulo: "set/26", propria: true, x_p: 5, x_r: 5 },
    ])
  })
})

describe("agruparAxB", () => {
  it("mantém os maiores e soma o resto em Outros", () => {
    const itens = [
      { rotulo: "A", a: 5, b: 9 },
      { rotulo: "B", a: 4, b: 4 },
      { rotulo: "C", a: 1, b: 2 },
      { rotulo: "D", a: 1, b: 0 },
    ]
    expect(agruparAxB(itens, 2)).toEqual([
      { rotulo: "A", a: 5, b: 9 },
      { rotulo: "B", a: 4, b: 4 },
      { rotulo: "Outros", a: 2, b: 2 },
    ])
    expect(agruparAxB(itens, 4)).toEqual(itens)
  })
})

describe("motivoSemDelta", () => {
  it("usa o detalhe do motor; senão explica pela origem do mês anterior", () => {
    const base = { detalhe: undefined, reconstruivel: false }
    expect(
      motivoSemDelta({ ...base, detalhe: "exige a carga daquele mês" }, true)
    ).toBe("exige a carga daquele mês")
    expect(motivoSemDelta(base, false)).toBe("exige a carga daquele mês")
    expect(motivoSemDelta({ ...base, reconstruivel: true }, true)).toBe(
      "sem base no mês anterior"
    )
  })
})

describe("filtros de Chamados", () => {
  const s = sheetChamados([
    { abertura: "2026-08-02", cliente: "PMC", atividade: "Suporte" },
    { abertura: "2026-08-03", cliente: "PMC", atividade: "Projeto", solucao: "2026-08-20" },
    { abertura: "2026-08-04", cliente: "Ouro", atividade: "Suporte" },
    { abertura: "2026-10-04", cliente: null, atividade: "Suporte" },
  ])
  it("filtrarSheet mantém as colunas e só as linhas do recorte (AND entre campos)", () => {
    const f = filtrarSheet(s, { cliente: ["PMC"] }, "2026-08")
    expect(f.rows).toHaveLength(2)
    expect(f.columns).toBe(s.columns)
    expect(
      filtrarSheet(s, { cliente: ["PMC"], atividade: ["Suporte"] }, "2026-08").rows
    ).toHaveLength(1)
    expect(filtrarSheet(s, {}, "2026-08")).toBe(s)
  })
  it("sem informação é um valor filtrável e a situação na competência usa a competência dada", () => {
    expect(filtrarSheet(s, { cliente: ["(sem informação)"] }, "2026-08").rows).toHaveLength(1)
    expect(
      filtrarSheet(s, { situacaoNaCompetencia: ["Resolvido no mês"] }, "2026-08").rows
    ).toHaveLength(1)
    expect(
      filtrarSheet(s, { situacaoNaCompetencia: ["Aberto após a competência"] }, "2026-08").rows
    ).toHaveLength(1)
  })
  it("coluna ausente na planilha não casa com nenhuma linha", () => {
    const sem = sheetChamados([{ abertura: "2026-08-02" }])
    const semOperador = { ...sem, rows: sem.rows }
    expect(filtrarSheet(semOperador, { operador: ["X"] }, "2026-08").rows).toHaveLength(0)
  })
  it("opcoesDoFiltro lista valores distintos ordenados; situação lista as 5 classes", () => {
    expect(opcoesDoFiltro(s, "cliente")).toEqual(["(sem informação)", "Ouro", "PMC"])
    expect(opcoesDoFiltro(s, "situacaoNaCompetencia")).toHaveLength(5)
  })
  it("chips, recorte e definirFiltro", () => {
    const f = definirFiltro(definirFiltro({}, "cliente", ["PMC", "Ouro"]), "atividade", ["Suporte"])
    expect(chipsDosFiltros(f)).toEqual([
      { key: "cliente", label: "Cliente", text: "PMC, Ouro" },
      { key: "atividade", label: "Atividade", text: "Suporte" },
    ])
    expect(recorteTexto(f)).toBe("Cliente: PMC, Ouro · Atividade: Suporte")
    expect(definirFiltro(f, "cliente", [])).toEqual({ atividade: ["Suporte"] })
    expect(recorteTexto({})).toBe("")
  })
  it("filtroDaLeitura: cliente vira filtro; situação traduz o código; idade não filtra", () => {
    const l = (filtro: unknown) => ({ filtro }) as never
    expect(filtroDaLeitura(l({ campo: "cliente", valores: ["PMC"] }))).toEqual({
      campo: "cliente",
      valores: ["PMC"],
    })
    expect(
      filtroDaLeitura(l({ campo: "situacaoNaCompetencia", valores: ["aberto-no-fim"] }))
    ).toEqual({ campo: "situacaoNaCompetencia", valores: ["Aberto no fim do mês"] })
    expect(filtroDaLeitura(l({ campo: "idade", valores: ["> 180 dias"] }))).toBeNull()
    expect(filtroDaLeitura(l(undefined))).toBeNull()
  })
})

const kpi = (id: string, rotulo: string, valor: number | null, anterior: number | null = null) => ({
  id, rotulo, valor, anterior, formato: "inteiro" as const,
  delta: valor !== null && anterior !== null ? valor - anterior : null,
  melhorQuando: "menor" as const, definicao: "", reconstruivel: true,
})
const metricas = {
  kpis: [kpi("backlog", "Backlog aberto", 100, 90), kpi("entradas", "Entradas no mês", 50), kpi("saidas", "Saídas no mês", 90), kpi("semSla", "Sem SLA", 30)],
  distribuicoes: [
    { id: "cliente", titulo: "Backlog por cliente", reconstruivel: true, itens: [{ rotulo: "PMC", valor: 67 }, { rotulo: "Ouro", valor: 33 }] },
    { id: "situacao", titulo: "Backlog por situação atual (na exportação)", reconstruivel: false, itens: [{ rotulo: "Aguardando aceite", valor: 30 }, { rotulo: "Em análise", valor: 70 }] },
  ],
  envelhecimento: [{ rotulo: "0–30 dias", valor: 10 }, { rotulo: "> 180 dias", valor: 38 }],
} as unknown as MetricasChamados
const leitura = (id: Leitura["id"], extra: Partial<Leitura> = {}): Leitura => ({
  id, severidade: "atencao", titulo: "t", texto: "x", evidencia: [], ...extra,
})

describe("leituras: regra, números, evidência e selos", () => {
  it("regraDaLeitura traz o limite que disparou", () => {
    expect(regraDaLeitura("concentracao")).toMatch(/40%/)
    expect(regraDaLeitura("envelhecimento")).toMatch(/180 dias/)
    expect(regraDaLeitura("semSla")).toMatch(/20%/)
  })
  it("numerosDaLeitura: específicos primeiro, depois os indicadores da evidência", () => {
    const n = numerosDaLeitura(
      leitura("concentracao", { evidencia: ["cliente", "backlog"], filtro: { campo: "cliente", valores: ["PMC"] } }),
      metricas
    )
    expect(n[0]).toEqual({ rotulo: "Chamados de PMC no backlog", valor: "67" })
    expect(n[1]).toEqual({ rotulo: "Participação no backlog", valor: "67%" })
    expect(n.find((x) => x.rotulo === "Backlog aberto")).toMatchObject({ valor: "100" })
    const e = numerosDaLeitura(leitura("envelhecimento", { evidencia: ["envelhecimento", "backlog"] }), metricas)
    expect(e[0]).toEqual({ rotulo: "Abertos há mais de 180 dias", valor: "38" })
    expect(e[1]).toEqual({ rotulo: "Participação no backlog", valor: "38%" })
  })
  it("evidenciaDaLeitura escolhe o gráfico e o item destacado", () => {
    expect(
      evidenciaDaLeitura(leitura("concentracao", { filtro: { campo: "cliente", valores: ["PMC"] } }), metricas)
    ).toMatchObject({ titulo: "Backlog por cliente", destaque: ["PMC"] })
    expect(evidenciaDaLeitura(leitura("envelhecimento"), metricas)).toMatchObject({
      titulo: "Envelhecimento do backlog",
      destaque: ["> 180 dias"],
    })
    expect(evidenciaDaLeitura(leitura("gargaloCliente"), metricas)).toMatchObject({
      destaque: ["Aguardando aceite"],
    })
    expect(evidenciaDaLeitura(leitura("semSla"), metricas)).toMatchObject({
      itens: [
        { rotulo: "Com SLA previsto", valor: 70 },
        { rotulo: "Sem SLA", valor: 30 },
      ],
      destaque: ["Sem SLA"],
    })
    expect(evidenciaDaLeitura(leitura("fluxo"), metricas)?.itens).toEqual([
      { rotulo: "Entradas", valor: 50 },
      { rotulo: "Saídas", valor: 90 },
    ])
  })
  it("selosDaLeitura: situação da exportação e mês anterior reconstruído", () => {
    expect(selosDaLeitura(leitura("gargaloCliente"), true)).toEqual(["exportacao"])
    expect(selosDaLeitura(leitura("fluxo"), false)).toEqual(["reconstruido"])
    expect(selosDaLeitura(leitura("fluxo"), true)).toEqual([])
    expect(selosDaLeitura(leitura("concentracao"), false)).toEqual([])
  })
  it("temOutros", () => {
    expect(temOutros([{ rotulo: "A", valor: 1 }, { rotulo: "Outros", valor: 3 }])).toBe(true)
    expect(temOutros([{ rotulo: "A", valor: 1 }])).toBe(false)
  })
})
