import { describe, expect, it } from "vitest"
import type { EntradaCompetencia } from "./tipos"
import {
  corrigirFoto,
  metricasCorrigidas,
  metricasDoMesSemFoto,
  opcoesDeComparacao,
} from "./fotos"
import { foto, mai, out, v1, v2 } from "./fotos-teste"
import { montarSheet } from "./test-util"

/** Aceite da fatia D (D65): correção entre fotos, mês sem foto e lista do "comparar com". */
const e = (
  linhas: typeof v1,
  mesRef: string,
  c: string
): EntradaCompetencia => ({
  sheet: foto(linhas, mesRef),
  competencia: c,
})
const abr1 = e(v1, "2026-04-01", "2026-04")
const abr2 = e(v2, "2026-04-01", "2026-04")
const maio = e(mai, "2026-05-01", "2026-05")
const outu = e(out, "2026-10-01", "2026-10")

const kpi = (
  m: { kpis: { id: string; valor: number | null; original?: number | null }[] },
  id: string
) => m.kpis.find((k) => k.id === id)!

describe("corrigirFoto", () => {
  it("maio: 5015 vira Finalizado pela foto de outubro; 5003 (solução em junho) e 5026 não", () => {
    const r = corrigirFoto(maio, [outu])
    expect(r.corrigidos).toBe(1)
    expect(r.entrada.sheet.rows).toHaveLength(maio.sheet.rows.length)
    const sit = r.entrada.sheet.columns.find((c) => c.label === "Situação")!.key
    const cod = r.entrada.sheet.columns.find((c) => c.label === "Código")!.key
    const s = (c: number) =>
      r.entrada.sheet.rows.find((x) => x[cod] === c)![sit]
    expect(s(5015)).toBe("Finalizado")
    expect(s(5003)).toBe("Em Análise")
  })
  it("não altera a planilha original", () => {
    const antes = JSON.stringify(maio.sheet.rows)
    corrigirFoto(maio, [outu])
    expect(JSON.stringify(maio.sheet.rows)).toBe(antes)
  })
  it("ignora fotos do mesmo mês ou anteriores", () => {
    expect(corrigirFoto(abr1, [abr2]).corrigidos).toBe(0)
    expect(corrigirFoto(outu, [maio]).corrigidos).toBe(0)
  })
  it("sem coluna Código: nenhuma correção e aviso", () => {
    const sheet = montarSheet(
      ["Mes Ref.", "Data Abertura", "Situação"],
      [
        [
          new Date("2026-05-01T00:00:00Z"),
          new Date("2026-05-02T00:00:00Z"),
          "Em Análise",
        ],
      ]
    )
    const r = corrigirFoto({ sheet, competencia: "2026-05" }, [outu])
    expect(r.corrigidos).toBe(0)
    expect(r.avisos.length).toBeGreaterThan(0)
    expect(r.avisos.join(" ")).not.toMatch(/\bfoto\b/i)
  })
})

describe("metricasCorrigidas", () => {
  it("maio corrigido por outubro, com a marca do original só no que mudou", () => {
    const m = metricasCorrigidas(maio, [outu])
    expect(m.corrigidoPor).toEqual(["2026-10"])
    expect(kpi(m, "finalizados")).toMatchObject({ valor: 2, original: 1 })
    expect(kpi(m, "naoFinalizados")).toMatchObject({ valor: 1, original: 2 })
    expect(kpi(m, "slaVencido")).toMatchObject({ valor: 1, original: 2 })
    expect(kpi(m, "entradas").valor).toBe(1)
    expect(kpi(m, "entradas")).not.toHaveProperty("original")
    expect(m.situacoes.find((s) => s.rotulo === "Em Atendimento")).toEqual({
      rotulo: "Em Atendimento",
      valor: 0,
      original: 1,
    })
    const fin = m.situacoes.find((s) => s.rotulo === "Finalizado")!
    expect(fin).toMatchObject({ valor: 6, original: 5 })
    const delta = m.distribuicoes
      .find((d) => d.id === "cliente")!
      .itens.find((i) => i.rotulo === "Cliente Ômega")!
    expect(delta.original).toEqual({ finalizados: 0, naoFinalizados: 2 })
    expect(delta).toMatchObject({ finalizados: 1, naoFinalizados: 1 })
  })
  it("sem correção, nada ganha original", () => {
    const m = metricasCorrigidas(outu, [])
    expect(m.corrigidoPor).toEqual([])
    expect(m.kpis.some((k) => "original" in k)).toBe(false)
  })
  it("abril v1 corrigido por mai+out (5000 e 5010 finalizados até 30/04); v2 passada como posterior é ignorada", () => {
    const m = metricasCorrigidas(abr1, [maio, outu, abr2])
    expect(kpi(m, "finalizados")).toMatchObject({ valor: 4, original: 2 })
    expect(m.corrigidoPor).toEqual(["2026-10"])
    expect(metricasCorrigidas(abr1, [abr2]).corrigidoPor).toEqual([])
  })
  it("usa o anterior para o delta", () => {
    const m = metricasCorrigidas(maio, [outu], abr2)
    expect(kpi(m, "finalizados")).toMatchObject({ anterior: 4, delta: -2 })
  })
})

