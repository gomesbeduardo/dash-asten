/** Ordem dos segmentos e das linhas dos cruzamentos empilhados. */
export type PorSituacao = {
  rotulo: string
  total: number
  porSituacao: Record<string, number>
}
export type PorFaixa = {
  rotulo: string
  total: number
  porFaixa: Record<string, number>
}

/** Situações pela soma no gráfico: a de maior total vai para a base (esquerda) em todas as barras. */
export function ordemSituacoes(
  situacoes: string[],
  meses: PorSituacao[][]
): string[] {
  const total = (s: string) =>
    meses.reduce(
      (acc, itens) =>
        acc + itens.reduce((a, i) => a + (i.porSituacao[s] ?? 0), 0),
      0
    )
  // sort estável: empate mantém a ordem de chegada
  return [...situacoes].sort((x, y) => total(y) - total(x))
}

/** Faixas de atraso com a mais antiga (7+) na base e "No ciclo" na ponta. */
export function ordemFaixas(faixas: readonly string[]): string[] {
  return [...[...faixas].reverse(), "No ciclo"]
}

export const clientesPorTotal = (itens: PorSituacao[]): PorSituacao[] =>
  [...itens].sort((x, y) => y.total - x.total)

export const operadoresPorAtraso = (itens: PorFaixa[]): PorFaixa[] =>
  [...itens].sort(
    (x, y) =>
      (y.porFaixa["7+"] ?? 0) - (x.porFaixa["7+"] ?? 0) || y.total - x.total
  )
