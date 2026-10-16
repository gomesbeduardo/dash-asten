/**
 * Contagem de chamadas ao motor: a montagem do Painel calcula cada foto (métricas e correção) no
 * máximo uma vez, e trocar o "Comparar com" não refaz nada do mês atual.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { registrarTiposDoApp } from "@/app/bootstrap"
import * as fotos from "@/chamados/fotos"
import * as metricas from "@/chamados/metricas"
import type { EntradaCompetencia } from "@/chamados"
import { montarCenario, POSICOES_TESTE } from "./motor-perf-dados"
import { PainelChamados } from "./PainelChamados"

beforeEach(() => {
  registrarTiposDoApp()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})
afterEach(() => vi.restoreAllMocks())

const entradas = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((c) => c[0] as EntradaCompetencia)
const repetidas = (xs: unknown[]) => xs.length - new Set(xs).size

async function abrirPainel() {
  const cenario = await montarCenario(POSICOES_TESTE)
  const carga = await cenario.abrir("2026-10", 1)
  const calc = vi.spyOn(metricas, "calcularMetricas")
  const corr = vi.spyOn(fotos, "corrigirFoto")
  render(
    <PainelChamados
      carga={carga}
      historico={cenario.historico}
      obterCarga={cenario.obterCarga}
      entrada={false}
    />
  )
  await screen.findByRole("combobox", { name: "Comparar com" })
  await screen.findByRole("article", { name: "Entradas no mês" })
  return { calc, corr, carga }
}

describe("contagem de chamadas ao motor", () => {
  it("a montagem do Painel calcula cada foto uma única vez", async () => {
    const { calc, corr } = await abrirPainel()
    console.info(`CONTAGEM montagem: calcularMetricas=${calc.mock.calls.length} corrigirFoto=${corr.mock.calls.length}`)
    // nenhuma entrada passa duas vezes pelo cálculo ou pela correção
    expect(repetidas(entradas(calc)), "entrada repetida em calcularMetricas").toBe(0)
    expect(repetidas(entradas(corr)), "foto repetida em corrigirFoto").toBe(0)
    // painel + evolução, no máximo: abr, mai e out filtrados, mais abr e mai corrigidos (out não tem posterior)
    expect(calc.mock.calls.length).toBeLessThanOrEqual(5)
    expect(corr.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it("trocar o Comparar com não recalcula o mês atual", async () => {
    const user = userEvent.setup()
    const { calc, corr, carga } = await abrirPainel()
    calc.mockClear()
    corr.mockClear()
    await user.click(screen.getByRole("combobox", { name: "Comparar com" }))
    await user.click(await screen.findByRole("option", { name: "abr/26" }))
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Entradas no mês" })).getByRole("group", {
          name: /em relação a abr\/26/,
        })
      ).toBeInTheDocument()
    )
    console.info(`CONTAGEM troca: calcularMetricas=${calc.mock.calls.length} corrigirFoto=${corr.mock.calls.length}`)
    const doMesAtual = (xs: EntradaCompetencia[]) =>
      xs.filter((e) => e.competencia === carga.competencia)
    expect(doMesAtual(entradas(calc)).length).toBe(0)
    expect(doMesAtual(entradas(corr)).length).toBe(0)
    // só o lado comparado (abr/26 e a sua correção)
    expect(repetidas(entradas(calc))).toBe(0)
    expect(calc.mock.calls.length).toBeLessThanOrEqual(2)
    expect(corr.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
