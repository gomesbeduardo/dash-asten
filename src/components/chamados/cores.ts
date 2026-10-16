/** Cor por significado (tokens de src/index.css). Situação por nome, nunca pela posição no ranking. */
export const COR_FIN = "var(--serie-finalizados)"
export const COR_NAO = "var(--serie-nao-finalizados)"

const normalizar = (r: string) =>
  r.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()

const POR_NOME: Record<string, string> = {
  "aguardando cliente": "var(--sit-aguardando-cliente)",
  "em analise": "var(--sit-analise)",
  "em atendimento": "var(--sit-atendimento)",
  "aguardando aceite": "var(--sit-aceite)",
}

export function corDaSituacao(rotulo: string): string {
  const n = normalizar(rotulo)
  if (n.startsWith("finaliz")) return COR_FIN
  return POR_NOME[n] ?? "var(--sit-outra)"
}

/** Uma cor por situação, a mesma em toda a página; a ordem de chegada não muda nada. */
export function coresDasSituacoes(rotulos: string[]): Map<string, string> {
  return new Map(rotulos.map((r) => [r, corDaSituacao(r)]))
}
