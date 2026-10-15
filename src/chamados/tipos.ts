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
/** Um valor da dimensão com as duas séries da D64: finalizados (no mês ou no período) × não finalizados. */
export type ItemFoto = {
  rotulo: string
  finalizados: number
  naoFinalizados: number
}
export type Distribuicao = {
  id: "cliente" | "area" | "areaSuperior" | "atividade" | "operador"
  titulo: string
  itens: ItemFoto[]
}
export type MetricasChamados = {
  competencia: Competencia
  kpis: KpiChamados[]
  distribuicoes: Distribuicao[]
  /** Cards por Situação: valor literal da coluna (vazio = "(sem informação)"), por frequência. */
  situacoes: ItemDistribuicao[]
  /** Chamados da foto (abertos até o fim do Mes Ref.). */
  totalChamados: number | null
  /** Não finalizados em atraso por ciclo, por meses entre a abertura e o Mes Ref.: "1", "2–3", "4–6", "7+". */
  atrasoFaixas: ItemDistribuicao[]
  /** Abertos depois do fim do Mes Ref. (nota; fora de todos os números do mês, sem excluir a linha). */
  abertosDepois: number | null
  linhasSemAbertura: number | null
  avisos: string[]
  /** Filtros ativos sem a coluna nesta carga: nada é calculado (nunca zero). */
  colunasSemFiltro?: string[]
}
/** A planilha é a foto da empresa no Mes Ref. (`competencia`). */
export type EntradaCompetencia = {
  sheet: Sheet
  competencia: Competencia
  /** Rótulos dos filtros ativos cuja coluna não existe nesta carga: KPIs ficam sem valor (nunca zero). */
  colunasSemFiltro?: string[]
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
  /** Valores = não finalizados de cada foto. */
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

/** KPI da foto corrigida (D65): `original` só existe quando a correção mudou o valor. */
export type KpiCorrigido = KpiChamados & { original?: number | null }
export type ItemDistribuicaoCorrigido = ItemDistribuicao & { original?: number }
export type ItemFotoCorrigido = ItemFoto & {
  original?: { finalizados: number; naoFinalizados: number }
}
export type DistribuicaoCorrigida = Omit<Distribuicao, "itens"> & {
  itens: ItemFotoCorrigido[]
}
export type MetricasCorrigidas = Omit<
  MetricasChamados,
  "kpis" | "situacoes" | "distribuicoes"
> & {
  kpis: KpiCorrigido[]
  situacoes: ItemDistribuicaoCorrigido[]
  distribuicoes: DistribuicaoCorrigida[]
  /** Mes Ref. das fotos posteriores que mudaram alguma linha. */
  corrigidoPor: Competencia[]
  corrigidos: number
}
/** Mês sem foto (D65): só entradas e finalizados; o resto é null/vazio com o motivo em `detalhe`. */
export type MetricasParciais = Omit<MetricasChamados, "distribuicoes"> & {
  semFoto: true
  motivo: string
  /** Só a série "finalizados no mês"; `naoFinalizados` é sempre null. */
  distribuicoes: (Omit<Distribuicao, "itens"> & {
    itens: { rotulo: string; finalizados: number; naoFinalizados: null }[]
  })[]
}
export type OpcaoComparacao = {
  competencia: Competencia
  temFoto: boolean
  versoes: number[]
}
