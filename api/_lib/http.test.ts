// @vitest-environment node
import { describe, expect, it } from "vitest"
import { ehCompetencia, ehTipo, paraMeta, validarNome } from "./http.js"

describe("validarNome (D58)", () => {
  it("vazio vira null e espaços são normalizados", () => {
    expect(validarNome(undefined)).toBeNull()
    expect(validarNome(null)).toBeNull()
    expect(validarNome("   ")).toBeNull()
    expect(validarNome("  Correção   do Líder ")).toBe("Correção do Líder")
  })
  it("recusa tipo errado, longo demais, controle e < >", () => {
    expect(() => validarNome(3)).toThrow()
    expect(() => validarNome("a".repeat(81))).toThrow()
    expect(() => validarNome("linha\u0000x")).toThrow()
    expect(() => validarNome("<b>")).toThrow()
    expect(validarNome("a".repeat(80))).toHaveLength(80)
  })
})

describe("tipo, competência e metadados", () => {
  it("ehTipo / ehCompetencia", () => {
    expect(ehTipo("chamados")).toBe(true)
    expect(ehTipo("Chamados")).toBe(false)
    expect(ehCompetencia("2026-09")).toBe(true)
    expect(ehCompetencia("2026-9")).toBe(false)
  })
  it("paraMeta inclui nome e arquivadaEm", () => {
    const base = { id: "x", tipo: "chamados", competencia: "2026-09", versao: 1, importadaEm: new Date("2026-10-14T00:00:00Z"), arquivo: "a.xlsx", linhas: 1 }
    expect(paraMeta({ ...base, nome: null, arquivadaEm: null })).toMatchObject({ nome: null, arquivadaEm: null })
    expect(paraMeta({ ...base, nome: "N", arquivadaEm: new Date("2026-10-15T00:00:00Z") })).toMatchObject({ nome: "N", arquivadaEm: "2026-10-15T00:00:00.000Z" })
  })
})
