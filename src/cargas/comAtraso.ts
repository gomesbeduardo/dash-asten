import type { RepositorioDeCargas } from "./types"

/**
 * Só desenvolvimento: VITE_ATRASO_MS=800 atrasa as leituras (listar/obter) para
 * ver esqueletos e estados de espera. 0, ausente ou inválido não muda nada.
 */
export function comAtraso(
  repo: RepositorioDeCargas,
  ms: number | undefined
): RepositorioDeCargas {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return repo
  const espera = () => new Promise<void>((r) => setTimeout(r, ms))
  return {
    listar: async () => (await espera(), repo.listar()),
    obter: async (id) => (await espera(), repo.obter(id)),
    salvar: (nova) => repo.salvar(nova),
    excluir: (id) => repo.excluir(id),
    alterar: (id, alteracao) => repo.alterar(id, alteracao),
    ...(repo.limparTudo && { limparTudo: () => repo.limparTudo!() }),
  }
}
