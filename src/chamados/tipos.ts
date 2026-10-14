import type { Competencia } from "@/cargas/types"
import type { Sheet } from "@/core"

export type FormatoKpi = "inteiro" | "percentual" | "dias"
export type KpiChamados = {
  id: string
  rotulo: string
  valor: number | null
  formato: FormatoKpi
  anterior: number | null
  delta: number | null
  melhorQuando: "maior" | "menor" | "neutro"
  definicao: string
  detalhe?: string
}
export type ItemDistribuicao = { rotulo: string; valor: number }
export type Distribuicao = { id: "cliente" | "areaSuperior" | "atividade" | "situacao"; titulo: string; itens: ItemDistribuicao[] }
export type MetricasChamados = {
  competencia: Competencia
  kpis: KpiChamados[]
  distribuicoes: Distribuicao[]
  envelhecimento: ItemDistribuicao[]
  linhasConsideradas: number
  linhasIgnoradas: number
  avisos: string[]
}
export type EntradaCompetencia = { sheet: Sheet; competencia: Competencia }
export type Comparacao = {
  a: MetricasChamados
  b: MetricasChamados
  kpis: { id: string; rotulo: string; formato: FormatoKpi; a: number | null; b: number | null; delta: number | null; melhorQuando: KpiChamados["melhorQuando"] }[]
  distribuicoes: { id: Distribuicao["id"]; titulo: string; itens: { rotulo: string; a: number; b: number }[] }[]
}
export type Evolucao = {
  competencias: Competencia[]
  series: { id: string; rotulo: string; formato: FormatoKpi; valores: (number | null)[] }[]
}
