import type { Carga, RepositorioDeCargas } from "./types"

/**
 * Memoiza `obter(id)` pela Promise: pedidos simultâneos do mesmo id dividem uma só
 * requisição. Uma carga (id) é imutável, então não há expiração; erro e `null`
 * saem do cache para a próxima tentativa refazer o pedido.
 */
export function comCache(base: RepositorioDeCargas): RepositorioDeCargas {
  const cache = new Map<string, Promise<Carga | null>>()
  let listando: ReturnType<RepositorioDeCargas["listar"]> | null = null

  const repo: RepositorioDeCargas = {
    // A lista muda (salvar/excluir): só divide o pedido em andamento (ex.: StrictMode).
    listar() {
      if (listando) return listando
      const pedido = base.listar().finally(() => {
        if (listando === pedido) listando = null
      })
      listando = pedido
      return pedido
    },
    obter(id) {
      const existente = cache.get(id)
      if (existente) return existente
      const pedido = base.obter(id).then(
        (carga) => {
          if (carga === null && cache.get(id) === pedido) cache.delete(id)
          return carga
        },
        (erro) => {
          if (cache.get(id) === pedido) cache.delete(id)
          throw erro
        }
      )
      cache.set(id, pedido)
      return pedido
    },
    async salvar(nova) {
      listando = null
      const meta = await base.salvar(nova)
      listando = null
      return meta
    },
    // Muda só os metadados: a lista é refeita; os dados de `obter` seguem válidos.
    async alterar(id, alteracao) {
      listando = null
      const meta = await base.alterar(id, alteracao)
      listando = null
      return meta
    },
    async excluir(id) {
      listando = null
      cache.delete(id)
      await base.excluir(id)
      cache.delete(id)
      listando = null
    },
  }
  if (base.limparTudo) {
    const limpar = base.limparTudo.bind(base)
    repo.limparTudo = async () => {
      cache.clear()
      await limpar()
      cache.clear()
    }
  }
  return repo
}
