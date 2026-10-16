/**
 * Cache do motor por identidade (D34: nada é descartado, só não se refaz a mesma conta).
 * As entradas são imutáveis; a chave é o próprio objeto, num WeakMap: some junto com a planilha,
 * sem crescer sem limite.
 */
import type { Sheet } from "@/core"
import { aplicarAnterior, calcularMetricas } from "./metricas"
import type { EntradaCompetencia, MetricasChamados } from "./tipos"

let proximoId = 1
const ids = new WeakMap<object, number>()

/** Número estável de uma planilha, para montar chaves de texto (filtro, posições posteriores). */
export function idDaSheet(sheet: Sheet): number {
  let id = ids.get(sheet)
  if (id === undefined) {
    id = proximoId++
    ids.set(sheet, id)
  }
  return id
}

const bases = new WeakMap<EntradaCompetencia, MetricasChamados>()
const comAnterior = new WeakMap<
  EntradaCompetencia,
  WeakMap<EntradaCompetencia, MetricasChamados>
>()

/** Métricas da entrada sem Δ, calculadas uma vez por objeto de entrada. */
function baseDe(e: EntradaCompetencia): MetricasChamados {
  let m = bases.get(e)
  if (!m) {
    m = calcularMetricas(e)
    bases.set(e, m)
  }
  return m
}

/**
 * Mesmo resultado de `calcularMetricas(atual, anterior)`, com cada entrada calculada uma só vez.
 * O resultado é compartilhado: quem recebe não deve alterá-lo.
 */
export function metricasDe(
  atual: EntradaCompetencia,
  anterior?: EntradaCompetencia
): MetricasChamados {
  if (!anterior) return baseDe(atual)
  let porAnterior = comAnterior.get(atual)
  if (!porAnterior) {
    porAnterior = new WeakMap()
    comAnterior.set(atual, porAnterior)
  }
  let m = porAnterior.get(anterior)
  if (!m) {
    m = aplicarAnterior(baseDe(atual), baseDe(anterior))
    porAnterior.set(anterior, m)
  }
  return m
}
