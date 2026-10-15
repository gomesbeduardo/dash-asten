import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  comCache,
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { readWorkbook } from "@/core"
import { makeXlsx } from "@/test/makeWorkbook"
import { useAnterior, useCargasDoTipo } from "./hooks"

const CAB = ["Data Abertura", "Código", "Cliente", "Situação", "Data de Solução"]
const linha = (dia: string, i: number) => [new Date(`${dia}T00:00:00Z`), i, "Cli", "Em Análise", null]

/** Repositório com cache e duas competências (ago e set), ainda sem nada baixado. */
async function cenario() {
  const repo: RepositorioDeCargas = comCache(criarRepositorioMemoria())
  const salvar = (competencia: string, dia: string) =>
    repo.salvar({
      tipo: "chamados",
      competencia,
      arquivo: `${competencia}.xlsx`,
      workbook: readWorkbook(
        makeXlsx({ Dados: [CAB, linha(dia, 1), linha(dia, 2)] }),
        `${competencia}.xlsx`
      ),
    })
  await salvar("2026-08", "2026-08-10")
  await salvar("2026-09", "2026-09-10")
  const historico = await repo.listar()
  return { repo, historico }
}

const idDe = (h: Awaited<ReturnType<typeof cenario>>["historico"], comp: string) =>
  h.find((m) => m.competencia === comp)!.id

describe("useCargasDoTipo", () => {
  it("com as cargas já no cache, entrega os dados no 1º render (sem passar por null)", async () => {
    const { repo, historico } = await cenario()
    await Promise.all(historico.map((m) => repo.obter(m.id)))
    const vistos: unknown[] = []
    renderHook(() => {
      const r = useCargasDoTipo(historico, repo.obter)
      vistos.push(r)
      return r
    })
    expect(vistos[0]).toHaveLength(2)
    expect(vistos.every((v) => v !== null)).toBe(true)
  })

  it("sem cache, começa em null e chega depois", async () => {
    const { repo, historico } = await cenario()
    const { result } = renderHook(() => useCargasDoTipo(historico, repo.obter))
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toHaveLength(2))
  })
})

describe("useAnterior", () => {
  it("com o mês anterior no cache, entrega o valor no 1º render", async () => {
    const { repo, historico } = await cenario()
    const carga = (await repo.obter(idDe(historico, "2026-09"))) as Carga
    await repo.obter(idDe(historico, "2026-08"))
    const vistos: unknown[] = []
    renderHook(() => {
      const r = useAnterior(carga, historico, repo.obter, null)
      vistos.push(r)
      return r
    })
    expect(vistos[0]).toMatchObject({ propria: true })
    expect(vistos).not.toContain(undefined)
  })

  it("sem o anterior no cache, começa em undefined e chega depois", async () => {
    const { repo, historico } = await cenario()
    const carga = (await repo.obter(idDe(historico, "2026-09"))) as Carga
    const { result } = renderHook(() => useAnterior(carga, historico, repo.obter, null))
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toMatchObject({ propria: true }))
  })
})
