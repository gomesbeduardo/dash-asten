import { isCuid } from "@paralleldrive/cuid2"
import { describe, expect, it } from "vitest"
import type { Workbook } from "@/core"
import type { NovaCarga, RepositorioDeCargas } from "./types"

export function workbookDeTeste(): Workbook {
  return {
    fileName: "x.xlsx",
    importedAt: new Date(Date.UTC(2026, 9, 1)),
    sheets: [
      {
        id: "a", name: "A", index: 0,
        columns: [{ key: "d", label: "D", type: "date", filterable: true, distinctCount: 2 }],
        rows: [{ d: new Date(Date.UTC(2026, 8, 3)) }, { d: null }],
      },
      {
        id: "b", name: "B", index: 1,
        columns: [{ key: "n", label: "N", type: "number", filterable: false, distinctCount: 3 }],
        rows: [{ n: 1 }, { n: 2 }, { n: 3 }],
      },
    ],
  }
}

const nova = (tipo = "chamados", competencia = "2026-09", arquivo = "f.xlsx"): NovaCarga => ({
  tipo, competencia, arquivo, workbook: workbookDeTeste(),
})

export function suiteDeRepositorio(criar: () => RepositorioDeCargas) {
  describe("repositório de cargas", () => {
    it("salva com id, versão 1, ISO, soma de linhas e devolve a carga com Date", async () => {
      const repo = criar()
      const meta = await repo.salvar(nova())
      expect(meta.versao).toBe(1)
      expect(meta.linhas).toBe(5)
      expect(isCuid(meta.id)).toBe(true)
      expect(new Date(meta.importadaEm).toISOString()).toBe(meta.importadaEm)
      const carga = await repo.obter(meta.id)
      expect(carga?.arquivo).toBe("f.xlsx")
      const d = carga?.workbook.sheets[0].rows[0].d
      expect(d).toBeInstanceOf(Date)
      expect((d as Date).toISOString()).toBe("2026-09-03T00:00:00.000Z")
      expect(carga?.workbook.importedAt).toBeInstanceOf(Date)
    })

    it("ids são CUID2 e id inválido não quebra obter/excluir", async () => {
      const repo = criar()
      const meta = await repo.salvar(nova())
      expect(isCuid(meta.id)).toBe(true)
      expect(await repo.obter("nao-e-cuid")).toBeNull()
      await expect(repo.excluir("nao-e-cuid")).resolves.toBeUndefined()
      expect(await repo.obter(meta.id)).not.toBeNull()
    })

    it("incrementa versão por tipo+competência e recomeça em 1 para outro tipo ou mês", async () => {
      const repo = criar()
      expect((await repo.salvar(nova())).versao).toBe(1)
      expect((await repo.salvar(nova())).versao).toBe(2)
      expect((await repo.salvar(nova("chamados", "2026-08"))).versao).toBe(1)
      expect((await repo.salvar(nova("outro"))).versao).toBe(1)
    })

    it("lista por tipo asc, competência desc, versão desc", async () => {
      const repo = criar()
      await repo.salvar(nova("outro", "2026-09"))
      await repo.salvar(nova("chamados", "2026-08"))
      await repo.salvar(nova("chamados", "2026-09"))
      await repo.salvar(nova("chamados", "2026-09"))
      const l = await repo.listar()
      expect(l.map((m) => [m.tipo, m.competencia, m.versao])).toEqual([
        ["chamados", "2026-09", 2], ["chamados", "2026-09", 1], ["chamados", "2026-08", 1], ["outro", "2026-09", 1],
      ])
    })

    it("obter de id inexistente devolve null", async () => {
      expect(await criar().obter("nao-existe")).toBeNull()
    })

    it("não vaza referência: mutar o original ou o lido não altera o guardado", async () => {
      const repo = criar()
      const n = nova()
      const meta = await repo.salvar(n)
      n.workbook.sheets[0].rows[0].d = null
      const lido = await repo.obter(meta.id)
      ;(lido as NonNullable<typeof lido>).workbook.sheets[0].rows[1].d = new Date(0)
      const outra = await repo.obter(meta.id)
      expect(outra?.workbook.sheets[0].rows[0].d).toBeInstanceOf(Date)
      expect(outra?.workbook.sheets[0].rows[1].d).toBeNull()
    })

    it("excluir remove só a carga indicada (e não falha com id inexistente)", async () => {
      const repo = criar()
      const a = await repo.salvar(nova())
      const b = await repo.salvar(nova())
      await repo.excluir(a.id)
      await repo.excluir("nada")
      expect((await repo.listar()).map((m) => m.id)).toEqual([b.id])
      expect(await repo.obter(a.id)).toBeNull()
    })

    it("depois de excluir a maior versão, a próxima reaproveita max+1 do que sobrou", async () => {
      const repo = criar()
      await repo.salvar(nova())
      const v2 = await repo.salvar(nova())
      await repo.excluir(v2.id)
      expect((await repo.salvar(nova())).versao).toBe(2)
    })

    it("limparTudo (quando existe) esvazia", async () => {
      const repo = criar()
      await repo.salvar(nova())
      if (!repo.limparTudo) return
      await repo.limparTudo()
      expect(await repo.listar()).toEqual([])
    })
  })
}
