/**
 * Pedido de abrir o Comparar com as versões de um mês (atalho "Comparar versões" do Histórico).
 * Fica na memória por alguns segundos: o Comparar pode já estar aberto (ouve o aviso) ou montar
 * em seguida, quando a carga muda (lê o pedido ao montar).
 */
export type PedidoComparar = { competencia: string; versoes: number[] }

const VALIDADE_MS = 4000
let pendente: { pedido: PedidoComparar; em: number } | null = null
const ouvintes = new Set<() => void>()

export function pedirComparacao(pedido: PedidoComparar) {
  pendente = { pedido, em: Date.now() }
  ouvintes.forEach((f) => f())
}

/** O pedido ainda válido (ou `null`). */
export function lerPedido(): PedidoComparar | null {
  if (pendente && Date.now() - pendente.em > VALIDADE_MS) pendente = null
  return pendente?.pedido ?? null
}

export function limparPedido() {
  pendente = null
}

export function ouvirPedido(f: () => void): () => void {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}
