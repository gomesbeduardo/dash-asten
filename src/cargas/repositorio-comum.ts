import { createId } from "@paralleldrive/cuid2"
import type { AlteracaoDeCarga, CargaMeta, NovaCarga } from "./types"

/** Nome opcional: sem espaços nas pontas; vazio vira null. */
export const normalizarNome = (n: string | null | undefined): string | null => n?.trim() || null

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
    id: createId(),
    tipo: nova.tipo,
    competencia: nova.competencia,
    versao: Math.max(0, ...versoes) + 1,
    importadaEm: new Date().toISOString(),
    arquivo: nova.arquivo,
    nome: normalizarNome(nova.nome),
    arquivadaEm: null,
    linhas: nova.workbook.sheets.reduce((soma, s) => soma + s.rows.length, 0),
  }
}

/** Aplica a alteração à meta; ao mudar de grupo, a versão passa a ser max+1 do destino. */
export function aplicarAlteracao(
  meta: CargaMeta,
  alt: AlteracaoDeCarga,
  existentes: CargaMeta[],
): CargaMeta {
  const tipo = alt.tipo ?? meta.tipo
  const competencia = alt.competencia ?? meta.competencia
  const move = tipo !== meta.tipo || competencia !== meta.competencia
  const versao = move
    ? Math.max(0, ...existentes.filter((m) => m.id !== meta.id && m.tipo === tipo && m.competencia === competencia).map((m) => m.versao)) + 1
    : meta.versao
  return {
    ...meta,
    tipo,
    competencia,
    versao,
    nome: alt.nome !== undefined ? normalizarNome(alt.nome) : meta.nome,
    arquivadaEm: alt.arquivada === undefined ? meta.arquivadaEm : alt.arquivada ? meta.arquivadaEm ?? new Date().toISOString() : null,
  }
}
