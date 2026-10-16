import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { foto, out } from "@/chamados/fotos-teste"
import { montarWorkbook } from "@/chamados/test-util"
import { reiniciarFilaMontagem } from "@/components/app/motion/MontarDepois"
const montagens = vi.hoisted(() => ({
  props: [] as { aoVisivel?: boolean; limite?: number }[],
}))
vi.mock("@/components/app/motion/MontarDepois", async (orig) => {
  const real = await orig<typeof import("@/components/app/motion/MontarDepois")>()
  return {
    ...real,
    MontarDepois: (p: Parameters<typeof real.MontarDepois>[0]) => {
      montagens.props.push({ aoVisivel: p.aoVisivel, limite: p.limite })
      return <real.MontarDepois {...p} />
    },
  }
})

import { PainelChamados } from "./PainelChamados"

beforeEach(() => {
  montagens.props.length = 0
  registrarTiposDoApp()
  reiniciarFilaMontagem()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  // faixa fora da tela: o observador nunca vê interseção
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Painel: faixa 'Estamos melhorando?'", () => {
  // O prazo em si (300 ms de relógio falso) é testado em MontarDepois.test; aqui só a ligação.
  it("a faixa fora da tela pede o limite curto de 300 ms ao MontarDepois", async () => {
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const meta = await repo.salvar({
      tipo: "chamados",
      competencia: "2026-10",
      arquivo: "out.xlsx",
      workbook: montarWorkbook(foto(out, "2026-10-01")),
    })
    const carga = (await repo.obter(meta.id)) as Carga
    const historico = await repo.listar()
    const { container } = render(
      <PainelChamados
        carga={carga}
        historico={historico}
        obterCarga={(id: string) => repo.obter(id)}
        entrada={false}
      />
    )
    await waitFor(() =>
      expect(container.querySelector("#faixa-melhorando")).not.toBeNull()
    )
    expect(screen.getByText("Carregando a evolução…")).toBeInTheDocument()
    const faixa = montagens.props.filter((p) => p.aoVisivel)
    expect(faixa.length).toBeGreaterThan(0)
    expect(faixa.every((p) => p.limite === 300)).toBe(true)
  })
})
