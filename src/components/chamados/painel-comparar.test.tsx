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

describe("Painel: comparar com (D65)", () => {
  it("(a) out contra mai/26: Δ contra maio corrigido pela foto de out", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(screen.getByLabelText("Comparar com"), "mai/26")
    const f = await kpi("Finalizados no mês")
    expect(within(f).getByLabelText("1")).toBeInTheDocument()
    expect(f).toHaveTextContent("-1 vs mai/26")
    expect(await kpi("Entradas no mês")).toHaveTextContent("+1 vs mai/26")
  })

  it("(b) out contra jun/26 (sem foto): Δ só em entradas e finalizados", async () => {
    const user = userEvent.setup()
    await abrir("2026-10", 1)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(
      screen.getByLabelText("Comparar com"),
      "jun/26 (sem foto)"
    )
    expect(await kpi("Entradas no mês")).toHaveTextContent("+2 vs jun/26")
    expect(await kpi("Finalizados no mês")).toHaveTextContent("vs jun/26")
    const atraso = await kpi("Em atraso")
    expect(atraso).toHaveTextContent("— vs jun/26")
    expect(atraso).toHaveTextContent("sem foto de jun/26")
    const card = screen.getByRole("article", { name: "Situação: Finalizado" })
    expect(card).toHaveTextContent("sem foto de jun/26")
  })

  it("(c) mai com out carregado: valores corrigidos com a marca 'era 1'", async () => {
    await abrir("2026-05", 1)
    const fin = await kpi("Finalizados no mês")
    expect(within(fin).getByLabelText("2")).toBeInTheDocument()
    expect(fin).toHaveTextContent("corrigido pela foto de out/26 · era 1")
    // o que não mudou fica sem marca
    expect(await kpi("Entradas no mês")).not.toHaveTextContent("corrigido")
    const card = screen.getByRole("article", { name: "Situação: Finalizado" })
    expect(card).toHaveTextContent("corrigido pela foto de out/26 · era 5")
  })

  it("(d) abr v2 contra 'Abril de 2026 · v1': Δ crus, sem correção entre versões", async () => {
    const user = userEvent.setup()
    await abrir("2026-04", 2)
    await screen.findByLabelText("Comparar com")
    await user.selectOptions(
      screen.getByLabelText("Comparar com"),
      "Abril de 2026 · v1"
    )
    const fin = await screen.findByRole("article", {
      name: "Situação: Finalizado",
    })
    expect(fin).toHaveTextContent("+2 vs abr/26 · v1")
    const em = screen.getByRole("article", { name: "Situação: Em Atendimento" })
    expect(within(em).getByLabelText("0")).toBeInTheDocument()
    expect(em).toHaveTextContent("-1 vs abr/26 · v1")
  })
})
