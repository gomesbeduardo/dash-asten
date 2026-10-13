import type { Row, Sheet } from "../types"

export type ValueFormat = "integer" | "decimal" | "percent"
export type KpiTone = "neutral" | "good" | "bad"
export type AutoKpi = {
  id: string
  label: string          // ex.: "Linhas", "Período", "Média de Realizado", "Atingimento (Realizado ÷ Meta)"
  value: number | null    // null → mostrar "—"
  format: ValueFormat
  display?: string        // quando o valor não é numérico (ex.: período "mai/26 – out/26"); se presente, a UI mostra isto
  hint?: string           // contexto curto, ex.: "de 72 linhas", "soma 5.432"
  tone?: KpiTone
}
export type ChartSeries = { key: string; label: string; role: "meta" | "realizado" | "default" }
export type ChartPoint = { x: string } & Record<string, string | number | null>
export type AutoChart = {
  id: string
  kind: "bar" | "line" | "stackedBar"
  title: string          // frase informativa, ex.: "Linhas por Área"
  subtitle: string       // unidade e período, ex.: "contagem · mai/26 a out/26"
  xLabel: string
  series: ChartSeries[]
  data: ChartPoint[]
  valueFormat: ValueFormat
  horizontal?: boolean   // barras horizontais quando há muitas categorias ou rótulos longos
}
export type AutoDashboard = { kpis: AutoKpi[]; charts: AutoChart[] } // charts[0] = gráfico principal
export type BuildAutoDashboard = (sheet: Sheet, rows: Row[]) => AutoDashboard
