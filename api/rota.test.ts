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
