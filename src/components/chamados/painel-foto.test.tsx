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
// Posição de teste abr v1 (mesmos dados de docs/exemplos/gerar-teste-foto.cjs)
const ABR: L[] = [
  ["2026-04-03", 5000, "Cliente Ômega", "Em Atendimento", null],
  ["2026-01-18", 5003, "Cliente Ômega", "Em Análise", null],
  ["2026-03-10", 5005, "Cliente Delta", "Finalizado", "2026-04-08"],
  ["2026-04-02", 5007, "Cliente Delta", "Finalizado", "2026-04-12"],
  ["2025-12-05", 5010, "Cliente Ômega", "Aguardando aceite", "2026-04-25"],
]
// Posição de teste out: salto de meses, situação nova e um aberto depois do Mes Ref.
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

describe("Painel: faixa do topo por Situação (decisão 26)", () => {
  it("foto abr v1: total à esquerda e uma barra empilhada com as 4 situações e a legenda com contagens", async () => {
    await painel([["2026-04", ABR]])
    const topo = await screen.findByRole("region", {
      name: "Chamados por situação",
    })
    const total = within(topo).getByRole("article", {
      name: "Total de chamados",
    })
    expect(within(total).getByLabelText("5")).toBeInTheDocument()
    const barra = within(topo).getByRole("img", { name: /^Situações:/ })
    expect(barra.getAttribute("aria-label")).toBe(
      "Situações: Finalizado 2; Aguardando aceite 1; Em Análise 1; Em Atendimento 1"
    )
    expect(barra.querySelectorAll("[data-situacao]")).toHaveLength(4)
    const itens = within(topo).getAllByRole("listitem")
    expect(itens.map((i) => i.getAttribute("aria-label"))).toEqual([
      "Situação: Finalizado",
      "Situação: Aguardando aceite",
      "Situação: Em Análise",
      "Situação: Em Atendimento",
    ])
    expect(
      within(
        within(topo).getByRole("listitem", { name: "Situação: Finalizado" })
      ).getByLabelText("2")
    ).toBeInTheDocument()
    expect(
      within(
        within(topo).getByRole("listitem", { name: "Situação: Em Análise" })
      ).getByLabelText("1")
    ).toBeInTheDocument()
    // sem carga anterior: nada de Δ
    expect(topo).not.toHaveTextContent(/sem base|vs /)
    expect(within(topo).queryByRole("group")).toBeNull()
  })

  it("foto out: situação nova na legenda, com Δ contra o mês anterior e 'nova'", async () => {
    await painel([
      ["2026-09", ABR],
      ["2026-10", OUT],
    ])
    const topo = await screen.findByRole("region", {
      name: "Chamados por situação",
    })
    const item = (n: string) =>
      within(topo).getByRole("listitem", { name: `Situação: ${n}` })
    expect(item("Aguardando cliente")).toHaveTextContent("nova")
    expect(within(item("Finalizado")).getByLabelText("8")).toBeInTheDocument()
    // set/26 é corrigido pela posição de out (D65): 5000 e 5003 já estavam finalizados lá. 5010 estava
    // "Aguardando aceite" e a out não traz Data de Aceite: continua aguardando (posição de set estava certa)
    expect(within(item("Finalizado")).getByRole("group", { name: "+4 em relação a set/26" })).toHaveTextContent("set/26")
    expect(item("Em Análise")).toHaveTextContent("nova")
    const total = within(topo).getByRole("article", {
      name: "Total de chamados",
    })
    expect(within(total).getByRole("group", { name: "+5 em relação a set/26" })).toBeInTheDocument()
    expect(total).toHaveTextContent("10")
    // o aberto depois do Mes Ref. fica só na nota
    expect(screen.getByLabelText("Avisos")).toHaveTextContent(
      "1 aberto depois do mês de referência"
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
    expect(grafico()).toMatch(/Cliente Ômega: Finalizados no mês 0, Não finalizados 1/)
    expect(grafico()).toMatch(/Cliente Delta: Finalizados no mês 1, Não finalizados 1/)

    await user.click(
      within(card).getByRole("button", { name: "Comparar período" })
    )
    await user.click(within(card).getByRole("combobox", { name: "Período" }))
    await user.click(await screen.findByRole("option", { name: "Últimos 6 meses" }))
    expect(grafico()).toMatch(/Cliente Ômega: Finalizados no período 2, Não finalizados 1/)
    expect(grafico()).toMatch(/Cliente Delta: Finalizados no período 2, Não finalizados 1/)
    expect(card).toHaveTextContent(/últimos 6 meses/)

    // desligar volta ao mês
    await user.click(
      within(card).getByRole("button", { name: "Comparar período" })
    )
    expect(grafico()).toMatch(/Cliente Ômega: Finalizados no mês 0, Não finalizados 1/)
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
