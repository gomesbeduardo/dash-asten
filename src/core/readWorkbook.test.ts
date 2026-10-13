import { describe, expect, it } from "vitest"
import { makeXlsx } from "../test/makeWorkbook"
import { WorkbookError } from "./errors"
import { readWorkbook } from "./readWorkbook"

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

describe("readWorkbook", () => {
  it("lê várias abas, com id, nome, índice e nome do arquivo", () => {
    const wb = readWorkbook(
      makeXlsx({ "Vendas 2025": [["a"], [1]], "Pessoas": [["b"], ["x"]] }),
      "reuniao.xlsx",
    )
    expect(wb.fileName).toBe("reuniao.xlsx")
    expect(wb.importedAt).toBeInstanceOf(Date)
    expect(wb.sheets.map((s) => [s.id, s.name, s.index])).toEqual([
      ["vendas-2025", "Vendas 2025", 0],
      ["pessoas", "Pessoas", 1],
    ])
  })

  it("omite abas sem linhas de dados e mantém o índice original", () => {
    const wb = readWorkbook(makeXlsx({ Vazia: [], SoCabecalho: [["a", "b"]], Dados: [["a"], [1]] }), "x.xlsx")
    expect(wb.sheets.map((s) => s.name)).toEqual(["Dados"])
    expect(wb.sheets[0].index).toBe(2)
  })

  it("usa a primeira linha não vazia como cabeçalho e descarta linhas vazias", () => {
    const wb = readWorkbook(
      makeXlsx({ A: [[], [null, null], ["Nome", "Qtd"], ["ana", 3], [], ["bia", 4]] }),
      "x.xlsx",
    )
    const s = wb.sheets[0]
    expect(s.columns.map((c) => c.label)).toEqual(["Nome", "Qtd"])
    expect(s.rows).toHaveLength(2)
    expect(s.rows[1]).toEqual({ nome: "bia", qtd: 4 })
  })

  it("nomeia rótulos vazios e duplicados, com keys únicas", () => {
    const wb = readWorkbook(makeXlsx({ A: [["Nome", null, "Nome", "Nome"], ["a", "b", "c", "d"]] }), "x.xlsx")
    const cols = wb.sheets[0].columns
    expect(cols.map((c) => c.label)).toEqual(["Nome", "Coluna 2", "Nome (2)", "Nome (3)"])
    expect(new Set(cols.map((c) => c.key)).size).toBe(4)
  })

  it("keys são estáveis entre leituras", () => {
    const buf = makeXlsx({ A: [["Nome", "Nome"], ["a", "b"]] })
    const k = (b: typeof buf) => readWorkbook(b, "x").sheets[0].columns.map((c) => c.key)
    expect(k(buf)).toEqual(k(buf))
  })

  it("abas com nomes que geram o mesmo slug ganham ids únicos", () => {
    const wb = readWorkbook(makeXlsx({ "Ação 1": [["a"], [1]], "Acao-1": [["a"], [2]] }), "x.xlsx")
    expect(new Set(wb.sheets.map((s) => s.id)).size).toBe(2)
  })

  it("apara strings e transforma vazio em null", () => {
    const wb = readWorkbook(makeXlsx({ A: [["t", "k"], ["  oi  ", 1], ["   ", 2], ["x", 3]] }), "x.xlsx")
    expect(wb.sheets[0].rows.map((r) => r.t)).toEqual(["oi", null, "x"])
  })

  it("linhas totalmente vazias (só espaços) são descartadas", () => {
    const wb = readWorkbook(makeXlsx({ A: [["t"], ["  "], ["x"]] }), "x.xlsx")
    expect(wb.sheets[0].rows).toHaveLength(1)
  })

  it("infere tipos, distintos e filterable", () => {
    const wb = readWorkbook(
      makeXlsx({
        A: [
          ["status", "valor", "data", "misto", "vazia", "id"],
          ["Ok", 1, utc(2025, 1, 5), 1, null, "a"],
          ["Ok", 2.5, utc(2025, 2, 6), "x", null, "b"],
          ["Atrasado", null, null, null, null, "c"],
        ],
      }),
      "x.xlsx",
    )
    const by = Object.fromEntries(wb.sheets[0].columns.map((c) => [c.key, c]))
    expect(by.status).toMatchObject({ type: "text", distinctCount: 2, filterable: true })
    expect(by.valor).toMatchObject({ type: "number", distinctCount: 2, filterable: false })
    expect(by.data).toMatchObject({ type: "date", distinctCount: 2, filterable: true })
    expect(by.misto).toMatchObject({ type: "text", distinctCount: 2, filterable: true })
    expect(by.vazia).toMatchObject({ type: "empty", distinctCount: 0, filterable: false })
    expect(by.id).toMatchObject({ type: "text", distinctCount: 3, filterable: true })
  })

  it("coluna mista converte números para string e mantém null", () => {
    const wb = readWorkbook(makeXlsx({ A: [["m", "k"], [1, 1], ["x", 2], [null, 3], [2, 4]] }), "x.xlsx")
    expect(wb.sheets[0].rows.map((r) => r.m)).toEqual(["1", "x", null, "2"])
  })

  it("texto com mais de 30 distintos não é filtrável", () => {
    const rows: unknown[][] = [["t"]]
    for (let i = 0; i < 31; i++) rows.push([`v${i}`])
    expect(readWorkbook(makeXlsx({ A: rows }), "x").sheets[0].columns[0].filterable).toBe(false)
  })

  it("datas viram Date no dia certo (UTC)", () => {
    const wb = readWorkbook(makeXlsx({ A: [["d"], [utc(2025, 3, 5)], [utc(2024, 12, 31)]] }), "x.xlsx")
    const ds = wb.sheets[0].rows.map((r) => (r.d as Date).toISOString().slice(0, 10))
    expect(ds).toEqual(["2025-03-05", "2024-12-31"])
  })

  it("não é xlsx", () => {
    const run = () => readWorkbook(new TextEncoder().encode("oi").buffer as ArrayBuffer, "x.txt")
    expect(run).toThrow(WorkbookError)
    expect(run).toThrow(expect.objectContaining({ code: "not-xlsx" }))
  })

  it("nenhuma aba com dados", () => {
    const run = () => readWorkbook(makeXlsx({ A: [], B: [["so", "cabecalho"]] }), "x.xlsx")
    expect(run).toThrow(expect.objectContaining({ code: "empty" }))
  })
})
