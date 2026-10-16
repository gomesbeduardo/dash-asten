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
import { PainelChamados } from "./PainelChamados"

beforeEach(() => {
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
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("Painel: faixa 'Estamos melhorando?'", () => {
  it("fora da tela, sai do esqueleto em ~300 ms, não em 1500 ms", async () => {
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
    // a faixa existe (Painel já com dados) e começa em esqueleto
    await waitFor(() =>
      expect(container.querySelector("#faixa-melhorando")).not.toBeNull()
    )
    const esqueleto = () => screen.queryByText("Carregando a evolução…")
    expect(esqueleto()).toBeInTheDocument()
    // com o limite antigo (1500 ms) isto estoura o prazo de 1000 ms
    await waitFor(() => expect(esqueleto()).not.toBeInTheDocument(), {
      timeout: 1000,
    })
  })
})
