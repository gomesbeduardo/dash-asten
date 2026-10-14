import { describe, expect, it } from "vitest"
import type { CargaMeta } from "@/cargas"
import { filtrarHistorico } from "./buscaHistorico"

const m = (p: Partial<CargaMeta>): CargaMeta => ({
  id: "x",
  tipo: "chamados",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-14T15:00:00.000Z",
  arquivo: "Relatório Setembro.xlsx",
  linhas: 10,
  ...p,
})
const nomes = () => (id: string) => (id === "chamados" ? "Chamados" : id)
const ids = (metas: CargaMeta[], q: string) =>
  filtrarHistorico(metas, q, nomes()).map((x) => x.id)

const a = m({ id: "a", versao: 3 })
const b = m({
  id: "b",
  tipo: "outro",
  competencia: "2026-08",
  arquivo: "projetos.xlsx",
  importadaEm: "2026-09-02T15:00:00.000Z",
})
const todas = [a, b]

describe("busca do histórico", () => {
  it("vazio devolve tudo", () => expect(ids(todas, "  ")).toEqual(["a", "b"]))
  it("nome do arquivo sem acento/maiúscula", () =>
    expect(ids(todas, "RELATORIO")).toEqual(["a"]))
  it.each(["09/2026", "2026-09", "set/26", "setembro", "SETEMBRO"])(
    "competência %s",
    (q) => expect(ids(todas, q)).toEqual(["a"])
  )
  it("data da carga dd/mm/aaaa", () => {
    expect(ids(todas, "14/10/2026")).toEqual(["a"])
    expect(ids(todas, "02/09/2026")).toEqual(["b"])
  })
  it("tipo (nome do tipo)", () => expect(ids(todas, "chamados")).toEqual(["a"]))
  it("versão", () => expect(ids(todas, "v3")).toEqual(["a"]))
  it("vários termos exigem todos", () => {
    expect(ids(todas, "setembro v3")).toEqual(["a"])
    expect(ids(todas, "setembro v9")).toEqual([])
  })
})
