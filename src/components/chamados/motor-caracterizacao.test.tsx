/**
 * Caracterização do motor: os números de hoje ficam travados num arquivo de referência
 * (`__golden__/motor.txt`, gerado com o código ANTES da otimização). Qualquer mudança no
 * resultado completo de calcularMetricas, metricasCorrigidas, gerarLeituras, usePainelComparado
 * e pontosDaEvolucao derruba este teste. Regerar de propósito: vitest -u.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  calcularMetricas,
  escolherAba,
  gerarLeituras,
  metricasCorrigidas,
  type EntradaCompetencia,
} from "@/chamados"
import { ANTERIOR, usePainelComparado } from "./comparar-com"
import {
  colunasAusentes,
  filtrarSheet,
  pontosDaEvolucao,
  type FiltrosChamados,
} from "./logica"
import {
  montarCenario,
  POSICOES_TESTE,
  posicoesSinteticas,
  type Posicao,
} from "./motor-perf-dados"

/**
 * Texto canônico: chaves em ordem alfabética (a ordem em que o motor monta o objeto não conta) e as
 * linhas de cada planilha reduzidas a quantidade + impressão digital (a planilha corrigida entra inteira no hash).
 */
function canonico(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonico)
  if (v instanceof Date) return v.toISOString()
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort()
        .map((k) => [
          k,
          k === "rows" && Array.isArray(o[k])
            ? resumoDeLinhas(o[k] as unknown[])
            : canonico(o[k]),
        ])
    )
  }
  return v ?? null
}
function resumoDeLinhas(rows: unknown[]): string {
  const texto = JSON.stringify(canonico2(rows))
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0
  return `${rows.length} linhas #${h.toString(16)}`
}
const canonico2 = (rows: unknown[]) =>
  rows.map((r) => {
    const o = r as Record<string, unknown>
    return Object.keys(o).sort().map((k) => [k, o[k] instanceof Date ? (o[k] as Date).toISOString() : o[k] ?? null])
  })
const limpo = (v: unknown) => canonico(v)

const FILTROS: FiltrosChamados[] = [
  {},
  { operador: ["Operador 01", "Operador 03"] },
  { cliente: ["Cliente A"], severidade: ["Média"] },
]

const entrada = (p: Posicao, f: FiltrosChamados): EntradaCompetencia => ({
  sheet: filtrarSheet(p.sheet, f, p.competencia),
  competencia: p.competencia,
  colunasSemFiltro: colunasAusentes(p.sheet, f),
})

const ultimaVersao = (ps: Posicao[]) => {
  const m = new Map<string, Posicao>()
  for (const p of ps) m.set(p.competencia, p)
  return [...m.values()]
}

const LEGIVEIS = [
  "posicoes/f0/2026-04/metricasSemAnt",
  "posicoes/f0/2026-05/metricasSemAnt",
  "posicoes/f0/2026-10/metricasSemAnt",
  "posicoes/hook/2026-10/f0/anterior",
]

async function caracterizar(nome: string, posicoes: Posicao[]) {
  const out: Record<string, unknown> = {}
  const meses = ultimaVersao(posicoes)
  const cenario = await montarCenario(posicoes)

  FILTROS.forEach((f, fi) => {
    meses.forEach((p, i) => {
      const atual = entrada(p, f)
      const ant = i > 0 ? entrada(meses[i - 1], f) : undefined
      const posteriores = meses
        .slice(i + 1)
        .map((q): EntradaCompetencia => ({ sheet: q.sheet, competencia: q.competencia }))
      const k = `${nome}/f${fi}/${p.competencia}`
      out[`${k}/metricas`] = limpo(calcularMetricas(atual, ant))
      out[`${k}/metricasSemAnt`] = limpo(calcularMetricas(atual))
      out[`${k}/corrigidas`] = limpo(metricasCorrigidas(atual, posteriores, ant))
      out[`${k}/leituras`] = limpo(gerarLeituras(atual, ant))
    })
    for (const fim of [undefined, meses[meses.length - 2]?.competencia])
      out[`${nome}/f${fi}/evolucao/${fim ?? "ultima"}`] = limpo(
        pontosDaEvolucao(cenario.proprias, 6, f, fim)
      )
  })

  // o hook do Painel: para cada carga aberta, filtro e escolha do seletor
  const abertas = [
    ...new Set([meses[meses.length - 1], meses[Math.floor(meses.length / 2)]]),
  ]
  for (const p of abertas) {
    const versoes = posicoes.filter((q) => q.competencia === p.competencia)
    const carga = await cenario.abrir(p.competencia, versoes.length)
    const sheet = escolherAba(carga.workbook)
    const escolhas = [
      ANTERIOR,
      ...meses.map((m) => `mes:${m.competencia}`),
      "mes:2025-12",
      ...versoes.map((_, v) => `versao:${v + 1}`),
    ]
    for (const [fi, filtros] of FILTROS.entries()) {
      const { result, rerender } = renderHook(
        (props: { escolha: string }) =>
          usePainelComparado({
            carga,
            historico: cenario.historico,
            obterCarga: cenario.obterCarga,
            sheet,
            filtros,
            escolha: props.escolha,
          }),
        { initialProps: { escolha: ANTERIOR } }
      )
      for (const escolha of escolhas) {
        rerender({ escolha })
        await waitFor(() => expect(result.current).not.toBeNull())
        out[`${nome}/hook/${p.competencia}/f${fi}/${escolha}`] = limpo(
          result.current
        )
      }
    }
  }
  return out
}

describe("caracterização do motor (números idênticos antes e depois)", () => {
  it("4 posições de teste e conjunto sintético batem com a referência", async () => {
    const atual = {
      ...(await caracterizar("posicoes", POSICOES_TESTE)),
      ...(await caracterizar("sintetico", posicoesSinteticas(6, 30))),
    }
    // referência compacta: uma linha "caso sha256" por caso + alguns casos em texto legível
    const sha = async (t: string) =>
      [
        ...new Uint8Array(
          await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))
        ),
      ]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    const chaves = Object.keys(atual).sort()
    const linhas = await Promise.all(
      chaves.map(async (k) => `${k} ${await sha(JSON.stringify(atual[k]))}`)
    )
    const legiveis = LEGIVEIS.map(
      (k) => `${k} = ${JSON.stringify(atual[k], null, 1)}`
    )
    await expect(
      [...linhas, "", "# casos legíveis (para o diff mostrar o que mudou)", ...legiveis].join("\n") + "\n"
    ).toMatchFileSnapshot("./__golden__/motor.txt")
  }, 60_000)
})
