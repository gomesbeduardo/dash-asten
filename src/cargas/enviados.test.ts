import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  enviadosVisiveis,
  foiEnviada,
  limparEnviados,
  registrarEnvio,
  tirarDaLista,
} from "./enviados"
import type { CargaMeta } from "./types"

const meta = (id: string): CargaMeta => ({
  id,
  tipo: "outro",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-01T12:00:00.000Z",
  arquivo: `${id}.xlsx`,
  linhas: 1, nome: null, arquivadaEm: null,
})

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe("cargas enviadas por este navegador", () => {
  it("registra o envio e mostra só o que ainda existe no histórico", () => {
    registrarEnvio("a")
    registrarEnvio("fantasma")
    expect(foiEnviada("a")).toBe(true)
    expect(foiEnviada("b")).toBe(false)
    expect(enviadosVisiveis([meta("a"), meta("b")]).map((m) => m.id)).toEqual([
      "a",
    ])
  })

  it("limpar esconde da lista de enviados, mas continua marcada como enviada", () => {
    registrarEnvio("a")
    registrarEnvio("b")
    limparEnviados(["a", "b"])
    expect(enviadosVisiveis([meta("a"), meta("b")])).toEqual([])
    expect(foiEnviada("a")).toBe(true)
  })

  it("tirar da lista afeta só aquela carga", () => {
    registrarEnvio("a")
    registrarEnvio("b")
    tirarDaLista("a")
    expect(enviadosVisiveis([meta("a"), meta("b")]).map((m) => m.id)).toEqual([
      "b",
    ])
  })

  it("sobrevive a dados corrompidos", () => {
    localStorage.setItem("dash-asten:enviados:v1", "{quebrado")
    expect(enviadosVisiveis([meta("a")])).toEqual([])
    registrarEnvio("a")
    expect(foiEnviada("a")).toBe(true)
  })

  it("sem localStorage nada quebra e Enviados fica vazio", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    expect(() => registrarEnvio("a")).not.toThrow()
    expect(() => limparEnviados(["a"])).not.toThrow()
    expect(enviadosVisiveis([meta("a")])).toEqual([])
    expect(foiEnviada("a")).toBe(false)
  })
})
