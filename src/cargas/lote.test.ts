import { describe, expect, it } from "vitest"
import type { CargaMeta } from "./types"
import {
  LIMITE_LOTE,
  maisRecenteDoLote,
  mensagemDoLote,
  separarArquivos,
  versoesDoLote,
} from "./lote"

const f = (name: string) => ({ name })
const meta = (o: Partial<CargaMeta>): CargaMeta =>
  ({ id: "x", tipo: "chamados", competencia: "2026-08", versao: 1, ...o }) as CargaMeta

describe("separarArquivos", () => {
  it("aceita até 12 e separa o que não é .xlsx", () => {
    const r = separarArquivos([f("a.xlsx"), f("notas.txt"), f("B.XLSX")])
    expect(r.aceitos.map((x) => x.name)).toEqual(["a.xlsx", "B.XLSX"])
    expect(r.ignorados).toEqual(["notas.txt"])
    expect(r.excedeu).toBe(false)
  })
  it("com mais de 12 arquivos marca excedeu e não aceita nenhum", () => {
    const muitos = Array.from({ length: LIMITE_LOTE + 1 }, (_, i) => f(`a${i}.xlsx`))
    const r = separarArquivos(muitos)
    expect(r.excedeu).toBe(true)
    expect(r.aceitos).toEqual([])
  })
  it("exatamente 12 passa", () => {
    const doze = Array.from({ length: LIMITE_LOTE }, (_, i) => f(`a${i}.xlsx`))
    expect(separarArquivos(doze).aceitos).toHaveLength(12)
  })
})

describe("mensagemDoLote", () => {
  it("excedeu: erro dizendo que nada foi lido", () => {
    const m = mensagemDoLote({ aceitos: [], ignorados: [], excedeu: true }, 13)
    expect(m).toMatchObject({ nivel: "erro" })
    expect(m!.texto).toMatch(/no máximo 12/)
    expect(m!.texto).toMatch(/nada foi lido/i)
  })
  it("só não-xlsx: erro; misturado: aviso listando os de fora", () => {
    expect(
      mensagemDoLote({ aceitos: [], ignorados: ["n.txt"], excedeu: false }, 1)
    ).toMatchObject({ nivel: "erro" })
    const m = mensagemDoLote({ aceitos: [f("a.xlsx")], ignorados: ["n.txt"], excedeu: false }, 2)
    expect(m).toMatchObject({ nivel: "aviso" })
    expect(m!.texto).toContain("n.txt")
  })
  it("tudo certo: sem mensagem", () => {
    expect(mensagemDoLote({ aceitos: [f("a.xlsx")], ignorados: [], excedeu: false }, 1)).toBeNull()
  })
})

describe("versoesDoLote", () => {
  it("conta as versões existentes e as repetidas anteriores da lista", () => {
    const metas = [meta({ competencia: "2026-09", versao: 2 })]
    const v = versoesDoLote(metas, [
      { tipo: "chamados", competencia: "2026-08" },
      { tipo: "chamados", competencia: "2026-09" },
      { tipo: "chamados", competencia: "2026-09" },
      { tipo: "outro", competencia: "2026-09" },
    ])
    expect(v).toEqual([1, 3, 4, 1])
  })
})

describe("maisRecenteDoLote", () => {
  it("maior competência; empate fica com a maior versão", () => {
    const a = meta({ id: "a", competencia: "2026-07" })
    const b = meta({ id: "b", competencia: "2026-09", versao: 1 })
    const c = meta({ id: "c", competencia: "2026-09", versao: 2 })
    expect(maisRecenteDoLote([a, c, b])?.id).toBe("c")
    expect(maisRecenteDoLote([])).toBeNull()
  })
})
