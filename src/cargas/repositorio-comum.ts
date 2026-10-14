import type { CargaMeta, NovaCarga } from "./types"

export function ordenarMetas(metas: CargaMeta[]): CargaMeta[] {
  return [...metas].sort(
    (a, b) =>
      a.tipo.localeCompare(b.tipo) ||
      b.competencia.localeCompare(a.competencia) ||
      b.versao - a.versao,
  )
}

export function montarMeta(nova: NovaCarga, existentes: CargaMeta[]): CargaMeta {
  const versoes = existentes
    .filter((m) => m.tipo === nova.tipo && m.competencia === nova.competencia)
    .map((m) => m.versao)
  return {
    id: crypto.randomUUID(),
    tipo: nova.tipo,
    competencia: nova.competencia,
    versao: Math.max(0, ...versoes) + 1,
    importadaEm: new Date().toISOString(),
    arquivo: nova.arquivo,
    linhas: nova.workbook.sheets.reduce((soma, s) => soma + s.rows.length, 0),
  }
}
