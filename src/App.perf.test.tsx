import { render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { comCache, criarRepositorioMemoria, type CargaMeta, type RepositorioDeCargas } from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { RepositorioProvider } from "@/app/RepositorioContext"
import { ListaInicialContext } from "@/app/sessao/SessaoContext"
import { makeXlsx } from "@/test/makeWorkbook"
import { App } from "./App"

const OUTRO = [["Área", "Valor"], ["TI", 1], ["RH", 2]]
const MESES = ["01", "02", "03", "04", "05", "06", "07", "08"]

beforeEach(() => registrarTiposDoApp())

/** Repositório em memória que conta chamadas e a concorrência de `obter`. */
async function cenario() {
  const base = criarRepositorioMemoria()
  const metas: CargaMeta[] = []
  for (const m of MESES) {
    const wb = readWorkbook(makeXlsx({ Projetos: OUTRO }), `a-${m}.xlsx`)
    metas.push(await base.salvar({ tipo: "outro", competencia: `2026-${m}`, arquivo: `a-${m}.xlsx`, workbook: wb }))
  }
  const chamadasObter: string[] = []
  let ativas = 0
  let maxAtivas = 0
  const listar = vi.fn(() => base.listar())
  const instrumentado: RepositorioDeCargas = {
    ...base,
    listar,
    async obter(id) {
      chamadasObter.push(id)
      ativas++
      maxAtivas = Math.max(maxAtivas, ativas)
      await new Promise((r) => setTimeout(r, 5))
      try {
        return await base.obter(id)
      } finally {
        ativas--
      }
    },
  }
  return { repo: comCache(instrumentado), metas, chamadasObter, listar, maxAtivas: () => maxAtivas }
}

describe("abertura e pré-carga", () => {
  it("com a lista já vinda do porteiro, não lista de novo e abre com uma só carga", async () => {
    const c = await cenario()
    const lista = await c.repo.listar()
    c.listar.mockClear()
    render(
      <StrictMode>
        <ListaInicialContext.Provider value={lista}>
          <RepositorioProvider repositorio={c.repo}>
            <App />
          </RepositorioProvider>
        </ListaInicialContext.Provider>
      </StrictMode>
    )
    await screen.findByRole("heading", { level: 1 })
    expect(c.listar).not.toHaveBeenCalled()
    const maisRecente = c.metas.find((m) => m.competencia === "2026-08")!.id
    expect(c.chamadasObter.filter((id) => id === maisRecente)).toHaveLength(1)
  })

  it("aquece o cache com as 6 competências mais recentes, uma de cada vez, sem baixar nada duas vezes", async () => {
    const c = await cenario()
    render(
      <StrictMode>
        <RepositorioProvider repositorio={c.repo}>
          <App />
        </RepositorioProvider>
      </StrictMode>
    )
    const esperadas = c.metas.filter((m) => m.competencia >= "2026-03").map((m) => m.id)
    await waitFor(() => expect(new Set(c.chamadasObter)).toEqual(new Set(esperadas)), { timeout: 4000 })
    expect(c.chamadasObter).toHaveLength(esperadas.length)
    expect(c.maxAtivas()).toBe(1)
  })
})
