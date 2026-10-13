import { describe, expect, it } from "vitest"
import { buildAutoDashboard } from "./buildAutoDashboard"
import { d, makeSheet } from "./helpers.test-util"

describe("aba só texto", () => {
  const sheet = makeSheet(
    [{ label: "Nome", type: "text" }, { label: "Área", type: "text" }],
    [["a", "TI"], ["b", "TI"], ["c", "RH"], ["d", "TI"]],
  )
  it("gera Linhas e contagem por categoria ordenada desc", () => {
    const r = buildAutoDashboard(sheet, sheet.rows)
    expect(r.kpis).toEqual([{ id: "kpi-linhas", label: "Linhas", value: 4, format: "integer" }])
    expect(r.charts).toHaveLength(1)
    const c = r.charts[0]
    expect(c.id).toBe("chart-linhas-categoria")
    expect(c.kind).toBe("bar")
    expect(c.title).toBe("Linhas por Área")
    expect(c.data).toEqual([{ x: "TI", linhas: 3 }, { x: "RH", linhas: 1 }])
  })
  it("filtrado: hint 'de N'", () => {
    const r = buildAutoDashboard(sheet, sheet.rows.slice(0, 2))
    expect(r.kpis[0]).toMatchObject({ value: 2, hint: "de 4" })
  })
})

describe("aba indicadores", () => {
  const sheet = makeSheet(
    [
      { label: "Indicador", type: "text" },
      { label: "Área", type: "text" },
      { label: "Mês", type: "date" },
      { label: "Meta", type: "number" },
      { label: "Realizado", type: "number" },
    ],
    [
      ["x", "TI", d("2026-05-10"), 100, 80],
      ["y", "RH", d("2026-05-20"), 100, 120],
      ["x", "TI", d("2026-06-10"), 200, null],
      ["y", "RH", d("2026-07-10"), null, 50],
    ],
  )
  const r = buildAutoDashboard(sheet, sheet.rows)
  it("KPIs de atingimento", () => {
    const ids = r.kpis.map((k) => k.id)
    expect(ids.slice(0, 4)).toEqual(["kpi-linhas", "kpi-periodo", "kpi-atingimento", "kpi-na-meta"])
    expect(r.kpis.slice(4).map((k) => k.label)).toEqual(["Média de Meta", "Média de Realizado"])
    expect(r.kpis[5]).toMatchObject({ value: 250 / 3, hint: "total 250" })
    expect(r.kpis[1].display).toBe("mai/26 – jul/26")
    expect(r.kpis[2]).toMatchObject({ value: 100, format: "percent", tone: "good", hint: "Realizado ÷ Meta" })
    expect(r.kpis[3]).toMatchObject({ value: 50, hint: "1 de 2" })
  })
  it("gráfico principal line meta×realizado com null preservado", () => {
    const c = r.charts[0]
    expect(c.id).toBe("chart-meta-realizado")
    expect(c.kind).toBe("line")
    expect(c.series.map((s) => s.role)).toEqual(["meta", "realizado"])
    expect(c.data).toEqual([
      { x: "mai/26", meta: 100, realizado: 100 },
      { x: "jun/26", meta: 200, realizado: null },
      { x: "jul/26", meta: null, realizado: 50 },
    ])
  })
})

describe("aba projetos", () => {
  const sheet = makeSheet(
    [
      { label: "ID", type: "number" },
      { label: "Status", type: "text" },
      { label: "Área", type: "text" },
      { label: "Prazo", type: "date" },
      { label: "% Concluído", type: "number" },
    ],
    [
      [1, "Concluído", "TI", d("2026-05-10"), 100],
      [2, "Atrasado", "TI", d("2026-05-20"), 40],
      [3, "Atrasado", "RH", d("2026-06-10"), 20],
      [4, "Em andamento", "RH", d("2026-06-11"), 60],
    ],
  )
  const r = buildAutoDashboard(sheet, sheet.rows)
  it("KPIs de status e percentual, ignorando ID", () => {
    const byId = Object.fromEntries(r.kpis.map((k) => [k.id, k]))
    expect(byId["kpi-status-concluido"]).toMatchObject({ label: "% Concluído", value: 25, hint: "1 de 4" })
    expect(byId["kpi-atrasados"]).toMatchObject({ value: 2, format: "integer", tone: "bad" })
    expect(byId["kpi-media-percentual"]).toMatchObject({ label: "Média de % Concluído", value: 55, format: "percent" })
    expect(r.kpis.some((k) => k.label.includes("ID"))).toBe(false)
  })
  it("stackedBar status×área é o principal; depois mês e média de % por área", () => {
    expect(r.charts[0].kind).toBe("stackedBar")
    expect(r.charts[0].series.map((s) => s.label)).toEqual(["Atrasado", "Concluído", "Em andamento"])
    expect(r.charts[0].data).toEqual([
      { x: "RH", atrasado: 1, concluido: 0, "em-andamento": 1 },
      { x: "TI", atrasado: 1, concluido: 1, "em-andamento": 0 },
    ])
    const pct = r.charts.find((c) => c.id === "chart-percentual-categoria")!
    expect(pct.data).toEqual([{ x: "RH", media: 40 }, { x: "TI", media: 70 }])
    expect(pct.valueFormat).toBe("percent")
  })
})

