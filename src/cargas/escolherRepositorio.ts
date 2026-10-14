import { criarRepositorioApi } from "./repositorio-api"
import { criarRepositorioIndexedDB } from "./repositorio-indexeddb"
import type { RepositorioDeCargas } from "./types"

/** VITE_REPOSITORIO=api usa o banco compartilhado; qualquer outro valor, o IndexedDB local. */
export function criarRepositorioPadrao(): RepositorioDeCargas {
  return import.meta.env.VITE_REPOSITORIO === "api"
    ? criarRepositorioApi()
    : criarRepositorioIndexedDB()
}
