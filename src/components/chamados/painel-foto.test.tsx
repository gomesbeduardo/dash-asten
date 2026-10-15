import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import {
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { makeXlsx } from "@/test/makeWorkbook"
import { PainelChamados } from "./PainelChamados"

const d = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null)
const CAB = [
  "Data Abertura",
  "Código",
  "Cliente",
  "Área Superior",
  "Atividade",
  "Situação",
  "SLA Previsto",
  "SLA Renegociado",
  "Data de Solução",
  "Data de Aceite",
  "Qtd Reabertura",
]
// [abertura, código, cliente, situação, solução]
type L = [string, number, string, string, string | null]
// Foto de teste abr v1 (mesmos dados de docs/exemplos/gerar-teste-foto.cjs)
const ABR: L[] = [
  ["2026-04-03", 5000, "Cliente Ômega", "Em Atendimento", null],
  ["2026-01-18", 5003, "Cliente Ômega", "Em Análise", null],
  ["2026-03-10", 5005, "Cliente Delta", "Finalizado", "2026-04-08"],
  ["2026-04-02", 5007, "Cliente Delta", "Finalizado", "2026-04-12"],
  ["2025-12-05", 5010, "Cliente Ômega", "Aguardando aceite", "2026-04-25"],
]
// Foto de teste out: salto de meses, situação nova e um aberto depois do Mes Ref.
const OUT: L[] = [
  ["2026-04-03", 5000, "Cliente Ômega", "Finalizado", "2026-04-28"],
  ["2026-01-18", 5003, "Cliente Ômega", "Finalizado", "2026-06-20"],
  ["2026-03-10", 5005, "Cliente Delta", "Finalizado", "2026-04-08"],
  ["2026-04-02", 5007, "Cliente Delta", "Finalizado", "2026-04-12"],
  ["2025-12-05", 5010, "Cliente Ômega", "Finalizado", "2026-04-25"],
  ["2026-04-22", 5012, "Cliente Delta", "Finalizado", "2026-05-05"],
  ["2026-05-10", 5015, "Cliente Ômega", "Finalizado", "2026-05-30"],
  ["2026-08-14", 5020, "Cliente Delta", "Em Análise", null],
  ["2026-10-06", 5022, "Cliente Ômega", "Aguardando cliente", null],
  ["2026-10-01", 5024, "Cliente Delta", "Finalizado", "2026-10-09"],
  ["2026-11-03", 5026, "Cliente Ômega", "Em Análise", null],
]

function xlsx(linhas: L[]) {
  return makeXlsx({
    Dados: [
      CAB,
      ...linhas.map(([ab, cod, cli, sit, sol]) => [
        d(ab),
        cod,
        cli,
        "Operações",
        "Suporte",
        sit,
        null,
        null,
        d(sol),
        null,
        0,
      ]),
    ],
  })
}

async function cenario(cargas: [string, L[]][]) {
  const repo: RepositorioDeCargas = criarRepositorioMemoria()
  let ultima = ""
  for (const [competencia, linhas] of cargas) {
    const m = await repo.salvar({
      tipo: "chamados",
      competencia,
      arquivo: `ch-${competencia}.xlsx`,
      workbook: readWorkbook(xlsx(linhas), `ch-${competencia}.xlsx`),
    })
    ultima = m.id
  }
  return {
    carga: (await repo.obter(ultima)) as Carga,
    historico: await repo.listar(),
    obterCarga: (id: string) => repo.obter(id),
    entrada: false,
  }
}

