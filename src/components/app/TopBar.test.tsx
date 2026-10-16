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
      onNovaCarga={() => {}}
      onHistorico={() => {}}
      podeApagar={false}
      onClear={() => {}}
      onSelectorOpenChange={() => {}}
      dica={null}
    />
  ).container.querySelector("header")!
}

describe("TopBar", () => {
  it("o slot dos filtros fica na faixa de controles, junto das ações (sem faixa própria)", () => {
    let slot: HTMLElement | null = null
    const { container } = render(
      <TopBar
        visible
        tipoNome="Chamados"
        atual={atual}
        grupos={[]}
        visoes={["painel"]}
        visao="painel"
        onSlot={(el) => {
          slot = el ?? slot
        }}
        onAbrir={() => {}}
        onVisao={() => {}}
        onNovaCarga={() => {}}
        onHistorico={() => {}}
        podeApagar={false}
        onClear={() => {}}
        onSelectorOpenChange={() => {}}
        dica={null}
      />
    )
    const acoes = screen.getByRole("button", { name: /Nova carga/ })
      .parentElement!
    expect(slot).not.toBeNull()
    expect(slot!.parentElement).toBe(acoes.parentElement)
    expect(container.querySelector("header")!.contains(slot)).toBe(true)
  })

  it("Nova carga só pede para abrir o envio (não abre o seletor do sistema)", async () => {
    const onNovaCarga = vi.fn()
    render(
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
        onNovaCarga={onNovaCarga}
        onHistorico={() => {}}
        podeApagar={false}
        onClear={() => {}}
        onSelectorOpenChange={() => {}}
        dica={null}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: /Nova carga/ }))
    expect(onNovaCarga).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText(/Arquivo da nova carga/)).toBeNull()
  })

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
            onNovaCarga={() => {}}
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

  describe("tela cheia", () => {
    const comTela = (extra: { onTelaCheia?: () => void; telaCheiaAtiva?: boolean }) =>
      render(
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
          onNovaCarga={() => {}}
          onHistorico={() => {}}
          podeApagar={false}
          onClear={() => {}}
          onSelectorOpenChange={() => {}}
          dica={null}
          {...extra}
        />
      )

    it("sem suporte (sem handler), o botão não aparece", () => {
      comTela({})
      expect(screen.queryByRole("button", { name: /tela cheia/i })).toBeNull()
    })

    it("mostra Tela cheia e chama o handler ao clicar", async () => {
      const onTelaCheia = vi.fn()
      comTela({ onTelaCheia })
      await userEvent.click(screen.getByRole("button", { name: "Tela cheia" }))
      expect(onTelaCheia).toHaveBeenCalledTimes(1)
    })

    it("em tela cheia, o botão vira Sair da tela cheia", () => {
      comTela({ onTelaCheia: () => {}, telaCheiaAtiva: true })
      expect(screen.getByRole("button", { name: "Sair da tela cheia" })).toBeInTheDocument()
    })

    it("a linha de dicas lista o atalho T", () => {
      comTela({})
      expect(screen.getByText(/T tela cheia/)).toBeInTheDocument()
    })

    it("a linha de dicas é legível na TV (text-base, não text-sm)", () => {
      comTela({})
      const dica = screen.getByText(/T tela cheia/)
      expect(dica.className).toMatch(/\btext-base\b/)
      expect(dica.className).not.toMatch(/\btext-sm\b/)
    })
  })
})
