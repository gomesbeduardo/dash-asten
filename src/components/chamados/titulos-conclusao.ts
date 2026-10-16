/** Títulos que dizem a conclusão do dado. Regras simples e determinísticas; sem dado útil, volta o nome fixo. */
export type ItemFinNao = { rotulo: string; fin: number; nao: number }
export type ItemFaixa = { rotulo: string; valor: number }
export type ItemClienteSituacao = {
  rotulo: string
  total: number
  porSituacao: Record<string, number>
}
export type ItemOperadorAtraso = {
  rotulo: string
  maisAntigos: number
  total: number
}
export type ItemAreaSla = {
  rotulo: string
  pct: number | null
  vencidos: number
}
export type ItemTempo = { rotulo: string; resolucao: number | null }

/** Índice do maior valor, só se for único e positivo. */
function topoUnico<T>(itens: T[], valor: (i: T) => number): T | null {
  let melhor: T | null = null
  let max = 0
  let empate = false
  for (const i of itens) {
    const v = valor(i)
    if (v > max) {
      max = v
      melhor = i
      empate = false
    } else if (v === max && v > 0) empate = true
  }
  return empate ? null : melhor
}

const plural = (n: number, um: string, varios: string) =>
  `${new Intl.NumberFormat("pt-BR").format(n)} ${n === 1 ? um : varios}`

export function tituloDimensao(itens: ItemFinNao[], fixo: string): string {
  const reais = itens.filter((i) => i.rotulo !== "Outros")
  if (reais.length < 2) return fixo
  const fin = topoUnico(reais, (i) => i.fin)
  const nao = topoUnico(reais, (i) => i.nao)
  if (fin && nao)
    return fin === nao
      ? `${fin.rotulo} lidera os finalizados e os pendentes`
      : `${fin.rotulo} lidera os finalizados; ${nao.rotulo} tem mais pendentes`
  if (fin) return `${fin.rotulo} lidera os finalizados`
  if (nao) return `${nao.rotulo} tem mais pendentes`
  return fixo
}

export function tituloFaixas(itens: ItemFaixa[], fixo: string): string {
  const top = topoUnico(itens, (i) => i.valor)
  return top
    ? `A maior faixa é ${top.rotulo} meses, com ${plural(top.valor, "chamado", "chamados")}`
    : fixo
}

export function tituloClienteSituacao(
  itens: ItemClienteSituacao[],
  fixo: string
): string {
  const cli = topoUnico(itens, (i) => i.total)
  if (!cli) return fixo
  const entradas = Object.entries(cli.porSituacao).map(([rotulo, valor]) => ({
    rotulo,
    valor,
  }))
  const sit = topoUnico(entradas, (e) => e.valor)
  return sit
    ? `${cli.rotulo} tem mais pendentes, puxado por ${sit.rotulo}`
    : `${cli.rotulo} tem mais pendentes`
}

export function tituloOperadorAtraso(
  itens: ItemOperadorAtraso[],
  rotuloFaixa: string,
  fixo: string
): string {
  const op = topoUnico(itens, (i) => i.maisAntigos)
  return op
    ? `${op.rotulo} tem ${plural(op.maisAntigos, "chamado", "chamados")} com ${rotuloFaixa}`
    : fixo
}

export function tituloAreaSla(itens: ItemAreaSla[], fixo: string): string {
  const com = itens.filter(
    (i): i is ItemAreaSla & { pct: number } => i.pct !== null
  )
  if (com.length < 2) return fixo
  const media = com.reduce((a, i) => a + i.pct, 0) / com.length
  const abaixo = com.filter((i) => i.pct < media).sort((a, b) => a.pct - b.pct)
  if (abaixo.length === 0) return fixo
  const nomes = abaixo.slice(0, 2).map((i) => i.rotulo)
  const resto = abaixo.length - nomes.length
  if (nomes.length === 1) return `${nomes[0]} está abaixo da média no SLA`
  const lista =
    resto > 0 ? `${nomes.join(", ")} e mais ${resto}` : nomes.join(" e ")
  return `${lista} estão abaixo da média no SLA`
}

export function tituloTempo(itens: ItemTempo[], fixo: string): string {
  const com = itens.filter(
    (i): i is ItemTempo & { resolucao: number } => i.resolucao !== null
  )
  if (com.length < 2) return fixo
  const top = topoUnico(com, (i) => i.resolucao)
  return top
    ? `${top.rotulo} leva ${plural(Math.round(top.resolucao), "dia", "dias")} para resolver`
    : fixo
}
