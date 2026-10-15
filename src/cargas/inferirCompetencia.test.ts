import { describe, expect, it } from "vitest"
import type { Sheet, Workbook } from "@/core"
import { inferirCompetencia } from "./inferirCompetencia"

const hoje = new Date(Date.UTC(2026, 9, 14))
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

function wb(abas: string[], datas: (Date | null)[] = []): Workbook {
  const sheets: Sheet[] = abas.map((name, index) => ({
    id: `aba-${index}`, name, index,
    columns: datas.length
      ? [{ key: "d", label: "D", type: "date", filterable: true, distinctCount: datas.length }]
      : [],
    rows: datas.map((d) => ({ d })),
  }))
  return { fileName: "x.xlsx", importedAt: new Date(), sheets }
}

describe("inferirCompetencia", () => {
  it("mês na aba, ano mais recente <= hoje", () => {
    expect(inferirCompetencia(wb(["Orçamentário Setembro"]), "dados.xlsx", hoje)).toEqual({ competencia: "2026-09", origem: "aba", anoPresumido: true })
  })
  it("mês depois de hoje cai no ano anterior", () => {
    expect(inferirCompetencia(wb(["Dezembro"]), "a.xlsx", hoje)).toEqual({ competencia: "2025-12", origem: "aba", anoPresumido: true })
  })
  it("usa o ano de 4 dígitos quando presente", () => {
    expect(inferirCompetencia(wb(["Março 2024"]), "a.xlsx", hoje).competencia).toBe("2024-03")
  })
  it("aceita abreviação, marco sem acento e ignora palavras parecidas", () => {
    expect(inferirCompetencia(wb(["Relatorio MARCO"]), "a.xlsx", hoje).competencia).toBe("2026-03")
    expect(inferirCompetencia(wb(["Chamados jan"]), "a.xlsx", hoje).competencia).toBe("2026-01")
    expect(inferirCompetencia(wb(["Setor financeiro"]), "a.xlsx", hoje).origem).toBe("mes-anterior")
  })
  it("sem mês na aba, procura no nome do arquivo", () => {
    expect(inferirCompetencia(wb(["Dados"]), "Chamados_Agosto_2025.xlsx", hoje)).toEqual({ competencia: "2025-08", origem: "arquivo", anoPresumido: false })
  })
  it("aba tem prioridade sobre o arquivo", () => {
    expect(inferirCompetencia(wb(["Julho"]), "agosto.xlsx", hoje).competencia).toBe("2026-07")
  })
  it("sem mês, usa a data máxima se for do mês atual ou anterior", () => {
    expect(inferirCompetencia(wb(["Dados"], [utc(2026, 9, 3), utc(2026, 9, 28), utc(1899, 12, 30)]), "a.xlsx", hoje))
      .toEqual({ competencia: "2026-09", origem: "datas", anoPresumido: false })
    expect(inferirCompetencia(wb(["Dados"], [utc(2026, 10, 2)]), "a.xlsx", hoje).competencia).toBe("2026-10")
  })
  it("data máxima antiga ou ausente: mês anterior a hoje", () => {
    expect(inferirCompetencia(wb(["Dados"], [utc(1900, 1, 1)]), "a.xlsx", hoje).origem).toBe("mes-anterior")
    expect(inferirCompetencia(wb(["Dados"]), "a.xlsx", hoje).origem).toBe("mes-anterior")
  })
  describe("mês em número junto do ano", () => {
    const casos: [string, string][] = [
      ["chamados-2026-07-ficticio.xlsx", "2026-07"],
      ["dados_2026_08.xlsx", "2026-08"],
      ["dados.2026.09.xlsx", "2026-09"],
      ["chamados202607.xlsx", "2026-07"],
      ["chamados-07-2026.xlsx", "2026-07"],
      ["chamados_08_2026.xlsx", "2026-08"],
      ["chamados.09.2026.xlsx", "2026-09"],
      ["chamados 07/2026.xlsx", "2026-07"],
      ["chamados-7-2026.xlsx", "2026-07"],
      ["export-2026-07-15.xlsx", "2026-07"],
      ["chamados-2026-09-v2-correcao.xlsx", "2026-09"],
    ]
    for (const [nome, esperado] of casos) {
      it(`arquivo ${nome}`, () => {
        expect(inferirCompetencia(wb(["Dados"]), nome, hoje)).toEqual({ competencia: esperado, origem: "arquivo", anoPresumido: false })
      })
    }
    it("aba com número", () => {
      expect(inferirCompetencia(wb(["2026-07"]), "x.xlsx", hoje)).toEqual({ competencia: "2026-07", origem: "aba", anoPresumido: false })
    })
    it("não confunde outros números", () => {
      for (const nome of ["relatorio-123456.xlsx", "v2.xlsx", "codigo-1307.xlsx"]) {
        expect(inferirCompetencia(wb(["Dados"]), nome, hoje).origem).toBe("mes-anterior")
      }
    })
  })

  describe("títulos e cabeçalhos dentro da planilha", () => {
    const planilha = (columns: Sheet["columns"], rows: Sheet["rows"] = []): Workbook => ({
      fileName: "x.xlsx", importedAt: new Date(),
      sheets: [{ id: "a", name: "Dados", index: 0, columns, rows }],
    })
    const col = (key: string, label: string, type: Sheet["columns"][number]["type"] = "text") =>
      ({ key, label, type, filterable: false, distinctCount: 1 })
    it("rótulo de coluna com mês e ano", () => {
      const w = planilha([col("a", "Chamados Setembro/2026")])
      expect(inferirCompetencia(w, "x.xlsx", hoje)).toEqual({ competencia: "2026-09", origem: "titulo", anoPresumido: false })
    })
    it("colunas de meses soltos (Jan, Fev...) não definem competência", () => {
      const w = planilha([col("a", "Jan"), col("b", "Fev"), col("c", "Mar")])
      expect(inferirCompetencia(w, "x.xlsx", hoje).origem).toBe("mes-anterior")
    })
    it("célula 'Competência: mês' nas primeiras linhas", () => {
      const w = planilha([col("a", "A"), col("b", "B")], [{ a: "Competência: Agosto/2026", b: null }])
      expect(inferirCompetencia(w, "x.xlsx", hoje)).toEqual({ competencia: "2026-08", origem: "titulo", anoPresumido: false })
    })
    it("'Período' com o mês na célula ao lado", () => {
      const w = planilha([col("a", "A"), col("b", "B")], [{ a: "Período", b: "07/2026" }])
      expect(inferirCompetencia(w, "x.xlsx", hoje).competencia).toBe("2026-07")
    })
    it("'Competência' com data de verdade ao lado", () => {
      const w = planilha([col("a", "A"), col("b", "B", "date")], [{ a: "Referência", b: utc(2026, 6, 1) }])
      expect(inferirCompetencia(w, "x.xlsx", hoje).competencia).toBe("2026-06")
    })
    it("sem a palavra-chave, texto de célula não vira competência", () => {
      const w = planilha([col("a", "A")], [{ a: "Aberto em setembro" }])
      expect(inferirCompetencia(w, "x.xlsx", hoje).origem).toBe("mes-anterior")
    })
    it("aba e arquivo vencem o título; o título vence as datas", () => {
      const w = planilha([col("a", "Julho/2026"), col("d", "Data", "date")], [{ a: null, d: utc(2026, 9, 3) }])
      expect(inferirCompetencia(w, "x.xlsx", hoje)).toEqual({ competencia: "2026-07", origem: "titulo", anoPresumido: false })
      expect(inferirCompetencia(w, "agosto-2026.xlsx", hoje)).toEqual({ competencia: "2026-08", origem: "arquivo", anoPresumido: false })
    })
  })

  describe("datas das linhas", () => {
    const dias = (y: number, m: number, n: number) => Array.from({ length: n }, (_, i) => utc(y, m, 1 + (i % 28)))
    const col = (key: string, label: string, type: Sheet["columns"][number]["type"]) =>
      ({ key, label, type, filterable: false, distinctCount: 1 })
    const planilha = (columns: Sheet["columns"], rows: Sheet["rows"]): Workbook => ({
      fileName: "x.xlsx", importedAt: new Date(),
      sheets: [{ id: "a", name: "Dados", index: 0, columns, rows }],
    })
    const sugerir = (w: Workbook) => inferirCompetencia(w, "planilha.xlsx", hoje)

    it("exportação no dia 2 do mês seguinte (3 chamados novos) ainda sugere o mês certo", () => {
      const datas = [...dias(2026, 9, 120), ...dias(2026, 10, 3)]
      const w = planilha([col("d", "Abertura", "date")], datas.map((d) => ({ d })))
      expect(sugerir(w)).toEqual({ competencia: "2026-09", origem: "datas", anoPresumido: false })
    })
    it("planilha antiga: julho enviado em outubro", () => {
      const w = planilha([col("d", "Abertura", "date")], dias(2026, 7, 80).map((d) => ({ d })))
      expect(sugerir(w)).toEqual({ competencia: "2026-07", origem: "datas", anoPresumido: false })
    })
    it("datas futuras (SLA previsto) são ignoradas e escolhe a coluna de evento", () => {
      const aberturas = dias(2026, 9, 60)
      const rows = aberturas.map((d) => ({ a: d, sla: utc(2026, 11, 20), f: null as Date | null }))
      rows.slice(0, 10).forEach((r, i) => { r.f = aberturas[i] })
      const w = planilha([col("sla", "SLA previsto", "date"), col("a", "Data de abertura", "date"), col("f", "Fechamento", "date")], rows)
      expect(sugerir(w)).toEqual({ competencia: "2026-09", origem: "datas", anoPresumido: false })
    })
    it("poucas entradas no mês (12) mas muitas soluções (72): conta os dois eventos e sugere o mês", () => {
      const rows: Sheet["rows"] = []
      const abertura = [...dias(2026, 7, 60), ...dias(2026, 8, 60), ...dias(2026, 9, 12)]
      const solucao = [...dias(2026, 8, 60), ...dias(2026, 9, 72)]
      const n = Math.max(abertura.length, solucao.length)
      for (let i = 0; i < n; i++) rows.push({ a: abertura[i] ?? null, s: solucao[i] ?? null })
      const w = planilha([col("a", "Data de abertura", "date"), col("s", "Data de solução", "date")], rows)
      expect(sugerir(w)).toEqual({ competencia: "2026-09", origem: "datas", anoPresumido: false })
    })
    it("coluna de SLA/prazo não conta como evento, mesmo com datas passadas", () => {
      const rows = dias(2026, 8, 60).map((d) => ({ a: d, sla: utc(2026, 9, 10) }))
      const w = planilha([col("a", "Abertura", "date"), col("sla", "Prazo SLA", "date")], rows)
      expect(sugerir(w).competencia).toBe("2026-08")
    })
    it("só datas futuras ou anteriores a 2000: mês anterior", () => {
      const w = planilha([col("d", "Abertura", "date")], [{ d: utc(2026, 12, 1) }, { d: utc(1999, 5, 1) }])
      expect(sugerir(w).origem).toBe("mes-anterior")
    })
    it("datas como texto dd/mm/aaaa", () => {
      const rows = Array.from({ length: 40 }, (_, i) => ({ d: `${String(1 + (i % 28)).padStart(2, "0")}/08/2026` }))
      const w = planilha([col("d", "Data de abertura", "text")], rows)
      expect(sugerir(w)).toEqual({ competencia: "2026-08", origem: "datas", anoPresumido: false })
    })
    it("datas ISO e '30-set-2026' como texto", () => {
      const iso = planilha([col("d", "Criado", "text")], Array.from({ length: 10 }, (_, i) => ({ d: `2026-06-${String(1 + i).padStart(2, "0")}T08:00:00` })))
      expect(sugerir(iso).competencia).toBe("2026-06")
      const ext = planilha([col("d", "Criado", "text")], Array.from({ length: 10 }, (_, i) => ({ d: `${1 + i}-set-2026` })))
      expect(sugerir(ext).competencia).toBe("2026-09")
    })
    it("texto mm/dd quando o 2º número passa de 12", () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({ d: `05/${13 + i}/2026` }))
      const w = planilha([col("d", "Date", "text")], rows)
      expect(sugerir(w).competencia).toBe("2026-05")
    })
    it("coluna de texto comum não vira data", () => {
      const w = planilha([col("d", "Status", "text")], Array.from({ length: 10 }, () => ({ d: "Aberto" })))
      expect(sugerir(w).origem).toBe("mes-anterior")
    })
    it("número serial do Excel em coluna cujo rótulo é data", () => {
      const serial = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86400000 + 25569
      const rows = Array.from({ length: 20 }, (_, i) => ({ d: serial(2026, 6, 1 + i) }))
      const w = planilha([col("d", "Dt abertura", "number")], rows)
      expect(sugerir(w)).toEqual({ competencia: "2026-06", origem: "datas", anoPresumido: false })
    })
    it("número serial em coluna sem rótulo de data é ignorado", () => {
      const rows = Array.from({ length: 20 }, () => ({ d: 46000 }))
      const w = planilha([col("d", "Valor", "number")], rows)
      expect(sugerir(w).origem).toBe("mes-anterior")
    })
  })

  describe("ano presumido (mês sem ano no texto)", () => {
    const col = (key: string, label: string, type: Sheet["columns"][number]["type"]) =>
      ({ key, label, type, filterable: false, distinctCount: 1 })
    const planilha = (aba: string, columns: Sheet["columns"], rows: Sheet["rows"]): Workbook => ({
      fileName: "x.xlsx", importedAt: new Date(),
      sheets: [{ id: "a", name: aba, index: 0, columns, rows }],
    })
    const dias = (y: number, m: number, n: number) => Array.from({ length: n }, (_, i) => utc(y, m, 1 + (i % 28)))

    it("ano explícito no texto: não é presumido", () => {
      expect(inferirCompetencia(wb(["Março 2024"]), "a.xlsx", hoje).anoPresumido).toBe(false)
      expect(inferirCompetencia(wb(["Dados"]), "chamados_08_2026.xlsx", hoje).anoPresumido).toBe(false)
    })
    it("mês das datas das linhas não é presumido", () => {
      const w = planilha("Dados", [col("d", "Abertura", "date")], dias(2026, 9, 20).map((d) => ({ d })))
      expect(inferirCompetencia(w, "x.xlsx", hoje).anoPresumido).toBe(false)
    })
    it("(a) coluna de competência dá o ano; o mês continua o da aba", () => {
      const w = planilha("chamados ciclo Setembro - RH", [col("r", "Mês Ref.", "date")], [{ r: utc(2025, 10, 1) }, { r: utc(2025, 10, 1) }])
      expect(inferirCompetencia(w, "x.xlsx", hoje)).toEqual({ competencia: "2025-09", origem: "aba", anoPresumido: false })
    })
    it("(a) coluna de competência em texto com ano", () => {
      const w = planilha("Setembro", [col("r", "Competência", "text")], [{ r: "09/2025" }])
      expect(inferirCompetencia(w, "x.xlsx", hoje).competencia).toBe("2025-09")
    })
    it("(b) arquivo de 2025 enviado em 2026: o ano vem das datas das linhas", () => {
      const w = planilha("Dados", [col("d", "Abertura", "date")], dias(2025, 9, 30).map((d) => ({ d })))
      expect(inferirCompetencia(w, "setembro.xlsx", hoje)).toEqual({ competencia: "2025-09", origem: "arquivo", anoPresumido: false })
    })
    it("(b) datas futuras (SLA) não puxam o ano", () => {
      const rows = dias(2025, 9, 30).map((d) => ({ d, s: utc(2026, 9, 20) }))
      const w = planilha("Setembro", [col("d", "Abertura", "date"), col("s", "SLA previsto", "date")], rows)
      expect(inferirCompetencia(w, "x.xlsx", hoje).competencia).toBe("2025-09")
    })
    it("(c) sem ano em lugar nenhum: regra do relógio e presumido", () => {
      expect(inferirCompetencia(wb(["Setembro"]), "x.xlsx", hoje)).toEqual({ competencia: "2026-09", origem: "aba", anoPresumido: true })
      expect(inferirCompetencia(wb(["Dados"]), "setembro.xlsx", hoje)).toEqual({ competencia: "2026-09", origem: "arquivo", anoPresumido: true })
    })
    it("mês anterior (fallback total) não é tratado como presumido", () => {
      expect(inferirCompetencia(wb(["Dados"]), "a.xlsx", hoje).anoPresumido).toBe(false)
    })
  })
})
