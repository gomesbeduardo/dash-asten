import { describe, expect, it } from "vitest"
import type { Sheet } from "@/core"
import type { CargaMeta } from "@/cargas"
import type { Leitura, MetricasChamados } from "@/chamados"
import { calcularMetricas } from "@/chamados"
import { linha, montarSheet, ROTULOS_PADRAO, sheetChamados } from "@/chamados/test-util"
import {
  CAMPOS_FILTRO,
  colunasAusentes,
  agruparSeries,
  compararN,
  proximaParaAdicionar,
  sentidoEntre,
  chipsDosFiltros,
  evidenciaDaLeitura,
  numerosDaLeitura,
  regraDaLeitura,
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
  seriesPorDimensao,
  ultimasVersoes,
} from "./logica"

import { foto, mai, out, v1, v2 } from "@/chamados/fotos-teste"

const meta = (competencia: string, versao = 1): CargaMeta => ({
  id: `${competencia}-v${versao}`,
  tipo: "chamados",
  competencia,
  versao,
  importadaEm: "2026-10-01T10:00:00Z",
  arquivo: "x.xlsx",
  linhas: 1, nome: null, arquivadaEm: null,
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
  it("não finalizados (menor é melhor): subir é ruim", () => {
    const d = descreverDelta(
      { delta: 18, formato: "inteiro", melhorQuando: "menor" },
      "ago/26"
    )
    expect(d).toMatchObject({
      texto: "+18",
      periodo: "ago/26",
      aria: "+18 em relação a ago/26, pior",
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
      texto: "−3,2 p.p.",
      sentido: "queda",
      tom: "ruim",
    })
  })
  it("o texto nunca fala em reconstrução (o conceito acabou)", () => {
    const d = descreverDelta(
      { delta: -60, formato: "inteiro", melhorQuando: "menor" },
      "ago/26"
    )
    expect(d).toMatchObject({ texto: "−60", tom: "bom" })
    expect(d?.texto).not.toMatch(/reconstru/)
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
    ).toMatchObject({ sentido: "igual", tom: "neutro", texto: "0", aria: "0 em relação a ago/26" })
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
    expect(idAlvo("naoFinalizados")).toBe("ev-naoFinalizados")
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

describe("opcoesDeCompetencia", () => {
  it("lista só as cargas (fotos), da mais recente à mais antiga", () => {
    const o = opcoesDeCompetencia([meta("2026-08"), meta("2026-09")])
    expect(o.map((x) => x.competencia)).toEqual(["2026-09", "2026-08"])
    expect(o[0].rotulo).toBe("Setembro de 2026")
  })
  it("com uma só carga não oferece meses reconstruídos", () => {
    const o = opcoesDeCompetencia([meta("2026-09")])
    expect(o.map((x) => x.competencia)).toEqual(["2026-09"])
  })
  it("mês sem carga no meio não vira opção; usa a versão mais recente de cada mês", () => {
    const o = opcoesDeCompetencia([
      meta("2026-07"),
      meta("2026-09", 1),
      meta("2026-09", 2),
    ])
    expect(o.map((x) => [x.competencia, x.meta.versao])).toEqual([
      ["2026-09", 2],
      ["2026-07", 1],
    ])
    expect(o.map((x) => x.rotulo).join()).not.toMatch(/reconstru/)
  })
})

describe("pontosDaEvolucao", () => {
  const a = sheetChamados([
    { abertura: "2026-07-05", solucao: "2026-07-20" },
    { abertura: "2026-08-03", solucao: "2026-09-10", situacao: "Finalizado" },
    { abertura: "2026-08-10" },
    { abertura: "2026-09-02" },
  ])
  const longa = sheetChamados(
    ["01", "02", "03", "04", "05", "06", "07", "08", "09"].map((m) => ({
      abertura: `2026-${m}-05`,
    }))
  )
  const proprias = (...cs: string[]) =>
    cs.map((c) => ({ meta: meta(c), sheet: longa }))

  it("janela de calendário sem buracos: mês sem posição vira ponto marcado", () => {
    const { pontos } = pontosDaEvolucao(proprias("2026-07", "2026-09"), 6)
    expect(pontos.map((p) => p.competencia)).toEqual([
      "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
    ])
    expect(pontos.map((p) => !!p.semFoto)).toEqual([true, true, true, false, true, false])
    expect(pontos[0].dica).toBe("sem posição de abr/26")
    expect(pontos[0].valores.naoFinalizados).toBeNull()
  })
  it("cada ponto é a foto do próprio Mes Ref.", () => {
    const { pontos, kpis } = pontosDaEvolucao(
      [{ meta: meta("2026-09"), sheet: a }],
      6
    )
    expect(pontos).toHaveLength(6)
    expect(pontos.slice(0, 5).every((p) => p.semFoto)).toBe(true)
    expect(pontos[5].semFoto).toBeUndefined()
    expect(kpis.map((k) => k.id)).toContain("naoFinalizados")
    expect(kpis.map((k) => k.id)).not.toContain("backlog")
    // 08-10 e 09-02 estão abertos; 08-03 está Finalizado
    expect(pontos[5].valores.naoFinalizados).toBe(2)
    expect(pontos[5].valores.entradas).toBe(1)
    expect(kpis.every((k) => !("reconstruivel" in k))).toBe(true)
  })
  it("limita o total de pontos ao máximo informado (os mais recentes)", () => {
    const { pontos } = pontosDaEvolucao(
      proprias("2026-07", "2026-08", "2026-09"),
      2
    )
    expect(pontos.map((p) => p.competencia)).toEqual(["2026-08", "2026-09"])
  })
  it("7 cargas: só as 6 mais recentes", () => {
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
  })
  it("usa a versão mais recente da competência", () => {
    const v1 = sheetChamados([{ abertura: "2026-09-02" }])
    const v2 = sheetChamados([
      { abertura: "2026-09-02" },
      { abertura: "2026-09-03" },
    ])
    const { pontos } = pontosDaEvolucao(
      [
        { meta: meta("2026-09", 1), sheet: v1 },
        { meta: meta("2026-09", 2), sheet: v2 },
      ],
      6
    )
    expect(pontos[5].valores.naoFinalizados).toBe(2)
  })
  it("sem cargas: vazio", () => {
    expect(pontosDaEvolucao([], 6)).toMatchObject({ pontos: [], kpis: [], avisosFiltro: [] })
  })
})

describe("pontosDaEvolucao com as fotos de teste (D65)", () => {
  const m = (c: string, versao = 1) => meta(c, versao)
  const cargas = [
    { meta: m("2026-04", 1), sheet: foto(v1, "2026-04-01") },
    { meta: m("2026-04", 2), sheet: foto(v2, "2026-04-01") },
    { meta: m("2026-05"), sheet: foto(mai, "2026-05-01") },
    { meta: m("2026-10"), sheet: foto(out, "2026-10-01") },
  ]
  const r = pontosDaEvolucao(cargas, 7)
  const por = (c: string) => r.pontos.find((p) => p.competencia === c)!

  it("janela abr–out: mês com foto e mês sem posição, sem buracos", () => {
    expect(r.pontos.map((p) => p.competencia)).toEqual([
      "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
    ])
    expect(r.pontos.map((p) => !!p.semFoto)).toEqual([
      false, false, true, true, true, true, false,
    ])
  })
  it("maio corrigido pela posição de outubro: finalizados 2, original 1", () => {
    expect(por("2026-05").valores.finalizados).toBe(2)
    expect(por("2026-05").originais?.finalizados).toBe(1)
    expect(por("2026-05").corrigidoPor).toEqual(["2026-10"])
    expect(por("2026-10").originais).toBeUndefined()
  })
  it("meses sem posição: só entradas e finalizados das datas; o resto null", () => {
    const par = (c: string) => [por(c).valores.entradas, por(c).valores.finalizados]
    expect(par("2026-06")).toEqual([0, 1])
    expect(par("2026-07")).toEqual([0, 0])
    expect(par("2026-08")).toEqual([1, 0])
    expect(par("2026-09")).toEqual([0, 0])
    for (const c of ["2026-06", "2026-07", "2026-08", "2026-09"]) {
      for (const k of r.kpis)
        if (k.id !== "entradas" && k.id !== "finalizados")
          expect(por(c).valores[k.id]).toBeNull()
      expect(por(c).dica).toBe(`sem posição de ${por(c).rotulo.toLowerCase().slice(0, 3)}/26`)
    }
  })
  it("Chamados por situação: uma linha por situação; mês sem posição é null", () => {
    const rotulos = r.situacoes.series.map((s) => s.rotulo)
    expect(rotulos).toContain("Aguardando cliente")
    const id = r.situacoes.series.find((s) => s.rotulo === "Em Atendimento")!.id
    const sp = (c: string) => r.situacoes.pontos.find((p) => p.competencia === c)!
    expect(sp("2026-06").valores[id]).toBeNull()
    expect(sp("2026-05").valores[id]).toBe(0) // corrigido: era 1
    expect(sp("2026-05").originais?.[id]).toBe(1)
  })
  it("cartões por operador/cliente: não finalizados por foto; mês sem posição null", () => {
    const op = r.dimensoes.operador
    expect(op.pontos).toHaveLength(7)
    const id = op.series[0].id
    expect(op.pontos[2].valores[id]).toBeNull() // jun
    expect(op.pontos[6].valores[id]).not.toBeNull()
  })
})

describe("linhasDeSerie (D65: marcas de corrigido e sem posição)", () => {
  it("leva o original e a dica do ponto para a linha", () => {
    const ls = linhasDeSerie(
      [
        { competencia: "2026-05", rotulo: "mai/26", valores: { x: 2 }, originais: { x: 1 } },
        { competencia: "2026-06", rotulo: "jun/26", valores: { x: null }, semFoto: true, dica: "sem posição de jun/26" },
      ],
      ["x"]
    )
    expect(ls[0]).toMatchObject({ x: 2, x__o: 1 })
    expect(ls[0].dica).toBeUndefined()
    expect(ls[1]).toMatchObject({ x: null, dica: "sem posição de jun/26" })
    expect("x__o" in ls[1]).toBe(false)
  })
})

describe("linhasDeSerie", () => {
  const pt = (c: string, v: number | null) => ({
    competencia: `2026-${c}`,
    rotulo: c,
    valores: { x: v },
  })
  it("uma chave por série; sem dado (null) quebra a linha", () => {
    expect(
      linhasDeSerie([pt("07", 1), pt("08", null), pt("09", 3)], ["x"]).map(
        (l) => l.x
      )
    ).toEqual([1, null, 3])
  })
  it("mantém competência e rótulo, sem marcas de reconstrução", () => {
    const [l] = linhasDeSerie([pt("07", 1)], ["x"])
    expect(l).toEqual({ competencia: "2026-07", rotulo: "07", x: 1 })
  })
})

describe("agruparSeries", () => {
  it("mantém os maiores e soma o resto em Outros, coluna a coluna", () => {
    const itens = [
      { rotulo: "A", valores: [5, 6, 9] },
      { rotulo: "B", valores: [4, 4, 4] },
      { rotulo: "C", valores: [1, 0, 2] },
      { rotulo: "D", valores: [1, 1, 0] },
    ]
    expect(agruparSeries(itens, 2)).toEqual([
      { rotulo: "A", valores: [5, 6, 9] },
      { rotulo: "B", valores: [4, 4, 4] },
      { rotulo: "Outros", valores: [2, 1, 2] },
    ])
    expect(agruparSeries(itens, 4)).toEqual(itens)
  })
})

describe("sentidoEntre", () => {
  it("sobe, desce ou igual (com o mesmo arredondamento do Δ); sem dado vira null", () => {
    expect(sentidoEntre(3, 5, "inteiro")).toBe("alta")
    expect(sentidoEntre(5, 3, "inteiro")).toBe("queda")
    expect(sentidoEntre(5, 5, "inteiro")).toBe("igual")
    expect(sentidoEntre(10.01, 10.04, "percentual")).toBe("igual")
    expect(sentidoEntre(null, 5, "inteiro")).toBeNull()
    expect(sentidoEntre(5, null, "inteiro")).toBeNull()
  })
})

describe("proximaParaAdicionar", () => {
  const ops = ["2026-09", "2026-08", "2026-07", "2026-06"].map((competencia) => ({ competencia }))
  it("é a próxima mais antiga que a mais antiga escolhida", () => {
    expect(proximaParaAdicionar(ops, ["2026-08", "2026-09"])).toBe("2026-07")
    expect(proximaParaAdicionar(ops, ["2026-07", "2026-09", "2026-08"])).toBe("2026-06")
  })
  it("sem nada mais antigo, usa a mais recente ainda livre; sem livre, null", () => {
    expect(proximaParaAdicionar(ops, ["2026-06", "2026-07"])).toBe("2026-09")
    expect(proximaParaAdicionar(ops, ["2026-06", "2026-07", "2026-08", "2026-09"])).toBeNull()
  })
})

describe("compararN", () => {
  const m = (competencia: string, nao: number | null, sla: number | null, itens: [string, number, number][]) =>
    ({
      competencia,
      kpis: [
        { id: "naoFinalizados", rotulo: "Não finalizados", formato: "inteiro", valor: nao, melhorQuando: "menor" },
        { id: "sla", rotulo: "% no SLA", formato: "percentual", valor: sla, melhorQuando: "maior", detalhe: "sem dado" },
      ],
      distribuicoes: [{ id: "cliente", titulo: "Por cliente", itens: itens.map(([rotulo, finalizados, naoFinalizados]) => ({ rotulo, finalizados, naoFinalizados })) }],
      atrasoFaixas: [{ rotulo: "1", valor: nao ?? 0 }],
    }) as unknown as MetricasChamados
  const r = compararN([
    m("2026-07", 4, null, [["Cli A", 9, 4]]),
    m("2026-08", 6, 50, [["Cli A", 9, 4], ["Cli B", 9, 2]]),
    m("2026-09", 6, 40, [["Cli B", 9, 5], ["Cli A", 9, 1]]),
  ])
  it("uma coluna por competência; Δ = última − primeira; setas contra a coluna anterior", () => {
    expect(r.competencias).toEqual(["2026-07", "2026-08", "2026-09"])
    const b = r.kpis.find((k) => k.id === "naoFinalizados")!
    expect(b.valores).toEqual([4, 6, 6])
    expect(b.delta).toBe(2)
    expect(b.setas).toEqual([null, "alta", "igual"])
    const s = r.kpis.find((k) => k.id === "sla")!
    expect(s.valores).toEqual([null, 50, 40])
    expect(s.delta).toBeNull() // primeira sem dado
    expect(s.setas).toEqual([null, null, "queda"])
  })
  it("distribuições comparam os não finalizados, unem os rótulos e ordenam pelo total", () => {
    expect(r.distribuicoes[0].itens).toEqual([
      { rotulo: "Cli A", valores: [4, 4, 1] },
      { rotulo: "Cli B", valores: [0, 2, 5] },
    ])
    expect(r.atrasoFaixas).toEqual([{ rotulo: "1", valores: [4, 6, 6] }])
  })
})

describe("motivoSemDelta", () => {
  it("usa o detalhe do motor; senão diz que falta base no mês anterior", () => {
    expect(motivoSemDelta({ detalhe: "filtro sem a coluna nesta carga" })).toBe(
      "filtro sem a coluna nesta carga"
    )
    expect(motivoSemDelta({ detalhe: undefined })).toBe(
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
  it("sem informação é um valor filtrável e a Situação filtra pelo valor literal da coluna", () => {
    expect(filtrarSheet(s, { cliente: ["(sem informação)"] }, "2026-08").rows).toHaveLength(1)
    expect(filtrarSheet(s, { situacao: ["Finalizado"] }, "2026-08").rows).toHaveLength(1)
    expect(filtrarSheet(s, { situacao: ["Em Análise"] }, "2026-08").rows).toHaveLength(3)
    expect(
      filtrarSheet(s, { situacao: ["Finalizado", "Em Análise"] }, "2026-08").rows
    ).toHaveLength(4)
  })
  it("coluna ausente na planilha não casa com nenhuma linha", () => {
    const sem = sheetChamados([{ abertura: "2026-08-02" }])
    const semOperador = { ...sem, rows: sem.rows }
    expect(filtrarSheet(semOperador, { operador: ["X"] }, "2026-08").rows).toHaveLength(0)
  })
  it("opcoesDoFiltro lista valores distintos ordenados; situação lista os valores literais", () => {
    expect(opcoesDoFiltro(s, "cliente")).toEqual(["(sem informação)", "Ouro", "PMC"])
    expect(opcoesDoFiltro(s, "situacao")).toEqual(["Em Análise", "Finalizado"])
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
  it("filtroDaLeitura: cliente vira filtro; idade não filtra", () => {
    const l = (filtro: unknown) => ({ filtro }) as never
    expect(filtroDaLeitura(l({ campo: "cliente", valores: ["PMC"] }))).toEqual({
      campo: "cliente",
      valores: ["PMC"],
    })
    expect(filtroDaLeitura(l({ campo: "idade", valores: ["7+"] }))).toBeNull()
    expect(filtroDaLeitura(l(undefined))).toBeNull()
  })
})

const kpi = (id: string, rotulo: string, valor: number | null, anterior: number | null = null) => ({
  id, rotulo, valor, anterior, formato: "inteiro" as const,
  delta: valor !== null && anterior !== null ? valor - anterior : null,
  melhorQuando: "menor" as const, definicao: "",
})
const metricas = {
  kpis: [kpi("naoFinalizados", "Não finalizados", 100, 90), kpi("entradas", "Entradas no mês", 50), kpi("finalizados", "Finalizados no mês", 90), kpi("semSla", "Sem SLA", 30)],
  distribuicoes: [
    { id: "cliente", titulo: "Por cliente", itens: [{ rotulo: "PMC", finalizados: 5, naoFinalizados: 67 }, { rotulo: "Ouro", finalizados: 2, naoFinalizados: 33 }] },
  ],
  situacoes: [{ rotulo: "Em análise", valor: 70 }, { rotulo: "Aguardando aceite", valor: 30 }],
  atrasoFaixas: [{ rotulo: "1", valor: 10 }, { rotulo: "7+", valor: 38 }],
} as unknown as MetricasChamados
const leitura = (id: Leitura["id"], extra: Partial<Leitura> = {}): Leitura => ({
  id, severidade: "atencao", titulo: "t", texto: "x", evidencia: [], ...extra,
})

describe("leituras: regra, números, evidência e selos", () => {
  it("regraDaLeitura traz o limite que disparou", () => {
    expect(regraDaLeitura("concentracao")).toMatch(/40%/)
    expect(regraDaLeitura("envelhecimento")).toMatch(/7 meses/)
    for (const id of ["fluxo", "concentracao", "envelhecimento", "gargaloCliente", "semSla"] as const)
      expect(regraDaLeitura(id).toLowerCase()).not.toContain("backlog")
    expect(regraDaLeitura("semSla")).toMatch(/20%/)
  })
  it("numerosDaLeitura: específicos primeiro, depois os indicadores da evidência", () => {
    const n = numerosDaLeitura(
      leitura("concentracao", { evidencia: ["cliente", "naoFinalizados"], filtro: { campo: "cliente", valores: ["PMC"] } }),
      metricas
    )
    expect(n[0]).toEqual({ rotulo: "Não finalizados de PMC", valor: "67" })
    expect(n[1]).toEqual({ rotulo: "Participação nos não finalizados", valor: "67%" })
    expect(n.find((x) => x.rotulo === "Não finalizados")).toMatchObject({ valor: "100" })
    const e = numerosDaLeitura(leitura("envelhecimento", { evidencia: ["atrasoFaixas", "naoFinalizados"] }), metricas)
    expect(e[0]).toEqual({ rotulo: "Abertos há 7 meses ou mais", valor: "38" })
    expect(e[1]).toEqual({ rotulo: "Participação nos não finalizados", valor: "38%" })
  })
  it("evidenciaDaLeitura escolhe o gráfico e o item destacado", () => {
    expect(
      evidenciaDaLeitura(leitura("concentracao", { filtro: { campo: "cliente", valores: ["PMC"] } }), metricas)
    ).toMatchObject({
      titulo: "Não finalizados por cliente",
      itens: [{ rotulo: "PMC", valor: 67 }, { rotulo: "Ouro", valor: 33 }],
      destaque: ["PMC"],
    })
    expect(evidenciaDaLeitura(leitura("envelhecimento"), metricas)).toMatchObject({
      titulo: "Em atraso por meses desde a abertura",
      destaque: ["7+"],
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
      { rotulo: "Finalizados", valor: 90 },
    ])
  })
  it("temOutros", () => {
    expect(temOutros([{ rotulo: "A", valor: 1 }, { rotulo: "Outros", valor: 3 }])).toBe(true)
    expect(temOutros([{ rotulo: "A", valor: 1 }])).toBe(false)
  })
})

describe("filtros Autarquia e Tipo", () => {
  const novo = montarSheet(
    [...ROTULOS_PADRAO, "Autarquia", "Tipo"],
    [
      ["2026-08-02", "Em Análise", null, null, null, null, "Cli A", "Á1", "Suporte", 0, 1, "SPPrev", "Incidente"],
      ["2026-08-03", "Em Análise", null, null, null, null, "Cli A", "Á1", "Suporte", 0, 2, null, "Requisição"],
      ["2026-08-04", "Em Análise", null, null, null, null, "Cli A", "Á1", "Suporte", 0, 3, "SPPrev", null],
    ].map((l) => l.map((v, i) => (i === 0 && typeof v === "string" ? new Date(`${v}T00:00:00Z`) : v)))
  )
  it("ordem dos campos: Cliente, Autarquia, Área Superior, Área, Atividade, Tipo, Severidade, Operador, Situação", () => {
    expect(CAMPOS_FILTRO.map((c) => c.rotulo)).toEqual([
      "Cliente",
      "Autarquia",
      "Área Superior",
      "Área",
      "Atividade",
      "Tipo",
      "Severidade",
      "Operador",
      "Situação",
    ])
  })
  it("filtra por autarquia e por tipo; vazio é (sem informação)", () => {
    expect(filtrarSheet(novo, { autarquia: ["SPPrev"] }, "2026-08").rows).toHaveLength(2)
    expect(filtrarSheet(novo, { autarquia: ["(sem informação)"] }, "2026-08").rows).toHaveLength(1)
    expect(filtrarSheet(novo, { tipo: ["Incidente"], autarquia: ["SPPrev"] }, "2026-08").rows).toHaveLength(1)
    expect(opcoesDoFiltro(novo, "tipo")).toEqual(["(sem informação)", "Incidente", "Requisição"])
    expect(opcoesDoFiltro(novo, "autarquia")).toEqual(["(sem informação)", "SPPrev"])
  })
})

describe("filtro ativo em carga sem a coluna", () => {
  const antigo = sheetChamados([
    { abertura: "2026-08-02" },
    { abertura: "2026-08-03" },
  ])
  it("colunasAusentes lista os rótulos dos filtros ativos sem coluna na carga", () => {
    expect(colunasAusentes(antigo, { autarquia: ["X"], tipo: ["Y"], cliente: ["Cli A"] })).toEqual(["Autarquia", "Tipo"])
    expect(colunasAusentes(antigo, {})).toEqual([])
    expect(colunasAusentes(antigo, { cliente: ["Cli A"], situacao: ["Finalizado"] })).toEqual([])
  })
  it("o motor devolve KPIs sem valor (não zero) e um aviso curto", () => {
    const m = calcularMetricas({
      sheet: antigo,
      competencia: "2026-08",
      colunasSemFiltro: ["Autarquia"],
    })
    expect(m.kpis.every((k) => k.valor === null)).toBe(true)
    expect(m.avisos).toContain(
      "Sem a coluna Autarquia nesta carga: filtro não se aplica"
    )
  })
  it("Evolução: o ponto da carga sem a coluna fica null e o aviso é devolvido", () => {
    const comColuna = montarSheet(
      [...ROTULOS_PADRAO, "Autarquia"],
      [[new Date("2026-09-02T00:00:00Z"), "Em Análise", null, null, null, null, "Cli A", "Á1", "Suporte", 0, 1, "SPPrev"]]
    )
    const { pontos, avisosFiltro } = pontosDaEvolucao(
      [
        { meta: meta("2026-08"), sheet: antigo },
        { meta: meta("2026-09"), sheet: comColuna },
      ],
      2,
      { autarquia: ["SPPrev"] }
    )
    expect(pontos[0].valores.naoFinalizados).toBeNull()
    expect(pontos[1].valores.naoFinalizados).toBe(1)
    expect(avisosFiltro).toEqual([
      "Sem a coluna Autarquia nesta carga: filtro não se aplica",
    ])
  })
})

describe("seriesPorDimensao (não finalizados por valor da coluna)", () => {
  const COM_OP = [...ROTULOS_PADRAO, "Operador"]
  const sheetOp = (linhas: { abertura: string; solucao?: string; op: string | null; cliente?: string }[]) =>
    montarSheet(
      COM_OP,
      linhas.map((l, i) => [
        ...linha({ abertura: l.abertura, solucao: l.solucao, cliente: l.cliente }, i + 1),
        l.op,
      ])
    )
  const ent = (competencia: string, sheet: Sheet, extra = {}) => ({
    sheet,
    competencia,
    ...extra,
  })
  const sh = sheetOp([
    { abertura: "2026-08-02", op: "Ana" },
    { abertura: "2026-08-03", op: "Ana" },
    { abertura: "2026-08-04", op: "Bia", solucao: "2026-08-20" },
    { abertura: "2026-09-02", op: "Bia" },
    { abertura: "2026-09-05", op: "Bia" },
    { abertura: "2026-09-03", op: null },
    { abertura: "2026-09-04", op: "Cris" },
  ])

  it("conta os não finalizados (Situação ≠ Finalizado, abertos até o fim do Mes Ref.) por operador em cada competência", () => {
    const r = seriesPorDimensao(
      [ent("2026-08", sh), ent("2026-09", sh)],
      "operador",
      8
    )
    expect(r.temColuna).toBe(true)
    const val = (rot: string) =>
      r.pontos.map((p) => p.valores[r.series.find((s) => s.rotulo === rot)!.id])
    expect(val("Ana")).toEqual([2, 2])
    expect(val("Bia")).toEqual([0, 2])
    expect(val("(sem informação)")).toEqual([0, 1])
  })

  it("limita às N linhas com mais não finalizados na competência mais recente", () => {
    const r = seriesPorDimensao([ent("2026-09", sh)], "operador", 2)
    expect(r.series.map((s) => s.rotulo)).toEqual(["Ana", "Bia"])
    expect(r.total).toBe(4)
  })

  it("carga sem a coluna fica null (linha quebra), não zero", () => {
    const semOp = sheetChamados([{ abertura: "2026-08-02" }])
    const r = seriesPorDimensao(
      [ent("2026-08", semOp), ent("2026-09", sh)],
      "operador",
      8
    )
    const ana = r.series.find((s) => s.rotulo === "Ana")!.id
    expect(r.pontos.map((p) => p.valores[ana])).toEqual([null, 2])
  })

  it("nenhuma carga com a coluna: temColuna false", () => {
    const semOp = sheetChamados([{ abertura: "2026-08-02" }])
    const r = seriesPorDimensao([ent("2026-09", semOp)], "operador", 8)
    expect(r.temColuna).toBe(false)
    expect(r.series).toEqual([])
  })

  it("filtro sem coluna na carga: valores null", () => {
    const r = seriesPorDimensao(
      [ent("2026-08", sh, { colunasSemFiltro: ["Área"] }), ent("2026-09", sh)],
      "operador",
      8
    )
    const ana = r.series.find((s) => s.rotulo === "Ana")!.id
    expect(r.pontos.map((p) => p.valores[ana])).toEqual([null, 2])
  })
})
