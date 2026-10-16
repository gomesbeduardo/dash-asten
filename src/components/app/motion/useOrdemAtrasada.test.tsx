import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useOrdemAtrasada } from "./useOrdemAtrasada"

const reduzido = vi.hoisted(() => ({ valor: false }))
vi.mock("motion/react", () => ({ useReducedMotion: () => reduzido.valor }))

type L = { rotulo: string; v: number }
const linhas = (...xs: [string, number][]) =>
  xs.map(([rotulo, v]) => ({ rotulo, v }))
const useOrdem = (itens: L[]) => useOrdemAtrasada(itens, (l) => l.rotulo)
const rotulos = (ls: L[]) => ls.map((l) => l.rotulo)

describe("useOrdemAtrasada", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    reduzido.valor = false
  })
  afterEach(() => vi.useRealTimers())

  it("na primeira vez usa a ordem recebida", () => {
    const { result } = renderHook(useOrdem, {
      initialProps: linhas(["A", 3], ["B", 2]),
    })
    expect(rotulos(result.current)).toEqual(["A", "B"])
  })

  it("mantém a ordem antiga com os valores novos até 600 ms e só então reordena", () => {
    const { result, rerender } = renderHook(useOrdem, {
      initialProps: linhas(["A", 3], ["B", 2], ["C", 1]),
    })
    rerender(linhas(["C", 9], ["A", 5], ["B", 4]))
    expect(rotulos(result.current)).toEqual(["A", "B", "C"])
    expect(result.current.map((l) => l.v)).toEqual([5, 4, 9])
    act(() => vi.advanceTimersByTime(599))
    expect(rotulos(result.current)).toEqual(["A", "B", "C"])
    act(() => vi.advanceTimersByTime(1))
    expect(rotulos(result.current)).toEqual(["C", "A", "B"])
  })

  it("a linha que sai some na hora e a que entra fica no fim até reordenar", () => {
    const { result, rerender } = renderHook(useOrdem, {
      initialProps: linhas(["A", 3], ["B", 2], ["C", 1]),
    })
    rerender(linhas(["D", 8], ["C", 4], ["A", 2]))
    expect(rotulos(result.current)).toEqual(["A", "C", "D"])
    act(() => vi.advanceTimersByTime(600))
    expect(rotulos(result.current)).toEqual(["D", "C", "A"])
  })

  it("uma troca de ordem no meio da espera recomeça a contagem, sem sair da ordem que está na tela", () => {
    const { result, rerender } = renderHook(useOrdem, {
      initialProps: linhas(["A", 3], ["B", 2], ["C", 1]),
    })
    rerender(linhas(["C", 5], ["A", 4], ["B", 1]))
    act(() => vi.advanceTimersByTime(300))
    rerender(linhas(["B", 9], ["C", 5], ["A", 1]))
    expect(rotulos(result.current)).toEqual(["A", "B", "C"])
    act(() => vi.advanceTimersByTime(599))
    expect(rotulos(result.current)).toEqual(["A", "B", "C"])
    act(() => vi.advanceTimersByTime(1))
    expect(rotulos(result.current)).toEqual(["B", "C", "A"])
  })

  it("com movimento reduzido reordena na hora", () => {
    reduzido.valor = true
    const { result, rerender } = renderHook(useOrdem, {
      initialProps: linhas(["A", 3], ["B", 2]),
    })
    rerender(linhas(["B", 5], ["A", 1]))
    expect(rotulos(result.current)).toEqual(["B", "A"])
  })
})
