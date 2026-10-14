// @vitest-environment node
import { describe, expect, it } from "vitest"
import { caminhoDa, DELETE, GET, POST } from "./rota.js"

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
