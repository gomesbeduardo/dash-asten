import { act, fireEvent, renderHook } from "@testing-library/react"
import type { RefObject } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useBarVisibility } from "./useBarVisibility"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

const mover = (clientY: number) =>
  act(() => void fireEvent.mouseMove(document, { clientY }))
const avancar = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

function barraComAltura(altura: number) {
  const el = document.createElement("header")
  el.innerHTML = '<button id="dentro">x</button>'
  document.body.appendChild(el)
  el.getBoundingClientRect = () => ({ height: altura }) as DOMRect
  return { current: el } as RefObject<HTMLElement | null>
}

describe("useBarVisibility", () => {
  it("aparece ao montar e some após o delay (padrão 3 s)", () => {
    const { result } = renderHook(() => useBarVisibility({ hold: false }))
    expect(result.current.visible).toBe(true)
    avancar(2900)
    expect(result.current.visible).toBe(true)
    avancar(200)
    expect(result.current.visible).toBe(false)
  })

  it("mouse fora da região da barra não a mostra", () => {
    const ref = barraComAltura(120)
    const { result } = renderHook(() =>
      useBarVisibility({ hold: false, barRef: ref })
    )
    avancar(3500)
    mover(500)
    expect(result.current.visible).toBe(false)
  })

  it("mouse na região (altura medida) mostra na hora, fica e some ao sair após o atraso curto", () => {
    const ref = barraComAltura(120)
    const { result } = renderHook(() =>
      useBarVisibility({ hold: false, barRef: ref })
    )
    avancar(3500)
    mover(100)
    expect(result.current.visible).toBe(true)
    avancar(5000)
    expect(result.current.visible).toBe(true)
    mover(500)
    avancar(700)
    expect(result.current.visible).toBe(true)
    avancar(200)
    expect(result.current.visible).toBe(false)
  })

  it("sem ref/altura 0 usa 80 px; limiar de 8 px no topo também conta", () => {
    const ref = barraComAltura(0)
    const { result } = renderHook(() =>
      useBarVisibility({ hold: false, barRef: ref })
    )
    avancar(3500)
    mover(81)
    expect(result.current.visible).toBe(false)
    mover(70)
    expect(result.current.visible).toBe(true)
    mover(500)
    avancar(900)
    expect(result.current.visible).toBe(false)
    const ref2 = barraComAltura(2)
    const r2 = renderHook(() => useBarVisibility({ hold: false, barRef: ref2 }))
    avancar(3500)
    mover(8)
    expect(r2.result.current.visible).toBe(true)
  })

  it("tecla H (toggle) fixa a barra ignorando mouse e timer; de novo solta e some", () => {
    const ref = barraComAltura(120)
    const { result } = renderHook(() =>
      useBarVisibility({ hold: false, barRef: ref })
    )
    act(() => result.current.toggle())
    expect(result.current.fixa).toBe(true)
    avancar(10000)
    mover(500)
    expect(result.current.visible).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.fixa).toBe(false)
    expect(result.current.visible).toBe(true)
    avancar(900)
    expect(result.current.visible).toBe(false)
  })

  it("soltar a fixa com o mouse na região mantém visível", () => {
    const ref = barraComAltura(120)
    const { result } = renderHook(() =>
      useBarVisibility({ hold: false, barRef: ref })
    )
    avancar(3500)
    act(() => result.current.toggle())
    mover(50)
    act(() => result.current.toggle())
    avancar(5000)
    expect(result.current.visible).toBe(true)
  })

  it("foco dentro da barra mostra; foco fora não", () => {
    const ref = barraComAltura(120)
    const { result } = renderHook(() =>
      useBarVisibility({ hold: false, barRef: ref })
    )
    avancar(3500)
    act(() => void fireEvent.focusIn(document.body))
    expect(result.current.visible).toBe(false)
    act(() => void fireEvent.focusIn(document.getElementById("dentro")!))
    expect(result.current.visible).toBe(true)
  })

  it("não some enquanto um menu/painel está aberto (hold)", () => {
    const { result, rerender } = renderHook(
      ({ hold }) => useBarVisibility({ hold }),
      { initialProps: { hold: true } }
    )
    avancar(10000)
    expect(result.current.visible).toBe(true)
    rerender({ hold: false })
    avancar(3100)
    expect(result.current.visible).toBe(false)
  })

  it("mouse que sai da janela estando na região não prende a barra", () => {
    const ref = barraComAltura(120)
    const { result } = renderHook(() =>
      useBarVisibility({ hold: false, barRef: ref })
    )
    avancar(3500)
    mover(50)
    expect(result.current.visible).toBe(true)
    act(() => void fireEvent.mouseLeave(document.documentElement))
    avancar(900)
    expect(result.current.visible).toBe(false)
  })

  it("hold que solta com o mouse fora da região some após o atraso curto", () => {
    const ref = barraComAltura(120)
    const { result, rerender } = renderHook(
      ({ hold }) => useBarVisibility({ hold, barRef: ref }),
      { initialProps: { hold: false } }
    )
    avancar(3500)
    mover(50)
    rerender({ hold: true })
    mover(600)
    avancar(5000)
    expect(result.current.visible).toBe(true)
    rerender({ hold: false })
    avancar(900)
    expect(result.current.visible).toBe(false)
  })
})

describe("useBarVisibility ao fechar menu", () => {
  it("foco devolvido ao botão da barra ao fechar não a mantém por 3 s", () => {
    const ref = barraComAltura(120)
    const { result, rerender } = renderHook(
      ({ hold }) => useBarVisibility({ hold, barRef: ref }),
      { initialProps: { hold: false } }
    )
    avancar(3500)
    mover(600)
    rerender({ hold: true })
    avancar(1000)
    rerender({ hold: false })
    act(() => void fireEvent.focusIn(document.getElementById("dentro")!))
    avancar(900)
    expect(result.current.visible).toBe(false)
  })
})
