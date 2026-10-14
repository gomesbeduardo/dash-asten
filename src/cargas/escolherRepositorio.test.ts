import { afterEach, describe, expect, it, vi } from "vitest"
import { criarRepositorioPadrao } from "./escolherRepositorio"

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("criarRepositorioPadrao", () => {
  it("VITE_REPOSITORIO=api usa a API (sem limparTudo)", () => {
    vi.stubEnv("VITE_REPOSITORIO", "api")
    expect(criarRepositorioPadrao().limparTudo).toBeUndefined()
  })
  it("ausente ou outro valor usa IndexedDB (com limparTudo)", () => {
    vi.stubEnv("VITE_REPOSITORIO", "")
    expect(criarRepositorioPadrao().limparTudo).toBeTypeOf("function")
    vi.stubEnv("VITE_REPOSITORIO", "banana")
    expect(criarRepositorioPadrao().limparTudo).toBeTypeOf("function")
  })
})
