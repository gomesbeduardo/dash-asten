import { afterEach, describe, expect, it, vi } from "vitest"
import { guardarUltimaAbertura, lerUltimaAbertura } from "./ultima-abertura"

afterEach(() => vi.restoreAllMocks())

describe("última abertura (por navegador)", () => {
  it("sem nada guardado, devolve vazio", () => {
    expect(lerUltimaAbertura()).toEqual({})
  })

  it("guarda e lê a carga e a visão; guardar uma não apaga a outra", () => {
    guardarUltimaAbertura({ cargaId: "c1" })
    guardarUltimaAbertura({ visao: "comparar" })
    expect(lerUltimaAbertura()).toEqual({ cargaId: "c1", visao: "comparar" })
  })

  it("ignora visão desconhecida e JSON quebrado", () => {
    localStorage.setItem("dash-asten:ultima-abertura", '{"cargaId":"c1","visao":"zzz"}')
    expect(lerUltimaAbertura()).toEqual({ cargaId: "c1" })
    localStorage.setItem("dash-asten:ultima-abertura", "{quebrado")
    expect(lerUltimaAbertura()).toEqual({})
  })

  it("tolera storage indisponível", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    expect(lerUltimaAbertura()).toEqual({})
    expect(() => guardarUltimaAbertura({ cargaId: "x" })).not.toThrow()
  })
})
