// Contrato entre as fatias do protótipo. Não mudar assinaturas sem combinar.
import type { ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { Chip } from "@/lib/indicators"
import type { IndicatorRow, ProjectRow } from "@/data/mock"
import type { IndicatorFilters } from "@/lib/indicators"
import type { ProjectFilters } from "@/lib/projects"

/** Multiseleção com busca (popover + command). Lista vazia = sem filtro. */
export type MultiSelectFilterProps = {
  label: string
  options: readonly string[]
  value: string[]
  onChange: (value: string[]) => void
}

/** Faixa de filtros da aba: controles (children) + chips removíveis + "Limpar filtros". */
export type FilterBarProps = {
  children: ReactNode
  chips: Chip[]
  onRemoveChip: (id: string) => void
  onClear: () => void
}

/** Cartão de gráfico com título, unidade/período, estado vazio e alternância "Ver dados". */
export type ChartCardProps = {
  title: string
  /** Unidade e período, sempre visíveis. Ex.: "Índice médio (pts) · mai/26 a out/26" */
  subtitle: string
  isEmpty?: boolean
  /** Alternativa acessível mostrada ao clicar em "Ver dados" (tabela ou resumo textual). */
  dataView: ReactNode
  children: ReactNode
  className?: string
}

export type KpiTone = "neutral" | "good" | "bad"

export type KpiCardProps = {
  label: string
  value: string
  /** Contexto curto abaixo do número. Ex.: "18 de 30 indicadores" */
  hint?: string
  tone?: KpiTone
  icon?: ReactNode
}

/** Tabela de detalhe: ordenação, menu "Colunas" (visibilidade), paginação simples. */
export type DataTableProps<T> = {
  caption: string
  data: T[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  /** ids de coluna ocultos inicialmente */
  initialHidden?: string[]
  pageSize?: number
}

export type IndicatorsViewProps = {
  rows: IndicatorRow[]
  filters: IndicatorFilters
  onFiltersChange: (filters: IndicatorFilters) => void
}

export type ProjectsViewProps = {
  rows: ProjectRow[]
  filters: ProjectFilters
  onFiltersChange: (filters: ProjectFilters) => void
}
