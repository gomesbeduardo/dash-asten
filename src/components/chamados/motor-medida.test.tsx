/**
 * Medida simples de tempo do motor (sem navegador): monta o `usePainelComparado`, troca o
 * "Comparar com" e calcula a evolução, com as 4 posições de teste e com ~3.000 linhas.
 * Só imprime os tempos (performance.now); não falha por tempo.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { escolherAba } from "@/chamados"
import { ANTERIOR, usePainelComparado } from "./comparar-com"
import { pontosDaEvolucao } from "./logica"
import {
  montarCenario,
  POSICOES_TESTE,
  posicoesSinteticas,
  type Posicao,
} from "./motor-perf-dados"

async function medir(posicoes: Posicao[], trocas: string[]) {
  const cenario = await montarCenario(posicoes)
  const ult = posicoes[posicoes.length - 1]
  const carga = await cenario.abrir(ult.competencia, 1)
  const sheet = escolherAba(carga.workbook)
  const filtros = {}
  const t0 = performance.now()
  const { result, rerender } = renderHook(
    (p: { escolha: string }) =>
      usePainelComparado({
        carga,
        historico: cenario.historico,
        obterCarga: cenario.obterCarga,
        sheet,
        filtros,
        escolha: p.escolha,
      }),
    { initialProps: { escolha: ANTERIOR } }
  )
  await waitFor(() => expect(result.current).not.toBeNull())
  const montagem = performance.now() - t0
  const t1 = performance.now()
  const evo = pontosDaEvolucao(cenario.proprias, 6, filtros, carga.competencia)
  const evolucao = performance.now() - t1
  expect(evo.pontos.length).toBeGreaterThan(0)
  const t2 = performance.now()
  for (const escolha of trocas) rerender({ escolha })
  const troca = (performance.now() - t2) / trocas.length
  return { montagem, evolucao, troca }
}

const fmt = (n: number) => n.toFixed(1)

describe("medida de tempo do motor", () => {
  it.each([
    ["4 posições de teste", () => POSICOES_TESTE, ["mes:2026-04", "mes:2026-05", "mes:2026-10", "mes:2026-07"]],
    ["~3.000 linhas", () => posicoesSinteticas(6, 500), ["mes:2026-01", "mes:2026-03", "mes:2026-04", "mes:2026-02"]],
  ])("%s", async (nome, dados, trocas) => {
    const rodadas: Awaited<ReturnType<typeof medir>>[] = []
    for (let i = 0; i < 3; i++) rodadas.push(await medir(dados(), trocas))
    const melhor = (k: "montagem" | "evolucao" | "troca") =>
      fmt(Math.min(...rodadas.map((r) => r[k])))
    console.info(
      `MEDIDA ${nome}: montagem=${melhor("montagem")}ms evolucao=${melhor("evolucao")}ms troca(media por troca)=${melhor("troca")}ms (melhor de 3, dados novos a cada rodada)`
    )
  }, 60_000)
})
