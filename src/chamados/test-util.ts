import type { CellValue, Column, Row, Sheet, Workbook } from "@/core"

export const dia = (s: string, hora = "00:00:00"): Date =>
  new Date(`${s}T${hora}Z`)

export function montarSheet(
  rotulos: string[],
  linhas: CellValue[][],
  nome = "Aba"
): Sheet {
  const columns: Column[] = rotulos.map((label, i) => ({
    key: `c${i}`,
    label,
    type: "text",
    filterable: false,
    distinctCount: 0,
  }))
  const rows: Row[] = linhas.map((l) =>
    Object.fromEntries(columns.map((c, i) => [c.key, l[i] ?? null]))
  )
  return { id: nome, name: nome, index: 0, columns, rows }
}

export function montarWorkbook(...sheets: Sheet[]): Workbook {
  return { fileName: "teste.xlsx", importedAt: new Date(0), sheets }
}

export const ROTULOS_PADRAO = [
  "Data de abertura",
  "SITUAÇÃO",
  "Data de Solução",
  "Sla previsto",
  "SLA Renegociado",
  "Data de Aceite",
  "Cliente",
  "Área Superior",
  "Atividade",
  "Qtd Reabertura",
  "Código",
]

export type LinhaChamado = {
  abertura: string | null
  situacao?: string | null
  solucao?: string | null
  sla?: string | null
  slaReneg?: string | null
  aceite?: string | null
  cliente?: string | null
  areaSuperior?: string | null
  atividade?: string | null
  reab?: number | null
  /** Só vale em `sheetChamadosReab` (coluna Data Ultima Reabertura). */
  ultimaReab?: string | null
}

export function linha(l: LinhaChamado, codigo: number): CellValue[] {
  const d = (s: string | null | undefined) => (s ? dia(s) : null)
  return [
    d(l.abertura),
    // Com Data de Solução e sem Situação explícita, o chamado é Finalizado (D64).
    l.situacao ?? (l.solucao ? "Finalizado" : "Em Análise"),
    d(l.solucao),
    d(l.sla),
    d(l.slaReneg),
    d(l.aceite),
    l.cliente === undefined ? "Cli A" : l.cliente,
    l.areaSuperior === undefined ? "Área 1" : l.areaSuperior,
    l.atividade ?? "Suporte",
    l.reab ?? 0,
    codigo,
  ]
}

export function sheetChamados(linhas: LinhaChamado[]): Sheet {
  return montarSheet(
    ROTULOS_PADRAO,
    linhas.map((l, i) => linha(l, i + 1))
  )
}

/** Como `sheetChamados`, com a coluna extra "Data Ultima Reabertura" no fim. */
export function sheetChamadosReab(linhas: LinhaChamado[]): Sheet {
  return montarSheet(
    [...ROTULOS_PADRAO, "Data Ultima Reabertura"],
    linhas.map((l, i) => [
      ...linha(l, i + 1),
      l.ultimaReab ? dia(l.ultimaReab) : null,
    ])
  )
}
