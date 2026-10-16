import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

async function abrir(competencia: string, versao: number, entrada = false) {
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
      entrada={entrada}
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

/** Abre o "Comparar com" e escolhe a opção pelo nome, como uma pessoa faria. */
async function escolher(user: ReturnType<typeof userEvent.setup>, nome: string) {
  await user.click(screen.getByRole("combobox", { name: "Comparar com" }))
  await user.click(await screen.findByRole("option", { name: nome }))
}

/**
 * Os cruzamentos montam depois (MontarDepois: fila com rAF + timeout por bloco), então
 * aparecem tarde com a máquina carregada. Espera o bloco de verdade, sem sondar o DOM de relance.
 */
const cruzamento = (nome: string) =>
  screen.findByRole("region", { name: nome }, { timeout: 10_000 })

const kpi = (nome: string) => screen.findByRole("article", { name: nome })

describe("Painel: comparar com (D65)", () => {
  it("(a) out contra mai/26: Δ contra maio corrigido pela posição de out", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByRole("combobox", { name: "Comparar com" })
    await escolher(user, "mai/26")
    const f = await kpi("Finalizados no mês")
    expect(within(f).getByLabelText("1")).toBeInTheDocument()
    expect(within(f).getByRole("group", { name: "−1 em relação a mai/26, pior" })).toHaveTextContent("mai/26")
    expect(within(await kpi("Entradas no mês")).getByRole("group", { name: /^\+1 em relação a mai\/26/ })).toBeInTheDocument()
  })

  it("(b) out contra jun/26 (sem posição): Δ só em entradas e finalizados", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByRole("combobox", { name: "Comparar com" })
    await escolher(user, "jun/26 sem posição")
    expect(within(await kpi("Entradas no mês")).getByRole("group", { name: /^\+2 em relação a jun\/26/ })).toBeInTheDocument()
    expect(within(await kpi("Finalizados no mês")).getByRole("group", { name: /em relação a jun\/26/ })).toBeInTheDocument()
    const atraso = await kpi("Em atraso")
    expect(within(atraso).queryByRole("group")).toBeNull()
    expect(atraso).toHaveTextContent("sem posição de jun/26")
    // o aviso aparece uma vez, junto de "Comparar com", e não em cada cartão
    expect(screen.getByText(/sem posição: só entradas e finalizados/)).toBeInTheDocument()
    const card = screen.getByRole("listitem", { name: "Situação: Finalizado" })
    expect(within(card).queryByRole("group")).toBeNull()
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

  it("(d) abr v2 contra 'Abril de 2026 v1': Δ crus, sem correção entre versões", async () => {
    const user = userEvent.setup()
    await abrir("2026-04", 2)
    await screen.findByRole("combobox", { name: "Comparar com" })
    await escolher(user, "Abril de 2026 v1")
    const fin = await screen.findByRole("listitem", {
      name: "Situação: Finalizado",
    })
    expect(within(fin).getByRole("group", { name: "+2 em relação a abr/26 v1" })).toHaveTextContent("abr/26 v1")
    const em = screen.getByRole("listitem", {
      name: "Situação: Em Atendimento",
    })
    expect(within(em).getByLabelText("0")).toBeInTheDocument()
    expect(within(em).getByRole("group", { name: "−1 em relação a abr/26 v1" })).toBeInTheDocument()
  })

  it("(e) o seletor vale para os gráficos: out × mai, as barras das duas fotos por cliente", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByRole("combobox", { name: "Comparar com" })
    await escolher(user, "mai/26")
    const card = await screen.findByRole("region", { name: "Por cliente" })
    const grafico = () =>
      within(card).getByRole("img").getAttribute("aria-label")!
    // valor de out/26 com o de mai/26 (mês comparado) entre parênteses
    expect(grafico()).toMatch(
      /Cliente Ômega: Finalizados no mês 0 \(mai\/26: 1\), Não finalizados 1 \(mai\/26: 1\)/
    )
    expect(grafico()).toMatch(
      /Cliente Delta: Finalizados no mês 1 \(mai\/26: 1\), Não finalizados 1 \(mai\/26: 0\)/
    )
    expect(within(card).getAllByText(/^mai \d+$/).length).toBeGreaterThan(0)
    expect(card).not.toHaveTextContent("sem posição")
  })

  it("(f) mês sem posição: o gráfico mostra só o Mes Ref., com a nota e os finalizados vindos das datas", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByRole("combobox", { name: "Comparar com" })
    await escolher(user, "jun/26 sem posição")
    const card = await screen.findByRole("region", { name: "Por cliente" })
    const rotulo = within(card).getByRole("img").getAttribute("aria-label")!
    // só os finalizados vêm com o mês comparado; os não finalizados ficam sem ele (sem posição)
    expect(rotulo).toMatch(/Cliente Ômega: Finalizados no mês 0 \(jun\/26: 1\), Não finalizados 1(;|$)/)
    expect(card).toHaveTextContent("sem posição de jun/26")
    // cruzamentos dependem da Situação: só o Mes Ref., com a nota
    const cruz = await cruzamento("Cliente × Situação")
    expect(cruz).toHaveTextContent("sem posição de jun/26")
  })

  it("(g) trocar o Comparar com não remonta o bloco do mês: os nós ficam e só o traço do mês comparado muda de posição", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByRole("combobox", { name: "Comparar com" })
    await escolher(user, "mai/26")
    const kpiAntes = await kpi("Entradas no mês")
    const cardAntes = await screen.findByRole("region", { name: "Por cliente" })
    const marcas = (c: HTMLElement) =>
      [...c.querySelectorAll<HTMLElement>("[data-marca]")]
    const barraAntes = cardAntes.querySelector("[data-barra]")
    const traçosAntes = marcas(cardAntes)
    const lefts = (m: HTMLElement[]) => m.map((e) => e.style.left).join("|")
    const posAntes = lefts(traçosAntes)
    expect(traçosAntes.length).toBeGreaterThan(0)
    await escolher(user, "abr/26")
    const cardDepois = await screen.findByRole("region", { name: "Por cliente" })
    expect(cardDepois).toBe(cardAntes)
    expect(cardDepois.querySelector("[data-barra]")).toBe(barraAntes)
    expect(await kpi("Entradas no mês")).toBe(kpiAntes)
    expect(marcas(cardDepois)[0]).toBe(traçosAntes[0])
    expect(lefts(marcas(cardDepois))).not.toBe(posAntes)
  })

  describe("entrada das barras", () => {
    let animate: ReturnType<typeof vi.fn>
    beforeEach(() => {
      animate = vi.fn(() => ({ cancel() {} }))
      Object.defineProperty(HTMLElement.prototype, "animate", {
        configurable: true,
        value: animate,
      })
    })
    // só a entrada das barras (clip-path); o motion também usa animate em outros pontos
    const entradas = () =>
      animate.mock.calls.filter(
        ([k]) => Array.isArray(k) && k.some((f) => "clipPath" in f)
      )
    afterEach(() => {
      // @ts-expect-error remove o stub do jsdom
      delete HTMLElement.prototype.animate
    })

    it("(h) Painel aberto por revisita (entrada=false) não anima as barras, nem depois do Comparar com", async () => {
      const user = userEvent.setup()
      await abrir("2026-10", 1, false)
      await cruzamento("Área × SLA")
      await escolher(user, "mai/26")
      await cruzamento("Área × SLA")
      expect(entradas()).toHaveLength(0)
    })

    it("(i) primeira visita (entrada=true) anima as barras", async () => {
      await abrir("2026-10", 1, true)
      await cruzamento("Área × SLA")
      expect(entradas().length).toBeGreaterThan(0)
    })
  })
})