describe("bordas", () => {
  it("fração 0–1 vira percentual", () => {
    const s = makeSheet([{ label: "Tarefa", type: "text" }, { label: "Progresso", type: "number" }], [["a", 0.5], ["b", 1]])
    const k = buildAutoDashboard(s, s.rows).kpis.find((x) => x.id === "kpi-media-percentual")!
    expect(k.value).toBeCloseTo(75)
  })
  it("mais de 12 categorias agrupa Outros e fica horizontal", () => {
    const rows = Array.from({ length: 15 }, (_, i) => [`n${i}`, `Cat${String(i).padStart(2, "0")}`])
    const s = makeSheet([{ label: "Nome", type: "text" }, { label: "Cat", type: "text" }], rows)
    const c = buildAutoDashboard(s, s.rows).charts[0]
    expect(c.data).toHaveLength(13)
    expect(c.data[12]).toEqual({ x: "Outros", linhas: 3 })
    expect(c.horizontal).toBe(true)
  })
  it("sem regra aplicável: charts vazio", () => {
    const s = makeSheet([{ label: "Nome", type: "text" }], [["a"], ["a"]])
    expect(buildAutoDashboard(s, s.rows).charts).toEqual([])
  })
})

describe("ciclo 2: identificadores, filtro e par sem data", () => {
  it("numérica 1..n crescente é ignorada mesmo com rótulo comum", () => {
    const s = makeSheet([{ label: "Item", type: "number" }, { label: "Valor", type: "number" }], [[1, 10], [2, 30], [3, 20]])
    const labels = buildAutoDashboard(s, s.rows).kpis.map((k) => k.label)
    expect(labels).toEqual(["Linhas", "Média de Valor"])
  })
  it("rótulo 'Nº' é ignorado", () => {
    const s = makeSheet([{ label: "Nº", type: "number" }, { label: "Valor", type: "number" }], [[7, 10], [3, 30]])
    expect(buildAutoDashboard(s, s.rows).kpis.map((k) => k.label)).toEqual(["Linhas", "Média de Valor"])
  })
  const specs = [
    { label: "Área", type: "text" as const }, { label: "Previsto", type: "number" as const }, { label: "Executado", type: "number" as const },
  ]
  const s = makeSheet(specs, [["TI", 10, 5], ["TI", 10, 15], ["RH", 20, 10], ["RH", 20, 30]])
  it("filtro recalcula Atingimento e hint 'de N'", () => {
    const r = buildAutoDashboard(s, s.rows.slice(0, 2))
    expect(r.kpis[0]).toMatchObject({ value: 2, hint: "de 4" })
    expect(r.kpis.find((k) => k.id === "kpi-atingimento")).toMatchObject({ value: 100, tone: "good" })
    expect(r.kpis.find((k) => k.id === "kpi-na-meta")).toMatchObject({ value: 50, hint: "1 de 2" })
  })
  it("par sem data vira barras por categoria com médias", () => {
    const c = buildAutoDashboard(s, s.rows).charts[0]
    expect(c.kind).toBe("bar")
    expect(c.data).toEqual([{ x: "RH", meta: 20, realizado: 20 }, { x: "TI", meta: 10, realizado: 10 }])
  })
  it("Atingimento abaixo de 100 tem tone bad", () => {
    const r = buildAutoDashboard(s, s.rows.slice(0, 1))
    expect(r.kpis.find((k) => k.id === "kpi-atingimento")).toMatchObject({ value: 50, tone: "bad" })
  })
})
