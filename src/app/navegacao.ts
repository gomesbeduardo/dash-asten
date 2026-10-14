import type { CargaMeta, Competencia } from "@/cargas"

export type Visao = "painel" | "comparar" | "evolucao"
export type GrupoCompetencia = {
  competencia: Competencia
  versoes: CargaMeta[]
}
export type GrupoTipo = { tipo: string; competencias: GrupoCompetencia[] }

const quando = (m: CargaMeta) => Date.parse(m.importadaEm)

/** Competência desc, versão desc. */
function ordemRecente(a: CargaMeta, b: CargaMeta): number {
  if (a.competencia !== b.competencia)
    return a.competencia < b.competencia ? 1 : -1
  return b.versao - a.versao
}

/** Competências do tipo, mais recente primeiro; dentro de cada uma, versões mais recentes primeiro. */
export function competenciasDoTipo(
  metas: CargaMeta[],
  tipo: string
): GrupoCompetencia[] {
  const grupos: GrupoCompetencia[] = []
  for (const m of metas.filter((x) => x.tipo === tipo).sort(ordemRecente)) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.competencia === m.competencia) ultimo.versoes.push(m)
    else grupos.push({ competencia: m.competencia, versoes: [m] })
  }
  return grupos
}

export function agruparHistorico(metas: CargaMeta[]): GrupoTipo[] {
  const tipos = [...new Set(metas.map((m) => m.tipo))].sort()
  return tipos.map((tipo) => ({
    tipo,
    competencias: competenciasDoTipo(metas, tipo),
  }))
}

/** Abertura: competência mais recente (versão mais recente) do tipo da última carga feita. */
export function escolherCargaInicial(metas: CargaMeta[]): CargaMeta | null {
  if (metas.length === 0) return null
  const ultima = metas.reduce((a, b) => (quando(b) > quando(a) ? b : a))
  return competenciasDoTipo(metas, ultima.tipo)[0].versoes[0]
}

export function proximaVersao(
  metas: CargaMeta[],
  tipo: string,
  competencia: Competencia
): number {
  return (
    metas
      .filter((m) => m.tipo === tipo && m.competencia === competencia)
      .reduce((max, m) => Math.max(max, m.versao), 0) + 1
  )
}

/** Depois de excluir a carga aberta: mesma competência, senão mesmo tipo, senão a escolha inicial. */
export function sucessorAposExcluir(
  restantes: CargaMeta[],
  excluida: CargaMeta
): CargaMeta | null {
  const mesmaComp = competenciasDoTipo(restantes, excluida.tipo).find(
    (g) => g.competencia === excluida.competencia
  )
  if (mesmaComp) return mesmaComp.versoes[0]
  const doTipo = competenciasDoTipo(restantes, excluida.tipo)[0]
  if (doTipo) return doTipo.versoes[0]
  return escolherCargaInicial(restantes)
}

export function resolverVisao(pedida: Visao, disponiveis: Visao[]): Visao {
  return disponiveis.includes(pedida) ? pedida : "painel"
}
