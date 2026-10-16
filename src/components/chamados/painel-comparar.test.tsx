import { render, screen, waitFor, within } from "@testing-library/react"
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
import { CAB, mai, out, v1, v2, type L } from "@/chamados/fotos-teste"
import { PainelChamados } from "./PainelChamados"

const d = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null)

/** As 4 fotos de docs/exemplos/teste-foto como planilhas de verdade (a coluna Mes Ref. vai vazia: a competência vem da carga). */
function xlsx(linhas: L[], mesRef: string) {
  return makeXlsx({
    Dados: [
      CAB,
      ...linhas.map((r) => [
        d(mesRef),
        d(r[0] as string),
        r[1],
        r[2],
        r[3],
        r[4],
        r[5],
        r[6],
        r[7],
        d(r[8]),
        d(r[9]),
        d(r[10]),
        d(r[11]),
        r[12],
        r[13],
        r[14],
        r[15],
      ]),
    ],
  })
}

const FOTOS: [string, L[], string][] = [
  ["2026-04", v1, "2026-04-30"],
  ["2026-04", v2, "2026-04-30"],
  ["2026-05", mai, "2026-05-31"],
  ["2026-10", out, "2026-10-31"],
]

async function abrir(competencia: string, versao: number) {
  const repo: RepositorioDeCargas = criarRepositorioMemoria()
  for (const [c, linhas, ref] of FOTOS) {
    await repo.salvar({
      tipo: "chamados",
      competencia: c,
      arquivo: `ch-${c}.xlsx`,
      workbook: readWorkbook(xlsx(linhas, ref), `ch-${c}.xlsx`),
    })
  }
  const historico = await repo.listar()
  const meta = historico.find(
    (m) => m.competencia === competencia && m.versao === versao
  )!
  const carga = (await repo.obter(meta.id)) as Carga
  render(
    <PainelChamados
      carga={carga}
      historico={historico}
      obterCarga={(id: string) => repo.obter(id)}
      entrada={false}
    />
  )
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

const kpi = (nome: string) => screen.findByRole("article", { name: nome })
/** O “Por cliente” do bloco “No mês” (a Evolução tem outro, com o mesmo nome). */
const porClienteNoMes = async () =>
  within(await screen.findByRole("region", { name: "No mês" })).findByRole(
    "region",
    { name: "Por cliente" }
  )

describe("Painel: comparar com (D65)", () => {
  it("(a) out contra mai/26: Δ contra maio corrigido pela posição de out", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(screen.getByLabelText("Comparar com"), "mai/26")
    const f = await kpi("Finalizados no mês")
    expect(within(f).getByLabelText("1")).toBeInTheDocument()
    expect(f).toHaveTextContent("-1 vs mai/26")
    expect(await kpi("Entradas no mês")).toHaveTextContent("+1 vs mai/26")
  })

  it("(b) out contra jun/26 (sem posição): Δ só em entradas e finalizados", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(
      screen.getByLabelText("Comparar com"),
      "jun/26 (sem posição)"
    )
    expect(await kpi("Entradas no mês")).toHaveTextContent("+2 vs jun/26")
    expect(await kpi("Finalizados no mês")).toHaveTextContent("vs jun/26")
    const atraso = await kpi("Em atraso")
    expect(atraso).toHaveTextContent("— vs jun/26")
    expect(atraso).toHaveTextContent("sem posição de jun/26")
    const card = screen.getByRole("listitem", { name: "Situação: Finalizado" })
    expect(card).toHaveTextContent("sem posição de jun/26")
  })

  it("(c) mai com out carregado: valores corrigidos com a marca 'era 1'", async () => {
    await abrir("2026-05", 1)
    const fin = await kpi("Finalizados no mês")
    expect(within(fin).getByLabelText("2")).toBeInTheDocument()
    expect(fin).toHaveTextContent("corrigido pela posição de out/26 · era 1")
    // o que não mudou fica sem marca
    expect(await kpi("Entradas no mês")).not.toHaveTextContent("corrigido")
    const card = screen.getByRole("listitem", { name: "Situação: Finalizado" })
    expect(card).toHaveTextContent("corrigido pela posição de out/26 · era 5")
  })

  it("(d) abr v2 contra 'Abril de 2026 · v1': Δ crus, sem correção entre versões", async () => {
    const user = userEvent.setup()
    await abrir("2026-04", 2)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(
      screen.getByLabelText("Comparar com"),
      "Abril de 2026 · v1"
    )
    const fin = await screen.findByRole("listitem", {
      name: "Situação: Finalizado",
    })
    expect(fin).toHaveTextContent("+2 vs abr/26 · v1")
    const em = screen.getByRole("listitem", {
      name: "Situação: Em Atendimento",
    })
    expect(within(em).getByLabelText("0")).toBeInTheDocument()
    expect(em).toHaveTextContent("-1 vs abr/26 · v1")
  })

  it("(e) o seletor vale para os gráficos: out × mai, as barras das duas fotos por cliente", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(screen.getByLabelText("Comparar com"), "mai/26")
    const card = await porClienteNoMes()
    const grafico = () =>
      within(card).getByRole("img").getAttribute("aria-label")!
    expect(grafico()).toMatch(
      /^Finalizados · mai\/26 contra Finalizados · out\/26 contra Não finalizados · mai\/26 contra Não finalizados · out\/26/
    )
    // [finalizados mai, finalizados out, não finalizados mai, não finalizados out]
    expect(grafico()).toMatch(/Cliente Ômega 1, 0, 1, 1/)
    expect(grafico()).toMatch(/Cliente Delta 1, 1, 0, 1/)
    expect(card).not.toHaveTextContent("sem posição")
  })

  it("(f) mês sem posição: o gráfico mostra só o Mes Ref., com a nota e os finalizados vindos das datas", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(
      screen.getByLabelText("Comparar com"),
      "jun/26 (sem posição)"
    )
    const card = await porClienteNoMes()
    const rotulo = within(card).getByRole("img").getAttribute("aria-label")!
    expect(rotulo).toMatch(/Finalizados · jun\/26/)
    expect(rotulo).not.toMatch(/Não finalizados · jun\/26/)
    expect(rotulo).toMatch(/Cliente Ômega 1, 0, 1/)
    expect(card).toHaveTextContent("sem posição de jun/26")
    // cruzamentos dependem da Situação: só o Mes Ref., com a nota
    const cruz = await screen.findByRole("region", {
      name: "Cliente × Situação",
    })
    expect(cruz).toHaveTextContent("sem posição de jun/26")
  })

  it("(g) cruzamentos: Cliente × Situação mostra o Mes Ref. e o mês escolhido", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(screen.getByLabelText("Comparar com"), "mai/26")
    for (const nome of [
      "Cliente × Situação",
      "Operador × Atraso",
      "Área × SLA",
      "Cliente × Tempo médio",
    ]) {
      const r = await screen.findByRole("region", { name: nome })
      expect(r).toHaveTextContent("out/26")
      expect(r).toHaveTextContent("mai/26")
    }
  })

})
