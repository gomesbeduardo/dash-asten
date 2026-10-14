import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { montarMeta } from "./repositorio-comum"
import { ErroDeCarga, criarRepositorioApi } from "./repositorio-api"
import { suiteDeRepositorio, workbookDeTeste } from "./repositorio.suite"
import type { CargaMeta, NovaCarga } from "./types"

type Chamada = { url: string; method: string; headers: Headers; corpo: string }

/** Servidor falso em memória que obedece ao contrato HTTP de /api/cargas. */
function servidorFalso() {
  const cargas = new Map<string, { meta: CargaMeta; workbook: string; original?: string }>()
  const chamadas: Chamada[] = []
  const json = (status: number, corpo: unknown) =>
    new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } })
  const respostasForcadas: Response[] = []

  async function lerCorpo(init: RequestInit, headers: Headers): Promise<string> {
    if (init.body == null) return ""
    const resp = new Response(init.body as BodyInit)
    if (headers.get("X-Content-Encoding") === "gzip")
      return new Response(resp.body!.pipeThrough(new DecompressionStream("gzip"))).text()
    return resp.text()
  }

  const fetchFalso = async (entrada: string | URL | Request, init: RequestInit = {}) => {
    const url = String(entrada)
    const method = init.method ?? "GET"
    const headers = new Headers(init.headers)
    const corpo = await lerCorpo(init, headers)
    chamadas.push({ url, method, headers, corpo })
    const forcada = respostasForcadas.shift()
    if (forcada) return forcada
    const m = url.match(/^\/api\/cargas(?:\/([^/]+))?$/)
    if (!m) return json(404, { erro: "rota" })
    const id = m[1]
    if (method === "GET" && !id) return json(200, [...cargas.values()].map((c) => c.meta))
    if (method === "GET" && id) {
      const c = cargas.get(id)
      return c ? json(200, { ...c.meta, workbook: JSON.parse(c.workbook) }) : json(404, { erro: "não encontrada" })
    }
    if (method === "POST") {
      const body = JSON.parse(corpo) as Pick<NovaCarga, "tipo" | "competencia" | "arquivo"> & { workbook: unknown; originalBase64?: string }
      const meta = montarMeta(
        { tipo: body.tipo, competencia: body.competencia, arquivo: body.arquivo, workbook: { fileName: "", importedAt: new Date(), sheets: (body.workbook as { sheets: [] }).sheets } },
        [...cargas.values()].map((c) => c.meta),
      )
      cargas.set(meta.id, { meta, workbook: JSON.stringify(body.workbook), original: body.originalBase64 })
      return json(201, meta)
    }
    if (method === "DELETE" && id) { cargas.delete(id); return new Response(null, { status: 204 }) }
    return json(405, { erro: "método" })
  }
  return { fetchFalso, chamadas, cargas, respostasForcadas }
}

let srv: ReturnType<typeof servidorFalso>
beforeEach(() => {
  srv = servidorFalso()
  vi.stubGlobal("fetch", srv.fetchFalso)
})
afterEach(() => vi.unstubAllGlobals())

describe("repositório API (suíte compartilhada)", () => {
  suiteDeRepositorio(() => criarRepositorioApi())
})

const nova = (extra: Partial<NovaCarga> = {}): NovaCarga => ({
  tipo: "chamados", competencia: "2026-09", arquivo: "f.xlsx", workbook: workbookDeTeste(), ...extra,
})

