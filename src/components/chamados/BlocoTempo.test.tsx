import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import {
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { foto, mai, out, v1, v2 } from "@/chamados/fotos-teste"
import { montarWorkbook } from "@/chamados/test-util"
import { BlocoTempo } from "./BlocoTempo"
import { GRAFICOS_TEMPO } from "./BlocoTempo"
import { FiltrosChamadosProvider } from "./filtros"

/** Fotos de teste (abr v1/v2, mai, out) como cargas: abr–out, com jun a set sem posição. */
async function cenarioFotos() {
  const repo: RepositorioDeCargas = criarRepositorioMemoria()
  const salvar = (competencia: string, linhas: typeof v1, mesRef: string) =>
    repo.salvar({
      tipo: "chamados",
      competencia,
      arquivo: `foto-${competencia}.xlsx`,
      workbook: montarWorkbook(foto(linhas, mesRef)),
    })
  await salvar("2026-04", v1, "2026-04-01")
  await salvar("2026-04", v2, "2026-04-01")
  await salvar("2026-05", mai, "2026-05-01")
  const meta = await salvar("2026-10", out, "2026-10-01")
  const carga = (await repo.obter(meta.id)) as Carga
  return {
    carga,
    historico: await repo.listar(),
    obterCarga: (id: string) => repo.obter(id),
    entrada: false,
  }
}

const renderBloco = async () =>
  render(
    <FiltrosChamadosProvider carga={(await cenarioFotos()).carga}>
      <BlocoTempo {...await cenarioFotos()} />
    </FiltrosChamadosProvider>
  )

beforeEach(() => {
  registrarTiposDoApp()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

describe("BlocoTempo (Ao longo do tempo)", () => {
  it("lista de gráficos vem de GRAFICOS_TEMPO: 5 de indicadores + operador e cliente", () => {
    expect(GRAFICOS_TEMPO.map((g) => g.titulo)).toEqual([
      "Não finalizados por situação",
      "Entradas × finalizados",
      "Em atraso + SLA vencido",
      "% no SLA",
      "Tempo médio de resolução",
      "Não finalizados por operador",
      "Não finalizados por cliente",
    ])
  })

  it("título do bloco e os gráficos compactos, sem os cartões extras", async () => {
    await renderBloco()
    for (const g of GRAFICOS_TEMPO)
      expect(
        await screen.findByRole("region", { name: g.titulo })
      ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Ao longo do tempo" })
    ).toBeInTheDocument()
    for (const fora of ["Sem SLA", "% reabertos", "Tempo até o aceite"])
      expect(screen.queryByRole("region", { name: fora })).toBeNull()
    const atraso = screen.getByRole("region", {
      name: "Em atraso + SLA vencido",
    })
    expect(
      within(atraso).getByRole("button", { name: "Em atraso" })
    ).toBeInTheDocument()
    expect(
      within(atraso).getByRole("button", { name: "SLA vencido" })
    ).toBeInTheDocument()
    const sit = screen.getByRole("region", {
      name: "Não finalizados por situação",
    })
    expect(
      within(sit).getByRole("button", { name: "Em Atendimento" })
    ).toBeInTheDocument()
    expect(within(sit).queryByRole("button", { name: "Finalizado" })).toBeNull()
    expect(document.body.textContent).not.toMatch(/backlog|reconstru/i)
  })

  it("mês corrigido leva a marca 'era 1' e mês sem posição traz a dica", async () => {
    const user = userEvent.setup()
    await renderBloco()
    const fluxo = await screen.findByRole("region", {
      name: "Entradas × finalizados",
    })
    await user.click(within(fluxo).getByRole("button", { name: /Ver dados/ }))
    expect(
      within(fluxo).getByRole("row", { name: /^mai\/26 / })
    ).toHaveTextContent(/corrigido; era 1/)
    const sla = screen.getByRole("region", { name: "% no SLA" })
    await user.click(within(sla).getByRole("button", { name: /Ver dados/ }))
    expect(
      within(sla).getByRole("row", { name: /^jun\/26 / })
    ).toHaveTextContent("sem posição de jun/26")
  })

  it("operador e cliente: linhas dos não finalizados", async () => {
    await renderBloco()
    const op = await screen.findByRole("region", {
      name: "Não finalizados por operador",
    })
    expect(
      within(op).getByRole("button", { name: "Operador 05" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("region", { name: "Não finalizados por cliente" })
    ).toBeInTheDocument()
  })

  it("seletor 6/12 meses muda a janela", async () => {
    const user = userEvent.setup()
    await renderBloco()
    const fluxo = await screen.findByRole("region", {
      name: "Entradas × finalizados",
    })
    await user.click(within(fluxo).getByRole("button", { name: /Ver dados/ }))
    expect(within(fluxo).getAllByRole("row")).toHaveLength(6 + 1)
    await user.click(screen.getByRole("button", { name: "12 meses" }))
    expect(within(fluxo).getAllByRole("row")).toHaveLength(12 + 1)
  })
})
