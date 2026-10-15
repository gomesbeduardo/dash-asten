import type { Carga, RepositorioDeCargas } from "./types"

// Cargas já resolvidas, por função `obter` embrulhada (consulta síncrona de `espiarCarga`).
const resolvidasPorObter = new WeakMap<object, Map<string, Carga>>()

/**
 * Carga já em memória para `id`, sem esperar: `undefined` se ainda não resolveu
 * (ou se `obter` não vem de `comCache`). Deixa a tela montar já com os dados.
 */
export function espiarCarga(
  obter: RepositorioDeCargas["obter"],
  id: string
): Carga | undefined {
  return resolvidasPorObter.get(obter)?.get(id)
}

/**
 * Memoiza `obter(id)` pela Promise: pedidos simultâneos do mesmo id dividem uma só
 * requisição. Uma carga (id) é imutável, então não há expiração; erro e `null`
 * saem do cache para a próxima tentativa refazer o pedido.
 */
export function comCache(base: RepositorioDeCargas): RepositorioDeCargas {
  const cache = new Map<string, Promise<Carga | null>>()
  const resolvidas = new Map<string, Carga>()
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
          if (cache.get(id) === pedido) {
            if (carga === null) cache.delete(id)
            else resolvidas.set(id, carga)
          }
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
      resolvidas.delete(id)
      await base.excluir(id)
      cache.delete(id)
      resolvidas.delete(id)
      listando = null
    },
  }
  resolvidasPorObter.set(repo.obter, resolvidas)
  if (base.limparTudo) {
    const limpar = base.limparTudo.bind(base)
    repo.limparTudo = async () => {
      cache.clear()
      resolvidas.clear()
      await limpar()
      cache.clear()
      resolvidas.clear()
    }
  }
  return repo
}
