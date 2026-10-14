import { montarMeta, ordenarMetas } from "./repositorio-comum"
import type { Carga, CargaMeta, RepositorioDeCargas } from "./types"

/** Adaptador em memória; structuredClone evita vazar referências para o chamador. */
export function criarRepositorioMemoria(): RepositorioDeCargas {
  const cargas = new Map<string, Carga>()
  const metaDe = (c: Carga): CargaMeta => { const { workbook, ...meta } = c; void workbook; return meta }
  return {
    async listar() {
      return ordenarMetas([...cargas.values()].map(metaDe))
    },
    async obter(id) {
      const c = cargas.get(id)
      return c ? structuredClone(c) : null
    },
    async salvar(nova) {
      const meta = montarMeta(nova, [...cargas.values()].map(metaDe))
      cargas.set(meta.id, { ...meta, workbook: structuredClone(nova.workbook) })
      return meta
    },
    async excluir(id) {
      cargas.delete(id)
    },
    async limparTudo() {
      cargas.clear()
    },
  }
}
