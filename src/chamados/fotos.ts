import type { Competencia } from "@/cargas/types"
import type { Row, Sheet } from "@/core"
import { metricasDe } from "./cache-metricas"
import { mapearColunas } from "./mapeamento"
import {
  distribuicoesFinalizadosNoPeriodo,
  limitesDaCompetencia,
} from "./metricas"
import { normalizar } from "./mapeamento"
import { tempo, texto } from "./situacao"
import type {
  DistribuicaoCorrigida,
  EntradaCompetencia,
  ItemDistribuicaoCorrigido,
  KpiChamados,
  KpiCorrigido,
  MetricasChamados,
  MetricasCorrigidas,
  MetricasParciais,
  OpcaoComparacao,
} from "./tipos"

const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
]
/** "2026-06" → "jun/26". */
export const rotuloCompetencia = (c: Competencia) =>
  `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(2, 4)}`

export type FotoCorrigida = {
  entrada: EntradaCompetencia
  corrigidos: number
  /** Mes Ref. das fotos posteriores que originaram alguma correção. */
  corrigidoPor: Competencia[]
  avisos: string[]
}

/**
 * Corrige uma foto pelas de Mes Ref. estritamente posterior (D65). Cruza por Código; a foto
 * posterior mais recente que tem o chamado manda. Só vira Finalizado quem, lá, está Finalizado
 * com Data de Solução até o fim do mês da foto antiga e aqui não estava, e só se o aceite não
 * contradiz (o momento em que o chamado de fato virou Finalizado é o aceite, quando existe):
 * - Data de Aceite preenchida na posterior: corrige só se ela for até o fim do mês da foto antiga;
 * - sem Data de Aceite (coluna ausente ou vazia) e Situação aqui contendo "aceite": não corrige,
 *   a posição antiga estava certa e o chamado já aparece Finalizado a partir do mês do aceite;
 * - sem Data de Aceite e Situação sem "aceite": corrige pela Data de Solução (lançamento atrasado).
 * A planilha não é alterada.
 */
export function corrigirFoto(
  foto: EntradaCompetencia,
  posteriores: EntradaCompetencia[]
): FotoCorrigida {
  const sem = (avisos: string[]): FotoCorrigida => ({
    entrada: foto,
    corrigidos: 0,
    corrigidoPor: [],
    avisos,
  })
  const { mapa } = mapearColunas(foto.sheet)
  if (!mapa.codigo)
    return sem(["Sem a coluna Código nesta posição do mês: nenhuma correção aplicada"])
  if (!mapa.situacao || !mapa.solucao)
    return sem([
      "Sem as colunas Situação e Data de Solução nesta posição do mês: nenhuma correção aplicada",
    ])
  const avisos: string[] = []
  const fim = limitesDaCompetencia(foto.competencia).fim
  const mais = posteriores
    .filter((p) => p.competencia > foto.competencia)
    .sort((a, b) => b.competencia.localeCompare(a.competencia))
  const indices = mais.flatMap((p) => {
    const m = mapearColunas(p.sheet).mapa
    if (!m.codigo || !m.situacao || !m.solucao) {
      avisos.push(
        `Posição de ${rotuloCompetencia(p.competencia)} sem Código, Situação ou Data de Solução: não usada na correção`
      )
      return []
    }
    const porCodigo = new Map<string, Row>()
    for (const r of p.sheet.rows) {
      const c = texto(r[m.codigo])
      if (c !== null && !porCodigo.has(c)) porCodigo.set(c, r)
    }
    return [{ p, m, porCodigo }]
  })
  const origens = new Set<Competencia>()
  let corrigidos = 0
  const rows = foto.sheet.rows.map((row) => {
    if (normalizar(texto(row[mapa.situacao!]) ?? "") === "finalizado")
      return row
    const c = texto(row[mapa.codigo!])
    if (c === null) return row
    const achou = indices.find((i) => i.porCodigo.has(c))
    if (!achou) return row
    const { p, m } = achou
    const r = achou.porCodigo.get(c)!
    const solucao = tempo(r[m.solucao!])
    if (
      normalizar(texto(r[m.situacao!]) ?? "") !== "finalizado" ||
      solucao === null ||
      solucao > fim
    )
      return row
    const aceite = m.aceite ? tempo(r[m.aceite]) : null
    if (aceite !== null) {
      if (aceite > fim) return row
    } else if (normalizar(texto(row[mapa.situacao!]) ?? "").includes("aceite"))
      return row
    const novo: Row = {
      ...row,
      [mapa.situacao!]: "Finalizado",
      [mapa.solucao!]: r[m.solucao!],
    }
    if (mapa.aceite && aceite !== null && aceite <= fim)
      novo[mapa.aceite] = r[m.aceite!]
    origens.add(p.competencia)
    corrigidos++
    return novo
  })
  if (corrigidos === 0) return { ...sem([]), avisos }
  const sheet: Sheet = { ...foto.sheet, rows }
  return {
    entrada: { ...foto, sheet },
    corrigidos,
    corrigidoPor: [...origens].sort(),
    avisos,
  }
}

/**
 * Métricas da foto corrigida pelas posteriores, com `original` (valor da foto como está) em cada
 * KPI, card de Situação e item de distribuição cujo valor mudou.
 */
