/** "Comparar com" do Painel (D65): período-base escolhido, foto corrigida e mês sem posição. */
import { useEffect, useMemo, useState } from "react"

import { formatarCompetencia, type Carga, type CargaMeta } from "@/cargas"
import { espiarCarga } from "@/cargas/comCache"
import {
  corrigirDe,
  escolherAba,
  metricasDe,
  metricasCorrigidas,
  metricasDoMesSemFoto,
  opcoesDeComparacao,
  rotuloCompetencia,
  type EntradaCompetencia,
  type KpiCorrigido,
  type MetricasCorrigidas,
} from "@/chamados"
import type { Competencia } from "@/cargas/types"
import type { Sheet } from "@/core"
import { useCargasDoTipo } from "./hooks"
import {
  entradaFiltradaDe,
  metaAnterior,
  type FiltrosChamados,
} from "./logica"
import type { BaseAnterior } from "./painel-foto"

/** Valor do seletor: "anterior" (padrão), "mes:AAAA-MM" ou "versao:N". */
export const ANTERIOR = "anterior"
export const valorMes = (c: Competencia) => `mes:${c}`
export const valorVersao = (v: number) => `versao:${v}`

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export type OpcaoSeletor = { valor: string; rotulo: string }

export type PainelComparado = {
  metricas: MetricasCorrigidas
  /** Mês aberto, filtrado e corrigido (base do cálculo por período dos gráficos). */
  entradaAtual: EntradaCompetencia
  base: BaseAnterior
  /** Foto do período-base (filtrada e corrigida), para os cruzamentos; `null` sem posição ou sem base usável. */
  entradaBase: EntradaCompetencia | null
  /** Rótulo do período-base nos Δ ("abr/26", "abr/26 · v1"); `null` sem base. */
  rotuloBase: string | null
  /** ["out/26"] ou ["mai/26", "out/26"]: fotos que corrigiram a foto aberta; vazio se nada mudou. */
  corrigidoPor: string[]
  opcoes: OpcaoSeletor[]
}

/** Carga de uma versão específica: pronta no 1º render se já está no cache. `undefined` enquanto carrega; `null` sem meta. */
function useCargaDaMeta(
  meta: CargaMeta | null,
  obterCarga: (id: string) => Promise<Carga | null>
): Carga | null | undefined {
  const id = meta?.id ?? null
  const imediato = useMemo(
    () => (id === null ? null : espiarCarga(obterCarga, id)),
    [id, obterCarga]
  )
  const [pronto, setPronto] = useState<{
    id: string
    carga: Carga | null
  } | null>(null)
  useEffect(() => {
    if (id === null || imediato) return
    let cancelado = false
    obterCarga(id)
      .catch(() => null)
      .then((carga) => {
        if (!cancelado) setPronto({ id, carga })
      })
    return () => {
      cancelado = true
    }
  }, [id, imediato, obterCarga])
  if (id === null) return null
  if (imediato) return imediato
  return pronto?.id === id ? pronto.carga : undefined
}

/**
 * Métricas do mês aberto com Δ contra o período escolhido (D65). A foto aberta e o período-base
 * (se tem foto) são corrigidos pelas posições de Mes Ref. posterior; mês sem posição só dá entradas e
 * finalizados; outra versão do mesmo mês entra crua. `null` enquanto as fotos carregam.
 */
