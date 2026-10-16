import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import {
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { foto, mai, out, v1, v2, type L } from "@/chamados/fotos-teste"
import { montarWorkbook } from "@/chamados/test-util"
import type { VisaoTipoProps } from "@/panels/tipos"
import { CompararChamados } from "./CompararChamados"
import { FiltrosChamadosProvider } from "./filtros"
import { pedirComparacao } from "./pedidoComparar"

type Foto = { competencia: string; linhas: L[]; mesRef: string }
const ABR1: Foto = { competencia: "2026-04", linhas: v1, mesRef: "2026-04-30" }
const ABR2: Foto = { competencia: "2026-04", linhas: v2, mesRef: "2026-04-30" }
const MAI: Foto = { competencia: "2026-05", linhas: mai, mesRef: "2026-05-31" }
const OUT: Foto = { competencia: "2026-10", linhas: out, mesRef: "2026-10-31" }

/** Carrega as fotos em ordem e abre a última delas. */
async function cenario(fotos: Foto[], abrir = fotos.length - 1) {
  const repo: RepositorioDeCargas = criarRepositorioMemoria()
  const ids: string[] = []
  for (const f of fotos) {
    const m = await repo.salvar({
      tipo: "chamados",
      competencia: f.competencia,
      arquivo: `foto-${f.competencia}.xlsx`,
      workbook: montarWorkbook(foto(f.linhas, f.mesRef)),
    })
    ids.push(m.id)
  }
  const props: VisaoTipoProps = {
    carga: (await repo.obter(ids[abrir])) as Carga,
    historico: await repo.listar(),
    obterCarga: (id) => repo.obter(id),
    entrada: false,
  }
  return props
}

const ui = (p: VisaoTipoProps) => (
  <FiltrosChamadosProvider carga={p.carga}>
    <CompararChamados {...p} />
  </FiltrosChamadosProvider>
)

const seletores = () =>
  screen.getAllByRole("combobox", { name: /^Competência \d$/ })
const cabecalhos = () =>
  screen.getAllByRole("columnheader").map((c) => c.textContent?.trim())
const celulas = (nome: RegExp) =>
  within(screen.getByRole("row", { name: nome }))
    .getAllByRole("cell")
    .map((c) => c.textContent?.replace(/\s+/g, " ").trim())

async function escolher(indice: number, opcao: RegExp) {
  const user = userEvent.setup()
  await user.click(seletores()[indice])
  await user.click(await screen.findByRole("option", { name: opcao }))
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

describe("Comparar com fotos (D65/D66)", () => {
  it("(a) abr v1 × abr v2 lado a lado, sem correção entre si", async () => {
    render(ui(await cenario([ABR1, ABR2])))
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await escolher(0, /Abril de 2026 · v1/)
    expect(seletores()[1]).toHaveTextContent("Abril de 2026 · v2 (atual)")
    expect(cabecalhos()).toEqual([
      "Indicador",
      "abr/26 · v1",
      "abr/26 · v2",
      "Δ",
    ])
    expect(celulas(/^Entradas/).slice(0, 2)).toEqual(["2", "3"])
    expect(celulas(/^Em atraso/).slice(0, 2)).toEqual(["2", "1"])
    expect(celulas(/^Em Atendimento/).slice(0, 2)).toEqual(["1", "0"])
    expect(celulas(/^Finalizado\b/).slice(0, 2)).toEqual(["2", "4"])
    // v1 e v2 não se corrigem entre si: nenhuma marca
    expect(screen.queryByText(/corrigido pela foto/)).toBeNull()
  })

  it("(b) com mai e out carregados, a coluna de maio mostra finalizados 2 com a marca 'era 1'", async () => {
    render(ui(await cenario([MAI, OUT])))
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    expect(cabecalhos()).toEqual(["Indicador", "mai/26", "out/26", "Δ"])
    const secao = screen.getByRole("region", {
      name: "Indicadores lado a lado",
    })
    const card = within(secao).getByRole("article", {
      name: /^Finalizados no mês/,
    })
    expect(card).toHaveTextContent("corrigido pela posição de out/26")
    expect(card).toHaveTextContent("era 1")
    expect(celulas(/^Finalizados no mês/).slice(0, 2)[0]).toContain("2")
    // indicador que não mudou fica sem marca
    const atraso = within(secao).getByRole("article", { name: /^Em atraso/ })
    expect(atraso).not.toHaveTextContent("corrigido")
    // legenda do símbolo "corrigido"
    expect(
      within(
        screen.getByRole("region", { name: "Legenda dos símbolos" })
      ).getByText("Corrigido")
    ).toBeInTheDocument()
  })

  it("(c) coluna de mês sem posição: entradas e finalizados pelas datas, o resto '—' com a nota", async () => {
    render(ui(await cenario([MAI, OUT])))
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await escolher(0, /Junho de 2026 \(sem posição\)/)
    expect(cabecalhos()).toEqual(["Indicador", "jun/26", "out/26", "Δ"])
    expect(celulas(/^Entradas/)[0]).toBe("0")
    expect(celulas(/^Finalizados no mês/)[0]).toBe("1")
    const nao = celulas(/^Não finalizados/)[0]
    expect(nao).toContain("—")
    expect(nao).toContain("sem posição de jun/26")
    // cards por Situação também ficam "—" na coluna sem posição
    expect(celulas(/^Em Análise/)[0]).toContain("—")
  })

  it("lista os meses sem posição marcados e desdobra as versões do mês", async () => {
    render(ui(await cenario([ABR1, ABR2, MAI, OUT])))
    const user = userEvent.setup()
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(seletores()[0])
    expect(
      await screen.findByRole("option", {
        name: /Setembro de 2026 \(sem posição\)/,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Abril de 2026 · v2 (atual)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Abril de 2026 · v1" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Maio de 2026" })
    ).toBeInTheDocument()
    expect(screen.queryByText(/backlog|reconstru/i)).toBeNull()
  })

  it("o seletor não lista meses anteriores à carga mais antiga", async () => {
    render(ui(await cenario([ABR1, MAI, OUT])))
    const user = userEvent.setup()
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(seletores()[0])
    await screen.findByRole("option", { name: "Maio de 2026" })
    expect(
      screen.getByRole("option", { name: "Abril de 2026" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /Março de 2026/ })).toBeNull()
    expect(screen.queryByRole("option", { name: /Setembro de 2025/ })).toBeNull()
  })

  it("(d) o pedido do Histórico abre as duas versões do mês", async () => {
    const p = await cenario([ABR1, ABR2])
    pedirComparacao({ competencia: "2026-04", versoes: [1, 2] })
    render(ui(p))
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    expect(cabecalhos()).toEqual([
      "Indicador",
      "abr/26 · v1",
      "abr/26 · v2",
      "Δ",
    ])
    expect(celulas(/^Entradas/).slice(0, 2)).toEqual(["2", "3"])
  })
})
