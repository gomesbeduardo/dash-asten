/**
 * Medição do motor com 12 posições sintéticas (nov/25 a out/26), sem navegador (D74).
 * Pulado por padrão. Gere os dados antes: `node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas 3000`
 * (e 20000), depois rode `BENCH=1 npx vitest run --maxWorkers=2 src/components/chamados/bench-12-posicoes.test.tsx`.
 * Só imprime os tempos (performance.now, melhor de 3, dados recarregados a cada rodada); não falha por tempo.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { escolherAba } from "@/chamados"
import type { Sheet } from "@/core"
import { ANTERIOR, usePainelComparado } from "./comparar-com"
import { pontosDaEvolucao } from "./logica"
import { montarCenario } from "./motor-perf-dados"

// Lê os JSON gerados sob demanda (não entram no bundle de testes se a pasta não existe).
const ARQUIVOS = import.meta.glob("/docs/exemplos/bench/*/api/cargas/*.json", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>
const VOLUMES = [3000, 20000]
const TROCAS = ["mes:2025-11", "mes:2026-03", "mes:2026-07"]

/** Lê as 12 posições geradas e devolve as datas como Date (o JSON da API traz ISO). */
async function carregar(linhas: number) {
  const caminhos = Object.keys(ARQUIVOS)
    .filter((c) => c.includes(`/bench/${linhas}/api/cargas/`))
    .sort()
  if (caminhos.length !== 12)
    throw new Error(
      `Gere os dados antes: node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas ${linhas}`
    )
  const posicoes = []
  for (const c of caminhos) {
    const carga = JSON.parse(await ARQUIVOS[c]()) as {
      competencia: string
      workbook: { sheets: Sheet[] }
    }
    const sheet = carga.workbook.sheets[0]
    const datas = sheet.columns.filter((x) => x.type === "date").map((x) => x.key)
    for (const r of sheet.rows)
      for (const k of datas)
        if (typeof r[k] === "string") r[k] = new Date(r[k] as string)
    posicoes.push({ competencia: carga.competencia, sheet })
  }
  return posicoes
}

async function medir(linhas: number) {
  const posicoes = await carregar(linhas)
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
  await waitFor(() => expect(result.current).not.toBeNull(), { timeout: 60_000 })
  const montagem = performance.now() - t0
  const t1 = performance.now()
  const evo = pontosDaEvolucao(cenario.proprias, 6, filtros, carga.competencia)
  const evolucao = performance.now() - t1
  expect(evo.pontos.length).toBeGreaterThan(0)
  const trocas: number[] = []
  for (const escolha of TROCAS) {
    const t = performance.now()
    rerender({ escolha })
    trocas.push(performance.now() - t)
  }
  return { montagem, evolucao, trocas, linhasUltima: ult.sheet.rows.length }
}

describe.skipIf(!import.meta.env.BENCH)("bench motor, 12 posições", () => {
  it.each(VOLUMES)("%i linhas", async (linhas) => {
    const rodadas: Awaited<ReturnType<typeof medir>>[] = []
    for (let i = 0; i < 3; i++) rodadas.push(await medir(linhas))
    const mn = (xs: number[]) => Math.min(...xs).toFixed(1)
    console.info(
      `BENCH motor ${linhas} (última posição: ${rodadas[0].linhasUltima} linhas): ` +
        `montagem=${mn(rodadas.map((r) => r.montagem))}ms ` +
        `evolucao=${mn(rodadas.map((r) => r.evolucao))}ms ` +
        TROCAS.map((t, i) => `troca[${t}]=${mn(rodadas.map((r) => r.trocas[i]))}ms`).join(" ") +
        ` (melhor de 3; todas: ${rodadas.map((r) => `${r.montagem.toFixed(0)}/${r.evolucao.toFixed(0)}/${r.trocas.map((x) => x.toFixed(0)).join(",")}`).join(" | ")})`
    )
  }, 600_000)
})