export function usePainelComparado({
  carga,
  historico,
  obterCarga,
  sheet,
  filtros,
  escolha,
}: {
  carga: Carga
  historico: CargaMeta[]
  obterCarga: (id: string) => Promise<Carga | null>
  sheet: Sheet | null
  filtros: FiltrosChamados
  escolha: string
}): PainelComparado | null {
  const fotos = useCargasDoTipo(historico, obterCarga)
  const versaoEscolhida = escolha.startsWith("versao:")
    ? Number(escolha.slice(7))
    : null
  const metaVersao = useMemo(
    () =>
      versaoEscolhida === null
        ? null
        : (historico.find(
            (m) =>
              m.competencia === carga.competencia &&
              m.versao === versaoEscolhida &&
              m.id !== carga.id
          ) ?? null),
    [historico, carga.competencia, carga.id, versaoEscolhida]
  )
  const cargaVersao = useCargaDaMeta(metaVersao, obterCarga)

  // Lado do mês aberto: não depende do seletor, então trocar "Comparar com" não o refaz.
  const lado = useMemo(() => {
    if (!sheet || fotos === null) return null
    // última versão de cada mês; o mês aberto vale com a versão aberta
    const porMes = new Map<Competencia, Sheet>()
    for (const f of fotos) porMes.set(f.meta.competencia, f.sheet)
    porMes.set(carga.competencia, sheet)
    const meses = [...porMes.keys()].sort()
    const posterioresA = (c: Competencia): EntradaCompetencia[] =>
      meses
        .filter((m) => m > c)
        .map((m) => ({ sheet: porMes.get(m)!, competencia: m }))

    const atual = entradaFiltradaDe(sheet, carga.competencia, filtros)
    const posteriores = posterioresA(carga.competencia)
    const corrigida = corrigirDe(atual, posteriores)
    return { porMes, meses, posterioresA, atual, posteriores, corrigida }
  }, [sheet, fotos, carga.competencia, filtros])

  // Lado comparado e montagem final: refaz ao trocar o seletor, só com o que muda.
  return useMemo(() => {
    if (!lado || fotos === null || cargaVersao === undefined) return null
    const { porMes, meses, posterioresA, atual, posteriores, corrigida } = lado

    let baseEntrada: EntradaCompetencia | undefined
    let rotuloBase: string | null = null
    let semFoto: string | null = null
    let base: BaseAnterior = null
    let parcial: ReturnType<typeof metricasDoMesSemFoto> | null = null
    let competenciaBase: Competencia | null = null

    if (escolha.startsWith("versao:")) {
      const aba = cargaVersao ? escolherAba(cargaVersao.workbook) : null
      if (cargaVersao && aba) {
        baseEntrada = entradaFiltradaDe(aba, carga.competencia, filtros)
        rotuloBase = `${formatarCompetencia(carga.competencia)} · v${cargaVersao.versao}`
      }
    } else if (escolha.startsWith("mes:")) {
      competenciaBase = escolha.slice(4)
    } else {
      competenciaBase =
        metaAnterior(historico, carga.competencia)?.competencia ?? null
    }

    if (competenciaBase !== null) {
      const sheetBase = porMes.get(competenciaBase)
      if (sheetBase) {
        const bruta = entradaFiltradaDe(sheetBase, competenciaBase, filtros)
        baseEntrada = corrigirDe(bruta, posterioresA(competenciaBase)).entrada
        rotuloBase = formatarCompetencia(competenciaBase)
      } else if (escolha.startsWith("mes:")) {
        // mês sem posição: só o que as datas dão, da posição mais atual
        const maisAtual = meses[meses.length - 1]
        parcial = metricasDoMesSemFoto(
          competenciaBase,
          entradaFiltradaDe(porMes.get(maisAtual)!, maisAtual, filtros)
        )
        // texto da tela (o motor ainda diz "foto"): "posição" é o termo do responsável
        semFoto = `sem posição de ${rotuloCompetencia(competenciaBase)}`
        rotuloBase = formatarCompetencia(competenciaBase)
      }
    }

    // sem coluna de algum filtro na base: sem Δ (nunca zero)
    const baseUsavel =
      baseEntrada && (baseEntrada.colunasSemFiltro ?? []).length === 0
        ? baseEntrada
        : undefined
    const m = metricasCorrigidas(atual, posteriores, baseUsavel, corrigida)
    if (baseUsavel) {
      const bm = metricasDe(baseUsavel)
      if (bm.totalChamados !== null)
        base = {
          situacoes: bm.situacoes,
          total: bm.totalChamados,
          rotulo: rotuloBase!,
          distribuicoes: bm.distribuicoes,
          atrasoFaixas: bm.atrasoFaixas,
        }
    } else if (semFoto && parcial) {
      base = {
        situacoes: [],
        total: 0,
        rotulo: rotuloBase!,
        semFoto,
        distribuicoes: parcial.distribuicoes,
        atrasoFaixas: [],
      }
      const p = parcial
      const kpis: KpiCorrigido[] = m.kpis.map((k) => {
        const v = p.kpis.find((x) => x.id === k.id)?.valor ?? null
        if (v === null || k.valor === null)
          return { ...k, anterior: null, delta: null, detalhe: semFoto! }
        return { ...k, anterior: v, delta: k.valor - v, detalhe: undefined }
      })
      m.kpis = kpis
    }

    const opcoesM = opcoesDeComparacao(
      historico.map((h) => ({ competencia: h.competencia, versao: h.versao })),
      carga.competencia,
      fotos.length
        ? {
            sheet: fotos[fotos.length - 1].sheet,
            competencia: fotos[fotos.length - 1].meta.competencia,
          }
        : undefined,
      carga.versao
    )
    const anteriorImediato = metaAnterior(historico, carga.competencia)
    const opcoes: OpcaoSeletor[] = [
      {
        valor: ANTERIOR,
        rotulo: anteriorImediato
          ? `Mês anterior (${formatarCompetencia(anteriorImediato.competencia)})`
          : "Mês anterior",
      },
      ...opcoesM.meses
        // o mês anterior com foto já é o padrão
        .filter(
          (o) => !(o.temFoto && o.competencia === anteriorImediato?.competencia)
        )
        .map((o) => ({
          valor: valorMes(o.competencia),
          rotulo: o.temFoto
            ? formatarCompetencia(o.competencia)
            : `${rotuloCompetencia(o.competencia)} (sem posição)`,
        })),
      ...opcoesM.outrasVersoes.map((v) => ({
        valor: valorVersao(v),
        rotulo: `${cap(formatarCompetencia(carga.competencia, "longo"))} · v${v}`,
      })),
    ]

    return {
      metricas: m,
      entradaAtual: corrigida.entrada,
      base,
      entradaBase: base && !base.semFoto && baseUsavel ? baseUsavel : null,
      rotuloBase,
      corrigidoPor: m.corrigidoPor.map(rotuloCompetencia),
      opcoes,
    }
  }, [lado, fotos, cargaVersao, carga, historico, filtros, escolha])
}
