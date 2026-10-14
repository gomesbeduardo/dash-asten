import { aplicarAlteracao, montarMeta, ordenarMetas } from "./repositorio-comum"
import type { Carga, CargaMeta, RepositorioDeCargas } from "./types"

const METAS = "metas"
const WORKBOOKS = "workbooks"

function pedido<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((ok, erro) => {
    req.onsuccess = () => ok(req.result)
    req.onerror = () => erro(req.error)
  })
}

function concluida(tx: IDBTransaction): Promise<void> {
  return new Promise((ok, erro) => {
    tx.oncomplete = () => ok()
    tx.onerror = () => erro(tx.error)
    tx.onabort = () => erro(tx.error)
  })
}

/** Adaptador IndexedDB: metadados e workbooks em stores separadas (listar não carrega os dados). */
export function criarRepositorioIndexedDB(nomeBanco = "dash-asten"): RepositorioDeCargas {
  let aberto: Promise<IDBDatabase> | null = null
  const banco = () =>
    (aberto ??= new Promise<IDBDatabase>((ok, erro) => {
      const req = indexedDB.open(nomeBanco, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(METAS, { keyPath: "id" })
        req.result.createObjectStore(WORKBOOKS)
      }
      req.onsuccess = () => ok(req.result)
      req.onerror = () => erro(req.error)
    }))

  return {
    async listar() {
      const tx = (await banco()).transaction(METAS, "readonly")
      return ordenarMetas(await pedido<CargaMeta[]>(tx.objectStore(METAS).getAll()))
    },
    async obter(id) {
      const tx = (await banco()).transaction([METAS, WORKBOOKS], "readonly")
      const [meta, workbook] = await Promise.all([
        pedido<CargaMeta | undefined>(tx.objectStore(METAS).get(id)),
        pedido<Carga["workbook"] | undefined>(tx.objectStore(WORKBOOKS).get(id)),
      ])
      return meta && workbook ? { ...meta, workbook } : null
    },
    async salvar(nova) {
      const tx = (await banco()).transaction([METAS, WORKBOOKS], "readwrite")
      const existentes = await pedido<CargaMeta[]>(tx.objectStore(METAS).getAll())
      const meta = montarMeta(nova, existentes)
      tx.objectStore(METAS).put(meta)
      tx.objectStore(WORKBOOKS).put(nova.workbook, meta.id)
      await concluida(tx)
      return meta
    },
    async excluir(id) {
      const tx = (await banco()).transaction([METAS, WORKBOOKS], "readwrite")
      tx.objectStore(METAS).delete(id)
      tx.objectStore(WORKBOOKS).delete(id)
      await concluida(tx)
    },
    async alterar(id, alteracao) {
      const tx = (await banco()).transaction(METAS, "readwrite")
      const todas = await pedido<CargaMeta[]>(tx.objectStore(METAS).getAll())
      const atual = todas.find((m) => m.id === id)
      if (!atual) throw new Error("Carga não encontrada.")
      const meta = aplicarAlteracao(atual, alteracao, todas)
      tx.objectStore(METAS).put(meta)
      await concluida(tx)
      return meta
    },
    async limparTudo() {
      const tx = (await banco()).transaction([METAS, WORKBOOKS], "readwrite")
      tx.objectStore(METAS).clear()
      tx.objectStore(WORKBOOKS).clear()
      await concluida(tx)
    },
  }
}
