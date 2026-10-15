import { useEffect, useMemo, useState } from "react"

import type { Carga, CargaMeta } from "@/cargas"
import { espiarCarga } from "@/cargas/comCache"
import {
  calcularMetricas,
  escolherAba,
  gerarLeituras,
  reconstruirAnteriores,
  type EntradaCompetencia,
} from "@/chamados"
import type { Sheet } from "@/core"
import { useFiltrosChamados } from "./filtros"
import {
  colunasAusentes,
  filtrarSheet,
  metaAnterior,
  ultimasVersoes,
} from "./logica"

export type CargaComAba = { meta: CargaMeta; sheet: Sheet }

/** Carrega a aba de chamados da versão mais recente de cada competência. `null` enquanto carrega. */
export function useCargasDoTipo(
  historico: CargaMeta[],
  obterCarga: (id: string) => Promise<Carga | null>
): CargaComAba[] | null {
  const versoes = useMemo(() => ultimasVersoes(historico), [historico])
  const chave = versoes.map((m) => m.id).join("|")
  // Cargas já no cache: o 1º render já traz os dados (sem esqueleto nem tick assíncrono).
  const imediato = useMemo(() => {
    const cargas = versoes.map((m) => espiarCarga(obterCarga, m.id))
    if (cargas.some((c) => c === undefined)) return null
    return versoes.flatMap((meta, i) => {
      const sheet = escolherAba(cargas[i]!.workbook)
      return sheet ? [{ meta, sheet }] : []
    })
  }, [versoes, obterCarga])
  const [pronto, setPronto] = useState<{
    chave: string
    itens: CargaComAba[]
  } | null>(null)

  useEffect(() => {
    if (imediato) return
    let cancelado = false
    Promise.all(
      versoes.map(async (meta) => {
        try {
          const carga = await obterCarga(meta.id)
          const sheet = carga ? escolherAba(carga.workbook) : null
          return sheet ? { meta, sheet } : null
        } catch {
          return null
        }
      })
    ).then((itens) => {
      if (!cancelado)
        setPronto({
          chave,
          itens: itens.filter((i): i is CargaComAba => i !== null),
        })
    })
    return () => {
      cancelado = true
    }
  }, [versoes, chave, obterCarga, imediato])

  if (imediato) return imediato
  return pronto?.chave === chave ? pronto.itens : null
}

export type Anterior = { entrada: EntradaCompetencia; propria: boolean }

/** Mês anterior: a carga própria (versão mais recente) se existir; senão reconstruído pelas datas. `undefined` enquanto carrega. */
export function useAnterior(
  carga: Carga,
  historico: CargaMeta[],
  obterCarga: (id: string) => Promise<Carga | null>,
  sheet: Sheet | null
): Anterior | null | undefined {
  const chave = `${carga.id}|${historico.map((m) => m.id).join(",")}`
  // Anterior próprio já no cache: o 1º render já o tem (sem tick assíncrono).
  const imediato = useMemo<Anterior | undefined>(() => {
    const meta = metaAnterior(historico, carga.competencia)
    const anterior = meta ? espiarCarga(obterCarga, meta.id) : undefined
    const aba = anterior ? escolherAba(anterior.workbook) : null
    if (!meta || !aba) return undefined
    return {
      entrada: { sheet: aba, competencia: meta.competencia, cargaPropria: true },
      propria: true,
    }
    // chave resume carga/historico.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, obterCarga])
  const [pronto, setPronto] = useState<{
    chave: string
    valor: Anterior | null
  } | null>(null)

  useEffect(() => {
    if (imediato) return
    let cancelado = false
    ;(async () => {
      let valor: Anterior | null = null
      try {
        const meta = metaAnterior(historico, carga.competencia)
        const anterior = meta ? await obterCarga(meta.id) : null
        const aba = anterior ? escolherAba(anterior.workbook) : null
        if (meta && aba)
          valor = {
            entrada: {
              sheet: aba,
              competencia: meta.competencia,
              cargaPropria: true,
            },
            propria: true,
          }
      } catch {
        valor = null
      }
      if (!valor && sheet)
        valor = {
          entrada: reconstruirAnteriores(sheet, carga.competencia, 1)[0],
          propria: false,
        }
      if (!cancelado) setPronto({ chave, valor })
    })()
    return () => {
      cancelado = true
    }
    // chave resume carga/historico; obterCarga e sheet são estáveis por carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, obterCarga, sheet, imediato])

  if (imediato) return imediato
  return pronto?.chave === chave ? pronto.valor : undefined
}

/**
 * O mês da carga com o recorte dos filtros aplicado ao mês e ao anterior (antes de calcular).
 * `metricas` é `null` enquanto o mês anterior carrega.
 */
export function useMesDeChamados(
  carga: Carga,
  historico: CargaMeta[],
  obterCarga: (id: string) => Promise<Carga | null>
) {
  const sheet = useMemo(() => escolherAba(carga.workbook), [carga.workbook])
  const bruto = useAnterior(carga, historico, obterCarga, sheet)
  const { filtros } = useFiltrosChamados()
  const sheetFiltrada = useMemo(
    () => (sheet ? filtrarSheet(sheet, filtros, carga.competencia) : null),
    [sheet, filtros, carga.competencia]
  )
  const anterior = useMemo(
    () =>
      bruto
        ? {
            ...bruto,
            entrada: {
              ...bruto.entrada,
              colunasSemFiltro: colunasAusentes(bruto.entrada.sheet, filtros),
              sheet: filtrarSheet(
                bruto.entrada.sheet,
                filtros,
                bruto.entrada.competencia
              ),
            },
          }
        : bruto,
    [bruto, filtros]
  )
  const atual = useMemo<EntradaCompetencia | null>(
    () =>
      sheetFiltrada
        ? {
            sheet: sheetFiltrada,
            competencia: carga.competencia,
            cargaPropria: true,
            colunasSemFiltro: sheet ? colunasAusentes(sheet, filtros) : [],
          }
        : null,
    [sheetFiltrada, sheet, filtros, carga.competencia]
  )
  const pronto = atual !== null && anterior !== undefined
  const metricas = useMemo(
    () => (pronto ? calcularMetricas(atual, anterior?.entrada) : null),
    [pronto, atual, anterior]
  )
  const leituras = useMemo(
    () => (pronto ? gerarLeituras(atual, anterior?.entrada) : []),
    [pronto, atual, anterior]
  )
  const semColuna = atual?.colunasSemFiltro ?? []
  return { sheet, filtros, metricas, leituras, anterior, semColuna }
}