describe("repositório API", () => {
  it("não expõe limparTudo", () => {
    expect(criarRepositorioApi().limparTudo).toBeUndefined()
  })

  it("revive datas das colunas date e importedAt, sem tocar em outros valores", async () => {
    const repo = criarRepositorioApi()
    const meta = await repo.salvar(nova())
    const raw = srv.cargas.get(meta.id)!.workbook
    expect(raw).toContain("2026-09-03T00:00:00.000Z") // servidor guarda ISO
    const carga = await repo.obter(meta.id)
    const wb = carga!.workbook
    expect(wb.importedAt).toBeInstanceOf(Date)
    expect(wb.sheets[0].rows[0].d).toEqual(new Date(Date.UTC(2026, 8, 3)))
    expect(wb.sheets[0].rows[1].d).toBeNull()
    expect(wb.sheets[1].rows[0].n).toBe(1)
  })

  it("envia o corpo comprimido com gzip e X-Content-Encoding", async () => {
    const repo = criarRepositorioApi()
    const meta = await repo.salvar(nova({ original: new Uint8Array([1, 2, 3]).buffer }))
    const post = srv.chamadas.find((c) => c.method === "POST")!
    expect(post.headers.get("X-Content-Encoding")).toBe("gzip")
    expect(post.headers.get("Content-Type")).toBe("application/json")
    const body = JSON.parse(post.corpo)
    expect(body).toMatchObject({ tipo: "chamados", competencia: "2026-09", arquivo: "f.xlsx", originalBase64: "AQID" })
    expect(body.workbook.sheets[0].rows[0].d).toBe("2026-09-03T00:00:00.000Z")
    expect(srv.cargas.get(meta.id)!.original).toBe("AQID")
  })

  it("sem CompressionStream, envia JSON puro e sem o header", async () => {
    vi.stubGlobal("CompressionStream", undefined)
    await criarRepositorioApi().salvar(nova())
    const post = srv.chamadas.find((c) => c.method === "POST")!
    expect(post.headers.get("X-Content-Encoding")).toBeNull()
    expect(JSON.parse(post.corpo).arquivo).toBe("f.xlsx")
  })

  it("usa a base informada e credentials same-origin", async () => {
    const espiao = vi.fn(async () => new Response("[]", { status: 200 }))
    vi.stubGlobal("fetch", espiao)
    await criarRepositorioApi("/x").listar()
    expect(espiao).toHaveBeenCalledWith("/x/cargas", expect.objectContaining({ credentials: "same-origin" }))
  })

  it("recusa corpo acima de 3,8 MB com mensagem clara, sem chamar o servidor", async () => {
    const ruido = Array.from({ length: 600_000 }, () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))
    const wb = workbookDeTeste()
    wb.sheets[1].rows = ruido.map((t) => ({ n: t as unknown as number }))
    const erro = await criarRepositorioApi().salvar(nova({ workbook: wb })).catch((e) => e)
    expect(erro).toBeInstanceOf(ErroDeCarga)
    expect(erro.message).toMatch(/^A planilha é grande demais para enviar \(\d+,\d MB\)\. Limite: 3,8 MB\.$/)
    expect(srv.chamadas).toHaveLength(0)
  })

  it("401 vira ErroDeCarga pedindo para recarregar e entrar", async () => {
    srv.respostasForcadas.push(new Response("", { status: 401 }))
    const erro = await criarRepositorioApi().listar().catch((e) => e)
    expect(erro).toBeInstanceOf(ErroDeCarga)
    expect(erro.message).toBe("Sessão sem login. Recarregue a página e entre com o usuário e senha do time.")
  })

  it("401 dispara o evento asten:sessao-expirada", async () => {
    srv.respostasForcadas.push(new Response("", { status: 401 }))
    const ouvinte = vi.fn()
    window.addEventListener("asten:sessao-expirada", ouvinte)
    await criarRepositorioApi().listar().catch(() => undefined)
    window.removeEventListener("asten:sessao-expirada", ouvinte)
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })

  it("outros erros usam { erro } do corpo; sem JSON, uma mensagem genérica", async () => {
    srv.respostasForcadas.push(new Response(JSON.stringify({ erro: "Competência inválida" }), { status: 400 }))
    srv.respostasForcadas.push(new Response("<html>", { status: 500 }))
    const repo = criarRepositorioApi()
    await expect(repo.listar()).rejects.toThrow("Competência inválida")
    await expect(repo.listar()).rejects.toThrow(/500/)
  })

  it("404 em obter devolve null", async () => {
    expect(await criarRepositorioApi().obter("x")).toBeNull()
  })
})
