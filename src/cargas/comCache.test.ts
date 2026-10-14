import { describe, expect, it, vi } from "vitest"
import { comCache } from "./comCache"
import type { Carga, RepositorioDeCargas } from "./types"

const carga = (id: string) => ({ id }) as unknown as Carga

function repoFalso(obter: RepositorioDeCargas["obter"]) {
  const base: RepositorioDeCargas = {
    listar: vi.fn(async () => []),
    obter: vi.fn(obter),
    salvar: vi.fn(),
    excluir: vi.fn(async () => undefined),
  }
  return base
}

describe("comCache", () => {
  it("chamadas simultâneas e repetidas do mesmo id fazem uma só requisição", async () => {
    const base = repoFalso(async (id) => carga(id))
    const repo = comCache(base)
    const [a, b] = await Promise.all([repo.obter("x"), repo.obter("x")])
    const c = await repo.obter("x")
    expect(a).toBe(b)
    expect(c).toBe(a)
    expect(base.obter).toHaveBeenCalledTimes(1)
    await repo.obter("y")
    expect(base.obter).toHaveBeenCalledTimes(2)
  })

  it("listar simultâneo divide a requisição, mas listar depois refaz (a lista muda)", async () => {
    const base = repoFalso(async () => null)
    const repo = comCache(base)
    await Promise.all([repo.listar(), repo.listar()])
    expect(base.listar).toHaveBeenCalledTimes(1)
    await repo.listar()
    expect(base.listar).toHaveBeenCalledTimes(2)
  })

  it("erro não fica em cache", async () => {
    let falhar = true
    const base = repoFalso(async (id) => {
      if (falhar) throw new Error("rede")
      return carga(id)
    })
    const repo = comCache(base)
    await expect(repo.obter("x")).rejects.toThrow("rede")
    falhar = false
    expect((await repo.obter("x"))?.id).toBe("x")
    expect(base.obter).toHaveBeenCalledTimes(2)
  })

  it("null (não encontrada) não fica em cache", async () => {
    let existe = false
    const base = repoFalso(async (id) => (existe ? carga(id) : null))
    const repo = comCache(base)
    expect(await repo.obter("x")).toBeNull()
    existe = true
    expect((await repo.obter("x"))?.id).toBe("x")
    expect(base.obter).toHaveBeenCalledTimes(2)
  })

  it("excluir remove do cache e repassa ao repositório", async () => {
    const base = repoFalso(async (id) => carga(id))
    const repo = comCache(base)
    await repo.obter("x")
    await repo.excluir("x")
    expect(base.excluir).toHaveBeenCalledWith("x")
    await repo.obter("x")
    expect(base.obter).toHaveBeenCalledTimes(2)
  })

  it("limparTudo só existe se o repositório tem, e esvazia o cache", async () => {
    expect(comCache(repoFalso(async () => null)).limparTudo).toBeUndefined()
    const base = { ...repoFalso(async (id) => carga(id)), limparTudo: vi.fn(async () => undefined) }
    const repo = comCache(base)
    await repo.obter("x")
    await repo.limparTudo!()
    await repo.obter("x")
    expect(base.obter).toHaveBeenCalledTimes(2)
  })
})
