import { criarRepositorioApi } from "./repositorio-api"
import { criarRepositorioIndexedDB } from "./repositorio-indexeddb"
import { comAtraso } from "./comAtraso"
import type { RepositorioDeCargas } from "./types"

/** VITE_REPOSITORIO=api usa o banco compartilhado; qualquer outro valor, o IndexedDB local. */
export function criarRepositorioPadrao(): RepositorioDeCargas {
  const base =
    import.meta.env.VITE_REPOSITORIO === "api"
      ? criarRepositorioApi()
      : criarRepositorioIndexedDB()
  // Atraso artificial (VITE_ATRASO_MS) só no dev server; no build não tem efeito.
  return import.meta.env.DEV
    ? comAtraso(base, Number(import.meta.env.VITE_ATRASO_MS))
    : base
}
