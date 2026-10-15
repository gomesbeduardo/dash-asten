import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { comAtraso } from "./comAtraso"
import { criarRepositorioMemoria } from "./repositorio-memoria"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("comAtraso", () => {
  it("atrasa listar e obter pelo valor dado", async () => {
    const base = criarRepositorioMemoria()
    const repo = comAtraso(base, 500)
    let pronto = false
    void repo.listar().then(() => (pronto = true))
    await vi.advanceTimersByTimeAsync(499)
    expect(pronto).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(pronto).toBe(true)

    let obtido: unknown = "pendente"
    void repo.obter("nada").then((c) => (obtido = c))
    await vi.advanceTimersByTimeAsync(499)
    expect(obtido).toBe("pendente")
    await vi.advanceTimersByTimeAsync(1)
    expect(obtido).toBeNull()
  })

  it("com 0, ausente ou inválido devolve o próprio repositório", () => {
    const base = criarRepositorioMemoria()
    expect(comAtraso(base, 0)).toBe(base)
    expect(comAtraso(base, undefined)).toBe(base)
    expect(comAtraso(base, Number.NaN)).toBe(base)
  })
})
