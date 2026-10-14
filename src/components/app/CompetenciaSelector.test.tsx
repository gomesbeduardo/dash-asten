import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CargaMeta } from "@/cargas"
import { competenciasDoTipo, agruparHistorico } from "@/app/navegacao"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { CompetenciaSelector } from "./CompetenciaSelector"

const meta = (p: Partial<CargaMeta>): CargaMeta => ({
  id: "x", tipo: "chamados", competencia: "2026-08", versao: 1,
  importadaEm: "2026-10-14T15:00:00.000Z", arquivo: "x.xlsx", linhas: 5,
  nome: null, arquivadaEm: null, ...p,
})
const AGO = meta({ id: "ago" })
const SET1 = meta({ id: "s1", competencia: "2026-09" })
const SET2 = meta({ id: "s2", competencia: "2026-09", versao: 2, nome: "Correção do Líder" })
const AGO_OUTRO = meta({ id: "ago-o", tipo: "outro", arquivo: "o.xlsx" })

beforeEach(() => registrarTiposDoApp())

function montar(metas: CargaMeta[], atual: CargaMeta, outros = true) {
  const onAbrir = vi.fn()
  const grupos = competenciasDoTipo(metas, atual.tipo)
  const outrosTipos = agruparHistorico(metas).filter((g) => g.tipo !== atual.tipo)
  render(
    <CompetenciaSelector
      atual={atual}
      grupos={grupos}
      outrosTipos={outros ? outrosTipos : undefined}
      onAbrir={onAbrir}
      onOpenChange={() => {}}
    />
  )
  return { onAbrir }
}
const abrir = () => userEvent.click(screen.getByRole("button", { name: /Competência/ }))

describe("CompetenciaSelector", () => {
  it("mostra versão e nome na lista e no botão da carga aberta", async () => {
    montar([AGO, SET1, SET2], SET2)
    expect(screen.getByRole("button", { name: /Competência/ })).toHaveTextContent("v2 · Correção do Líder")
    await abrir()
    const lista = await screen.findByRole("dialog")
    expect(within(lista).getByText("v2 · Correção do Líder")).toBeInTheDocument()
    expect(within(lista).getAllByText("v1")).toHaveLength(2)
  })

  it("só um tipo: sem rótulos de tipo", async () => {
    montar([AGO, SET1], SET1)
    await abrir()
    const lista = await screen.findByRole("dialog")
    expect(within(lista).queryByRole("heading")).toBeNull()
  })

  it("com outros tipos: seções rotuladas pelo nome do tipo, e agosto de cada tipo aparece no seu rótulo", async () => {
    const { onAbrir } = montar([AGO, SET1, AGO_OUTRO], SET1)
    await abrir()
    const lista = await screen.findByRole("dialog")
    const titulos = within(lista).getAllByRole("heading").map((h) => h.textContent)
    expect(titulos).toEqual(["Chamados / OS", "Outro"])
    const secaoOutro = within(lista).getByRole("heading", { name: "Outro" }).parentElement!
    await userEvent.click(within(secaoOutro).getByRole("button", { name: /Agosto de 2026, versão 1/ }))
    expect(onAbrir).toHaveBeenCalledWith("ago-o")
  })
})
