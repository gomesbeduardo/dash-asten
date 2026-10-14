import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SessaoContext } from "@/app/sessao/SessaoContext"
import type { CargaMeta } from "@/cargas"
import { TopBar } from "./TopBar"

const atual = {
  id: "1",
  tipo: "chamados",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-01T00:00:00Z",
} as unknown as CargaMeta

function barra(visible: boolean) {
  return render(
    <TopBar
      visible={visible}
      tipoNome="Chamados"
      atual={atual}
      grupos={[]}
      visoes={["painel"]}
      visao="painel"
      onSlot={() => {}}
      onAbrir={() => {}}
      onVisao={() => {}}
      onPickFile={() => {}}
      onHistorico={() => {}}
      podeApagar={false}
      onClear={() => {}}
      onSelectorOpenChange={() => {}}
      dica={null}
    />
  ).container.querySelector("header")!
}

describe("TopBar", () => {
  it("escondida sai inteira para cima (-100%), sem eventos de ponteiro", () => {
    const h = barra(false)
    expect(h.dataset.visible).toBe("false")
    expect(h.style.transform).toContain("-100%")
    expect(h.className).toContain("pointer-events-none")
  })

  it("visível fica na posição, sobreposta ao conteúdo", () => {
    const h = barra(true)
    expect(h.style.transform).not.toContain("-100%")
    expect(h.className).toContain("fixed")
  })

  describe("botão Sair", () => {
    afterEach(() => vi.unstubAllEnvs())
    const comSessao = (sair: () => Promise<void>) =>
      render(
        <SessaoContext.Provider value={{ sair }}>
          <TopBar
            visible
            tipoNome="Chamados"
            atual={atual}
            grupos={[]}
            visoes={["painel"]}
            visao="painel"
            onSlot={() => {}}
            onAbrir={() => {}}
            onVisao={() => {}}
            onPickFile={() => {}}
            onHistorico={() => {}}
            podeApagar={false}
            onClear={() => {}}
            onSelectorOpenChange={() => {}}
            dica={null}
          />
        </SessaoContext.Provider>
      )

    it("com login em uso, existe e chama sair", async () => {
      vi.stubEnv("VITE_REPOSITORIO", "api")
      vi.stubEnv("VITE_LOGIN", "")
      const sair = vi.fn(async () => undefined)
      comSessao(sair)
      await userEvent.click(screen.getByRole("button", { name: "Sair" }))
      expect(sair).toHaveBeenCalledTimes(1)
    })

    it("sem login em uso, não existe", () => {
      vi.stubEnv("VITE_REPOSITORIO", "api")
      vi.stubEnv("VITE_LOGIN", "desativado")
      comSessao(async () => undefined)
      expect(screen.queryByRole("button", { name: "Sair" })).toBeNull()
    })
  })
})
