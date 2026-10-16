/** Cache de `corrigirFoto` por foto (identidade) e posições posteriores (planilhas). Ver cache-metricas.ts. */
import { idDaSheet } from "./cache-metricas"
import { corrigirFoto, type FotoCorrigida } from "./fotos"
import type { EntradaCompetencia } from "./tipos"

const MAX_POR_FOTO = 8
const cache = new WeakMap<EntradaCompetencia, Map<string, FotoCorrigida>>()

/** Mesmo resultado de `corrigirFoto(foto, posteriores)`, calculado uma vez por foto e conjunto de posteriores. */
export function corrigirDe(
  foto: EntradaCompetencia,
  posteriores: EntradaCompetencia[]
): FotoCorrigida {
  const chave = posteriores
    .map((p) => `${p.competencia}:${idDaSheet(p.sheet)}`)
    .join("|")
  let porChave = cache.get(foto)
  if (!porChave) {
    porChave = new Map()
    cache.set(foto, porChave)
  }
  let r = porChave.get(chave)
  if (!r) {
    r = corrigirFoto(foto, posteriores)
    if (porChave.size >= MAX_POR_FOTO)
      porChave.delete(porChave.keys().next().value!)
    porChave.set(chave, r)
  }
  return r
}
