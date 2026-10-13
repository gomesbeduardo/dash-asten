import type { ComponentType } from "react"
import type { Row, Sheet, SheetFilters } from "@/core"

export type PanelProps = { sheet: Sheet; rows: Row[]; filters: SheetFilters }

// É aqui que os painéis da planilha real entram (D5/D19): quando o Líder validar o
// layout, registre um componente por nome de aba, ex.: `"Projetos": ProjetosPanel`.
// Aba sem painel registrado cai na visão genérica (tabela com filtros, D22).
export const panels: Record<string, ComponentType<PanelProps>> = {}

export function getPanel(sheet: Sheet): ComponentType<PanelProps> | null {
  return Object.hasOwn(panels, sheet.name) ? panels[sheet.name] : null
}
