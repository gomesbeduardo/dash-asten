// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { caminhoDa, DELETE, GET, PATCH, POST } from "./rota.js"

const req = (url: string, init?: RequestInit) => new Request(`https://x.test${url}`, init)

describe("roteador da API", () => {
  it("lê o caminho reescrito (?r=) e o pathname direto", () => {
    expect(caminhoDa(req("/api/rota?r=cargas/abc"))).toBe("cargas/abc")
    expect(caminhoDa(req("/api/cargas/abc"))).toBe("cargas/abc")
    expect(caminhoDa(req("/api/rota?r=cargas%2Fabc"))).toBe("cargas/abc")
    expect(caminhoDa(req("/api/rota?r=%E0%A4%A"))).toBe("")
  })

  it("rotas privadas sem sessão → 401, antes de tocar o banco", async () => {
    expect((await GET(req("/api/rota?r=cargas"))).status).toBe(401)
    expect((await GET(req("/api/rota?r=cargas/abc"))).status).toBe(401)
    expect((await DELETE(req("/api/rota?r=cargas/abc"))).status).toBe(401)
    expect((await GET(req("/api/rota?r=sessao"))).status).toBe(401)
  })

  it("com LOGIN_DESATIVADO=1, rotas privadas passam sem cookie (login desligado no MVP)", async () => {
    vi.stubEnv("LOGIN_DESATIVADO", "1")
    try {
      const r = await GET(req("/api/rota?r=sessao"))
      expect(r.status).toBe(200)
      // id inválido → 404 do handler, ou seja, passou pela sessão sem tocar o banco
      expect((await GET(req("/api/rota?r=cargas/nao-e-id!"))).status).toBe(404)
    } finally {
      vi.unstubAllEnvs()
    }
    expect((await GET(req("/api/rota?r=sessao"))).status).toBe(401)
  })

  it("LOGIN_DESATIVADO com outro valor não desliga o login", async () => {
    vi.stubEnv("LOGIN_DESATIVADO", "true")
    try {
      expect((await GET(req("/api/rota?r=cargas"))).status).toBe(401)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it("logout é público e apaga o cookie", async () => {
    const r = await POST(req("/api/rota?r=logout", { method: "POST" }))
    expect(r.status).toBe(204)
    expect(r.headers.get("set-cookie")).toMatch(/asten_sessao=;/)
  })

  it("caminho desconhecido → 404; método errado → 405 com Allow", async () => {
    expect((await GET(req("/api/rota?r=nada"))).status).toBe(404)
    expect((await GET(req("/api/rota?r=cargas/a/b"))).status).toBe(404)
    const r = await GET(req("/api/rota?r=login"))
    expect(r.status).toBe(405)
    expect(r.headers.get("allow")).toBe("POST")
    expect((await DELETE(req("/api/rota?r=cargas"))).status).toBe(405)
  })
})

describe("PATCH /api/cargas/:id (D58)", () => {
  const ID = "tz4a98xxat96iws9zmbrgj3a" // CUID2 válido; nada chega ao banco nestes casos
  const patch = (corpo: unknown) =>
    PATCH(req(`/api/rota?r=cargas/${ID}`, { method: "PATCH", body: JSON.stringify(corpo), headers: { "Content-Type": "application/json" } }))

  it("sem sessão → 401", async () => {
    expect((await patch({ nome: "x" })).status).toBe(401)
  })

  it("valida o corpo antes do banco (login desligado)", async () => {
    vi.stubEnv("LOGIN_DESATIVADO", "1")
    try {
      expect((await patch({})).status).toBe(400)
      expect((await patch({ outro: 1 })).status).toBe(400)
      expect((await patch({ tipo: "Chamados!" })).status).toBe(400)
      expect((await patch({ competencia: "2026-13" })).status).toBe(400)
      expect((await patch({ arquivada: "sim" })).status).toBe(400)
      expect((await patch({ nome: "a".repeat(81) })).status).toBe(400)
      expect((await patch({ nome: "<script>" })).status).toBe(400)
      expect((await PATCH(req("/api/rota?r=cargas/nao-e-id", { method: "PATCH", body: "{}" }))).status).toBe(404)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe("DELETE /api/cargas/:id (D66: excluir = arquivar)", () => {
  const ID = "tz4a98xxat96iws9zmbrgj3a"
  const del = (headers?: Record<string, string>) => DELETE(req(`/api/rota?r=cargas/${ID}`, { method: "DELETE", headers }))

  it("sem ADMIN_TOKEN configurado a exclusão fica liberada (fase de testes): passa da checagem e chega à validação do id", async () => {
    vi.stubEnv("LOGIN_DESATIVADO", "1")
    try {
      const r = await DELETE(req("/api/rota?r=cargas/nao-e-id", { method: "DELETE" }))
      expect(r.status).toBe(404)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it("com ADMIN_TOKEN, exige o cabeçalho X-Admin-Token igual; id inválido com token certo → 404", async () => {
    vi.stubEnv("LOGIN_DESATIVADO", "1")
    vi.stubEnv("ADMIN_TOKEN", "segredo-de-teste-com-32-caracteres!!")
    try {
      expect((await del()).status).toBe(403)
      expect((await del({ "X-Admin-Token": "errado" })).status).toBe(403)
      const r = await DELETE(req("/api/rota?r=cargas/nao-e-id", { method: "DELETE", headers: { "X-Admin-Token": "segredo-de-teste-com-32-caracteres!!" } }))
      expect(r.status).toBe(404)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe("POST /api/cargas: mesRef opcional (D63)", () => {
  const corpo = (extra: Record<string, unknown>) =>
    JSON.stringify({ tipo: "chamados", competencia: "2026-10", arquivo: "a.xlsx", workbook: { sheets: [{ rows: [] }] }, ...extra })
  const post = (extra: Record<string, unknown>) =>
    POST(req("/api/rota?r=cargas", { method: "POST", body: corpo(extra), headers: { "Content-Type": "application/json" } }))

  it("mesRef fora do formato AAAA-MM → 400 antes do banco", async () => {
    vi.stubEnv("LOGIN_DESATIVADO", "1")
    try {
      expect((await post({ mesRef: "2026-13" })).status).toBe(400)
      expect((await post({ mesRef: 202610 })).status).toBe(400)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
