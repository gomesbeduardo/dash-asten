import { act, fireEvent, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useBarVisibility } from "./useBarVisibility"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useBarVisibility", () => {
  it("começa visível e some após 3 s sem atividade", () => {
    const { result } = renderHook(() => useBarVisibility({ hold: false }))
    expect(result.current.visible).toBe(true)
    act(() => void vi.advanceTimersByTime(2900))
    expect(result.current.visible).toBe(true)
    act(() => void vi.advanceTimersByTime(200))
    expect(result.current.visible).toBe(false)
  })

  it("reaparece ao mover o mouse e some de novo depois", () => {
    const { result } = renderHook(() => useBarVisibility({ hold: false }))
    act(() => void vi.advanceTimersByTime(3500))
    expect(result.current.visible).toBe(false)
    act(() => void fireEvent.mouseMove(document))
    expect(result.current.visible).toBe(true)
    act(() => void vi.advanceTimersByTime(3100))
    expect(result.current.visible).toBe(false)
  })

  it("reaparece ao focar por teclado", () => {
    const { result } = renderHook(() => useBarVisibility({ hold: false }))
    act(() => void vi.advanceTimersByTime(3500))
    act(() => void fireEvent.focusIn(document.body))
    expect(result.current.visible).toBe(true)
  })

  it("não some enquanto um menu/painel está aberto (hold)", () => {
    const { result, rerender } = renderHook(
      ({ hold }) => useBarVisibility({ hold }),
      { initialProps: { hold: true } }
    )
    act(() => void vi.advanceTimersByTime(10000))
    expect(result.current.visible).toBe(true)
    rerender({ hold: false })
    act(() => void vi.advanceTimersByTime(3100))
    expect(result.current.visible).toBe(false)
  })

  it("toggle (tecla H) alterna e mantém escondida sem timer", () => {
    const { result } = renderHook(() => useBarVisibility({ hold: false }))
    act(() => result.current.toggle())
    expect(result.current.visible).toBe(false)
    act(() => result.current.toggle())
    expect(result.current.visible).toBe(true)
  })
})