beforeEach(() => {
  registrarTiposDoApp()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

const painel = async (cargas: [string, L[]][]) =>
  render(<PainelChamados {...await cenario(cargas)} />)

describe("Painel: topo por Situação (D64)", () => {
  it("foto abr v1: total e um card por situação, na ordem de frequência", async () => {
    await painel([["2026-04", ABR]])
    const topo = await screen.findByRole("region", {
      name: "Chamados por situação",
    })
    const total = within(topo).getByRole("article", {
      name: "Total de chamados",
    })
    expect(within(total).getByLabelText("5")).toBeInTheDocument()
    const nomes = within(topo)
      .getAllByRole("article")
      .map((a) => a.getAttribute("aria-label"))
    expect(nomes).toEqual([
      "Total de chamados",
      "Situação: Finalizado",
      "Situação: Aguardando aceite",
      "Situação: Em Análise",
      "Situação: Em Atendimento",
    ])
    expect(
      within(
        within(topo).getByRole("article", { name: "Situação: Finalizado" })
      ).getByLabelText("2")
    ).toBeInTheDocument()
    expect(
      within(
        within(topo).getByRole("article", { name: "Situação: Em Análise" })
      ).getByLabelText("1")
    ).toBeInTheDocument()
    // sem carga anterior: nada de Δ
    expect(topo).toHaveTextContent("sem base no mês anterior")
  })

  it("foto out: situação nova vira card, com Δ contra o mês anterior e 'nova'", async () => {
    await painel([
      ["2026-09", ABR],
      ["2026-10", OUT],
    ])
    const topo = await screen.findByRole("region", {
      name: "Chamados por situação",
    })
    const card = (n: string) =>
      within(topo).getByRole("article", { name: `Situação: ${n}` })
    expect(card("Aguardando cliente")).toHaveTextContent("nova")
    expect(within(card("Finalizado")).getByLabelText("8")).toBeInTheDocument()
    // set/26 é corrigido pela foto de out (D65): 5000, 5003 e 5010 já estavam finalizados lá
    expect(card("Finalizado")).toHaveTextContent("+3 vs set/26")
    expect(card("Em Análise")).toHaveTextContent("nova")
    expect(
      within(topo).getByRole("article", { name: "Total de chamados" })
    ).toHaveTextContent("+5 vs set/26")
    // o aberto depois do Mes Ref. fica só na nota
    expect(
      within(topo).getByRole("article", { name: "Total de chamados" })
    ).toHaveTextContent("10")
    expect(screen.getByLabelText("Avisos")).toHaveTextContent(
      "1 aberto depois do Mes Ref."
    )
  })
})

describe("Painel: gráficos com período (D64)", () => {
  it("o toggle 'Comparar período' troca finalizados no mês por finalizados no período", async () => {
    const user = userEvent.setup()
    await painel([["2026-10", OUT]])
    const card = await screen.findByRole("region", { name: "Por cliente" })
    const grafico = () =>
      within(card).getByRole("img").getAttribute("aria-label")!
    expect(grafico()).toMatch(/Finalizados no mês contra Não finalizados/)
    expect(grafico()).toMatch(/Cliente Ômega 0, 1/)
    expect(grafico()).toMatch(/Cliente Delta 1, 1/)

    await user.click(
      within(card).getByRole("button", { name: "Comparar período" })
    )
    await user.selectOptions(within(card).getByLabelText("Período"), "6")
    expect(grafico()).toMatch(/Finalizados no período contra Não finalizados/)
    expect(grafico()).toMatch(/Cliente Ômega 2, 1/)
    expect(grafico()).toMatch(/Cliente Delta 2, 1/)
    expect(card).toHaveTextContent(/últimos 6 meses/)

    // desligar volta ao mês
    await user.click(
      within(card).getByRole("button", { name: "Comparar período" })
    )
    expect(grafico()).toMatch(/Cliente Ômega 0, 1/)
  })
})

describe("Painel: vocabulário", () => {
  it("nenhum texto visível nem rótulo acessível usa 'backlog'", async () => {
    const { container } = await painel([
      ["2026-09", ABR],
      ["2026-10", OUT],
    ])
    await screen.findByRole("region", { name: "Chamados por situação" })
    expect(container.textContent).not.toMatch(/backlog/i)
    expect(container.innerHTML).not.toMatch(/backlog/i)
  })
})
