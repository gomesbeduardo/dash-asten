import type { ComponentType } from "react"
import type { Row, Sheet, SheetFilters } from "@/core"
import { AutoPanel } from "@/components/app/auto/AutoPanel"

export type PanelProps = {
  sheet: Sheet
  rows: Row[]
  filters: SheetFilters
  /** true na 1ª abertura da aba após importar: toca a entrada única (D26). */
  entry?: boolean
}

// É aqui que os painéis da planilha real entram (D5/D19): quando o Líder validar o
// layout, registre um componente por nome de aba, ex.: `"Projetos": ProjetosPanel`.
// Aba sem painel registrado cai no painel automático (KPIs, gráficos e tabela, D25).
export const panels: Record<string, ComponentType<PanelProps>> = {}

export function getPanel(sheet: Sheet): ComponentType<PanelProps> | null {
  return Object.hasOwn(panels, sheet.name) ? panels[sheet.name] : null
}

/** Painel registrado tem prioridade; sem ele, o painel automático (D25). */
export function resolvePanel(sheet: Sheet): ComponentType<PanelProps> {
  return getPanel(sheet) ?? AutoPanel
}
