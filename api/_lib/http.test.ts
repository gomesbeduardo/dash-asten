// @vitest-environment node
import { describe, expect, it } from "vitest"
import { gunzipSync } from "node:zlib"
import { adminAutorizado, ehCompetencia, ehTipo, jsonComprimido, paraMeta, validarNome } from "./http.js"

describe("jsonComprimido (carga grande cabe no limite de resposta)", () => {
  const corpo = { workbook: { sheets: [{ rows: Array.from({ length: 50 }, (_, i) => ({ a: i })) }] } }
  const pedido = (aceita?: string) => new Request("https://x.test/api/cargas/x", { headers: aceita ? { "Accept-Encoding": aceita } : {} })

  it("com Accept-Encoding gzip devolve o JSON comprimido, com Content-Encoding e Vary", async () => {
    const r = jsonComprimido(corpo, pedido("gzip, deflate, br"), { "Cache-Control": "private" })
    expect(r.headers.get("Content-Encoding")).toBe("gzip")
    expect(r.headers.get("Vary")).toBe("Accept-Encoding")
    expect(r.headers.get("Cache-Control")).toBe("private")
    const texto = gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8")
    expect(JSON.parse(texto)).toEqual(corpo)
  })

  it("sem gzip no Accept-Encoding devolve JSON puro", async () => {
    const r = jsonComprimido(corpo, pedido())
    expect(r.headers.get("Content-Encoding")).toBeNull()
    expect(await r.json()).toEqual(corpo)
  })
})

describe("adminAutorizado (exclusão definitiva)", () => {
  const com = (token?: string) => new Request("https://x.test/", { headers: token ? { "X-Admin-Token": token } : {} })
  it("sem ADMIN_TOKEN configurado a exclusão fica liberada (fase de testes); com ele, só o cabeçalho igual", () => {
    expect(adminAutorizado(com(), undefined)).toBe(true)
    expect(adminAutorizado(com("qualquer"), "")).toBe(true)
    expect(adminAutorizado(com(), "segredo-32-caracteres-xxxxxxxxxxx")).toBe(false)
    expect(adminAutorizado(com("errado"), "segredo-32-caracteres-xxxxxxxxxxx")).toBe(false)
    expect(adminAutorizado(com("segredo-32-caracteres-xxxxxxxxxxx"), "segredo-32-caracteres-xxxxxxxxxxx")).toBe(true)
  })
  it("token curto demais no ambiente não libera nada (fail-closed: exige 24+ caracteres)", () => {
    expect(adminAutorizado(com("curto"), "curto")).toBe(false)
    expect(adminAutorizado(com(), "curto")).toBe(false)
  })
})

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