describe("metricasDoMesSemFoto", () => {
  const ent = (c: string) => {
    const m = metricasDoMesSemFoto(c, outu)
    return [kpi(m, "entradas").valor, kpi(m, "finalizados").valor, m] as const
  }
  it("jun a set com o que as datas dão", () => {
    expect(ent("2026-06").slice(0, 2)).toEqual([0, 1])
    expect(ent("2026-07").slice(0, 2)).toEqual([0, 0])
    expect(ent("2026-08").slice(0, 2)).toEqual([1, 0])
    expect(ent("2026-09").slice(0, 2)).toEqual([0, 0])
  })
  it("o resto fica sem valor, com o motivo", () => {
    const m = ent("2026-06")[2]
    for (const k of m.kpis.filter(
      (k) => !["entradas", "finalizados"].includes(k.id)
    )) {
      expect(k.valor).toBeNull()
      expect(k.detalhe).toBe("sem posição de jun/26")
    }
    expect(m.situacoes).toEqual([])
    expect(m.atrasoFaixas).toEqual([])
    expect(m.totalChamados).toBeNull()
  })
  it("distribuição só traz finalizados no mês; não finalizados null", () => {
    const m = ent("2026-06")[2]
    const cli = m.distribuicoes.find((d) => d.id === "cliente")!
    expect(cli.itens).toEqual([
      { rotulo: "Cliente Ômega", finalizados: 1, naoFinalizados: null },
    ])
  })
})

describe("opcoesDeComparacao", () => {
  const fotos = [
    { competencia: "2026-04", versao: 1 },
    { competencia: "2026-04", versao: 2 },
    { competencia: "2026-05", versao: 1 },
    { competencia: "2026-10", versao: 1 },
  ]
  it("meses anteriores até a abertura mais antiga, marcando os com foto", () => {
    const o = opcoesDeComparacao(fotos, "2026-10", outu, 1)
    expect(o.meses.map((m) => m.competencia)).toEqual([
      "2026-09",
      "2026-08",
      "2026-07",
      "2026-06",
      "2026-05",
      "2026-04",
    ])
    const por = Object.fromEntries(o.meses.map((m) => [m.competencia, m]))
    expect(por["2026-06"]).toEqual({
      competencia: "2026-06",
      temFoto: false,
      versoes: [],
    })
    expect(por["2026-05"]).toEqual({
      competencia: "2026-05",
      temFoto: true,
      versoes: [1],
    })
    expect(por["2026-04"]).toEqual({
      competencia: "2026-04",
      temFoto: true,
      versoes: [1, 2],
    })
    expect(o.outrasVersoes).toEqual([])
  })
  it("outras versões do mesmo mês da atual", () => {
    const o = opcoesDeComparacao(
      [...fotos, { competencia: "2026-10", versao: 2 }],
      "2026-10",
      outu,
      2
    )
    expect(o.outrasVersoes).toEqual([1])
  })
  it("uma carga só: nenhum mês anterior, só as outras versões", () => {
    const o = opcoesDeComparacao(
      [
        { competencia: "2026-10", versao: 1 },
        { competencia: "2026-10", versao: 2 },
      ],
      "2026-10",
      outu,
      2
    )
    expect(o.meses).toEqual([])
    expect(o.outrasVersoes).toEqual([1])
  })
  it("sem foto atual: 24 meses", () => {
    const antigas = [{ competencia: "2020-01", versao: 1 }, ...fotos]
    expect(opcoesDeComparacao(antigas, "2026-10").meses).toHaveLength(24)
  })
})
