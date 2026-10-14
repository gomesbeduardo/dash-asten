import { afterEach, describe, expect, it, vi } from "vitest"
import { loginEmUso } from "./login-em-uso"

afterEach(() => vi.unstubAllEnvs())

describe("loginEmUso", () => {
  it("só com a API e o login não desativado", () => {
    vi.stubEnv("VITE_REPOSITORIO", "api")
    vi.stubEnv("VITE_LOGIN", "")
    expect(loginEmUso()).toBe(true)
    vi.stubEnv("VITE_LOGIN", "desativado")
    expect(loginEmUso()).toBe(false)
    vi.stubEnv("VITE_LOGIN", "")
    vi.stubEnv("VITE_REPOSITORIO", "local")
    expect(loginEmUso()).toBe(false)
  })
})