export function metricasCorrigidas(
  foto: EntradaCompetencia,
  posteriores: EntradaCompetencia[],
  anterior?: EntradaCompetencia,
  /** A correção já feita (`corrigirDe`): evita corrigir a mesma foto de novo. */
  corrigida?: FotoCorrigida
): MetricasCorrigidas {
  const c = corrigida ?? corrigirFoto(foto, posteriores)
  const base = metricasDe(foto, anterior)
  const m = metricasDe(c.entrada, anterior)
  const kpis: KpiCorrigido[] = m.kpis.map((k) => {
    const o = base.kpis.find((x) => x.id === k.id)?.valor ?? null
    return o !== k.valor ? { ...k, original: o } : k
  })
  const rotulos = [
    ...new Set([...m.situacoes, ...base.situacoes].map((s) => s.rotulo)),
  ]
  const situacoes: ItemDistribuicaoCorrigido[] = rotulos
    .map((rotulo) => {
      const valor = m.situacoes.find((s) => s.rotulo === rotulo)?.valor ?? 0
      const o = base.situacoes.find((s) => s.rotulo === rotulo)?.valor ?? 0
      return o !== valor ? { rotulo, valor, original: o } : { rotulo, valor }
    })
    .sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))
  const distribuicoes: DistribuicaoCorrigida[] = m.distribuicoes.map((d) => {
    const bd = base.distribuicoes.find((x) => x.id === d.id)
    return {
      ...d,
      itens: d.itens.map((i) => {
        const o = bd?.itens.find((x) => x.rotulo === i.rotulo) ?? {
          finalizados: 0,
          naoFinalizados: 0,
        }
        return o.finalizados !== i.finalizados ||
          o.naoFinalizados !== i.naoFinalizados
          ? {
              ...i,
              original: {
                finalizados: o.finalizados,
                naoFinalizados: o.naoFinalizados,
              },
            }
          : i
      }),
    }
  })
  return {
    ...m,
    avisos: [...m.avisos, ...c.avisos],
    kpis,
    situacoes,
    distribuicoes,
    corrigidoPor: c.corrigidoPor,
    corrigidos: c.corrigidos,
  }
}

/**
 * Mês sem foto (D65): só o que as datas dão, tirado da foto mais atual. Entradas = abertos no
 * mês; finalizados = Situação Finalizado com Data de Solução no mês. O resto fica sem valor.
 */
export function metricasDoMesSemFoto(
  competencia: Competencia,
  fotoMaisAtual: EntradaCompetencia
): MetricasParciais {
  const motivo = `sem posição de ${rotuloCompetencia(competencia)}`
  const mes = limitesDaCompetencia(competencia)
  const noMes = (t: number | null) =>
    t !== null && t >= mes.inicio && t <= mes.fim
  const { mapa } = mapearColunas(fotoMaisAtual.sheet)
  const rows = fotoMaisAtual.sheet.rows
  const entradas = mapa.abertura
    ? rows.filter((r) => noMes(tempo(r[mapa.abertura!]))).length
    : null
  const finalizados =
    mapa.situacao && mapa.solucao
      ? rows.filter(
          (r) =>
            normalizar(texto(r[mapa.situacao!]) ?? "") === "finalizado" &&
            noMes(tempo(r[mapa.solucao!]))
        ).length
      : null
  const modelo: MetricasChamados = metricasDe(fotoMaisAtual)
  const kpis: KpiChamados[] = modelo.kpis.map((k) => {
    const valor =
      k.id === "entradas"
        ? entradas
        : k.id === "finalizados"
          ? finalizados
          : null
    return {
      ...k,
      valor,
      anterior: null,
      delta: null,
      detalhe: valor === null ? motivo : undefined,
    }
  })
  const distribuicoes = distribuicoesFinalizadosNoPeriodo(
    fotoMaisAtual,
    mes
  ).map((d) => ({
    ...d,
    itens: d.itens
      .filter((i) => i.finalizados > 0)
      .map((i) => ({
        rotulo: i.rotulo,
        finalizados: i.finalizados,
        naoFinalizados: null,
      })),
  }))
  return {
    competencia,
    semFoto: true,
    motivo,
    kpis,
    distribuicoes,
    situacoes: [],
    totalChamados: null,
    atrasoFaixas: [],
    abertosDepois: null,
    linhasSemAbertura: null,
    avisos: [motivo],
  }
}

const somar = (c: Competencia, n: number): Competencia => {
  const t = Number(c.slice(0, 4)) * 12 + Number(c.slice(5, 7)) - 1 + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`
}

/**
 * Opções do seletor "comparar com": meses anteriores à atual até o mês da abertura mais antiga
 * da foto mais atual (no máximo 24), marcados com foto ou não, mais as outras versões do mês atual.
 */
export function opcoesDeComparacao(
  fotos: { competencia: Competencia; versao: number }[],
  competenciaAtual: Competencia,
  fotoMaisAtual?: EntradaCompetencia,
  versaoAtual?: number
): { meses: OpcaoComparacao[]; outrasVersoes: number[] } {
  let limite = somar(competenciaAtual, -24)
  if (fotoMaisAtual) {
    const { mapa } = mapearColunas(fotoMaisAtual.sheet)
    if (mapa.abertura) {
      const ts = fotoMaisAtual.sheet.rows
        .map((r) => tempo(r[mapa.abertura!]))
        .filter((t): t is number => t !== null)
      if (ts.length) {
        const d = new Date(Math.min(...ts))
        const c = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
        if (c > limite) limite = c
      }
    }
  }
  const versoesDe = (c: Competencia) =>
    fotos
      .filter((f) => f.competencia === c)
      .map((f) => f.versao)
      .sort((a, b) => a - b)
  const meses: OpcaoComparacao[] = []
  for (let c = somar(competenciaAtual, -1); c >= limite; c = somar(c, -1)) {
    const versoes = versoesDe(c)
    meses.push({ competencia: c, temFoto: versoes.length > 0, versoes })
  }
  return {
    meses,
    outrasVersoes: versoesDe(competenciaAtual).filter((v) => v !== versaoAtual),
  }
}
