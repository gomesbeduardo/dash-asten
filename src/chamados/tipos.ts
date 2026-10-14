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
  /** false: depende de colunas da data da exportação (Situação, Qtd Reabertura, SLA Renegociado). */
  reconstruivel: boolean
}
export type ItemDistribuicao = { rotulo: string; valor: number }
export type Distribuicao = {
  id: "cliente" | "areaSuperior" | "atividade" | "situacao"
  titulo: string
  itens: ItemDistribuicao[]
  reconstruivel: boolean
}
export type MetricasChamados = {
  competencia: Competencia
  kpis: KpiChamados[]
  distribuicoes: Distribuicao[]
  envelhecimento: ItemDistribuicao[]
  linhasConsideradas: number
  /** Abertos após o fim da competência (aberto-apos); mostrados à parte. */
  linhasPosteriores: number
  linhasSemAbertura: number
  porSituacaoNaCompetencia: ItemDistribuicao[]
  avisos: string[]
}
/** cargaPropria === false: a planilha é de outro mês; KPIs não reconstruíveis ficam null. Padrão true. */
export type EntradaCompetencia = {
  sheet: Sheet
  competencia: Competencia
  cargaPropria?: boolean
}
export type Comparacao = {
  a: MetricasChamados
  b: MetricasChamados
  kpis: {
    id: string
    rotulo: string
    formato: FormatoKpi
    a: number | null
    b: number | null
    delta: number | null
    melhorQuando: KpiChamados["melhorQuando"]
  }[]
  distribuicoes: {
    id: Distribuicao["id"]
    titulo: string
    itens: { rotulo: string; a: number; b: number }[]
  }[]
}
export type Evolucao = {
  competencias: Competencia[]
  series: {
    id: string
    rotulo: string
    formato: FormatoKpi
    valores: (number | null)[]
  }[]
}
