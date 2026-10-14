import { describe, expect, it } from "vitest"
import type { CargaMeta } from "@/cargas"
import {
  agruparHistorico,
  competenciasDoTipo,
  escolherCargaInicial,
  proximaVersao,
  resolverVisao,
  sucessorAposExcluir,
} from "./navegacao"

let n = 0
const meta = (
  tipo: string,
  competencia: string,
  versao: number,
  importadaEm: string
): CargaMeta => ({
  id: `c${++n}`,
  tipo,
  competencia,
  versao,
  importadaEm,
  arquivo: "a.xlsx",
  linhas: 1,
})

const a1 = meta("chamados", "2026-08", 1, "2026-09-01T10:00:00.000Z")
const a2 = meta("chamados", "2026-09", 1, "2026-10-01T10:00:00.000Z")
const a3 = meta("chamados", "2026-09", 2, "2026-10-02T10:00:00.000Z")
const o1 = meta("outro", "2026-10", 1, "2026-10-05T10:00:00.000Z")

describe("escolherCargaInicial", () => {
  it("sem histórico, nada", () => expect(escolherCargaInicial([])).toBeNull())
  it("pega a competência mais recente, versão mais recente, do tipo da última carga", () => {
    // última carga feita: chamados 2026-08 v1 reimportada depois de tudo
    const ultima = meta("chamados", "2026-08", 2, "2026-10-09T10:00:00.000Z")
    expect(escolherCargaInicial([a1, a2, a3, o1, ultima])).toEqual(a3)
  })
  it("o tipo vem da carga mais recente por importadaEm", () => {
    expect(escolherCargaInicial([a1, a2, a3, o1])).toEqual(o1)
  })
})

describe("competenciasDoTipo", () => {
  it("competências mais recentes primeiro, versões mais recentes primeiro", () => {
    expect(competenciasDoTipo([a1, a2, a3, o1], "chamados")).toEqual([
      { competencia: "2026-09", versoes: [a3, a2] },
      { competencia: "2026-08", versoes: [a1] },
    ])
  })
})

describe("agruparHistorico", () => {
  it("agrupa por tipo, depois competência", () => {
    const g = agruparHistorico([a1, a2, a3, o1])
    expect(g.map((t) => t.tipo)).toEqual(["chamados", "outro"])
    expect(g[0].competencias).toHaveLength(2)
  })
})

describe("proximaVersao", () => {
  it("começa em 1 e soma sobre a maior", () => {
    expect(proximaVersao([a1, a2, a3], "chamados", "2026-10")).toBe(1)
    expect(proximaVersao([a1, a2, a3], "chamados", "2026-09")).toBe(3)
    expect(proximaVersao([a1, a2, a3], "outro", "2026-09")).toBe(1)
  })
})

describe("sucessorAposExcluir", () => {
  it("fica na mesma competência se sobrou versão", () => {
    expect(sucessorAposExcluir([a1, a2], a3)).toEqual(a2)
  })
  it("senão, a mais recente do mesmo tipo", () => {
    expect(sucessorAposExcluir([a1, o1], a2)).toEqual(a1)
  })
  it("senão, a escolha inicial; sem nada, null", () => {
    expect(sucessorAposExcluir([o1], a1)).toEqual(o1)
    expect(sucessorAposExcluir([], a1)).toBeNull()
  })
})

describe("resolverVisao", () => {
  it("mantém a visão pedida se existe; senão painel", () => {
    expect(resolverVisao("comparar", ["painel", "comparar"])).toBe("comparar")
    expect(resolverVisao("evolucao", ["painel"])).toBe("painel")
  })
})
