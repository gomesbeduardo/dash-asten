import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useEntrada } from "./useEntrada"

describe("useEntrada", () => {
  it("mantém o valor da montagem quando o prop vira false", () => {
    const { result, rerender } = renderHook(({ e }) => useEntrada(e), {
      initialProps: { e: true },
    })
    expect(result.current).toBe(true)
    rerender({ e: false })
    expect(result.current).toBe(true)
  })

  it("mantém false quando monta com false e o prop vira true", () => {
    const { result, rerender } = renderHook(({ e }) => useEntrada(e), {
      initialProps: { e: false },
    })
    rerender({ e: true })
    expect(result.current).toBe(false)
  })
})
