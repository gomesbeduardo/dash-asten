// Configuração declarativa das abas da planilha fictícia.
export type SheetLayout = "indicators" | "projects" | "table-only" | "incompatible"
export type DiagnosticState = "ok" | "partial" | "incompatible"

export type SheetConfig = {
  id: string
  name: string
  layout: SheetLayout
  diagnostic: { state: DiagnosticState; summary: string }
}

export const SHEETS: readonly SheetConfig[] = [
  {
    id: "indicadores",
    name: "Indicadores",
    layout: "indicators",
    diagnostic: { state: "ok", summary: "Layout reconhecido" },
  },
  {
    id: "projetos",
    name: "Projetos",
    layout: "projects",
    diagnostic: { state: "ok", summary: "Layout reconhecido" },
  },
  {
    id: "instrucoes",
    name: "Instruções",
    layout: "table-only",
    diagnostic: { state: "partial", summary: "Sem layout definido: exibida só como tabela" },
  },
  {
    id: "base-antiga",
    name: "Base antiga",
    layout: "incompatible",
    diagnostic: { state: "incompatible", summary: "Incompatível: coluna “Prazo” ausente" },
  },
]
