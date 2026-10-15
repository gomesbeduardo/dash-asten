import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CargaMeta } from "@/cargas"
import type { Visao } from "@/app/navegacao"
import { TopBar } from "./TopBar"

const mockReduzido = vi.hoisted(() => ({ valor: false }))
vi.mock("motion/react", async (orig) => {
  const m = await orig<typeof import("motion/react")>()
  return { ...m, useReducedMotion: () => mockReduzido.valor }
})

const atual = {
  id: "1",
  tipo: "chamados",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-01T00:00:00Z",
} as unknown as CargaMeta

function barra(visao: Visao) {
  const props = {
    visible: true,
    tipoNome: "Chamados",
    atual,
    grupos: [],
    visoes: ["painel", "leituras", "comparar", "evolucao"] as Visao[],
    onSlot: () => {},
    onAbrir: () => {},
    onVisao: () => {},
    onNovaCarga: () => {},
    onHistorico: () => {},
    podeApagar: false,
    onClear: () => {},
    onSelectorOpenChange: () => {},
    dica: null,
  }
  const r = render(<TopBar {...props} visao={visao} />)
  return { ...r, props }
}

function ativa() {
  return screen
    .getAllByRole("tab")
    .filter((t) => t.getAttribute("aria-selected") === "true")
}

describe.each([false, true])(
  "indicador da aba (movimento reduzido=%s)",
  (reduzido) => {
    it("fica na aba ativa e passa para a nova ao trocar a visão", () => {
      mockReduzido.valor = reduzido
      const { rerender, props } = barra("painel")
      expect(ativa()).toHaveLength(1)
      expect(screen.getAllByTestId("indicador-aba")).toHaveLength(1)

      rerender(<TopBar {...props} visao="comparar" />)
      expect(ativa()[0].textContent).toMatch(/Comparar/)
      expect(screen.getAllByTestId("indicador-aba")).toHaveLength(1)
    })
  }
)

/**
 * O vermelho real do bug (indicador voando na vertical quando a troca encurta a página rolada) é a
 * medição no navegador (scripts-medicao/indicador); o jsdom não faz layout. Aqui fica o contrato do
 * conserto: um indicador único, fora das abas, posicionado só por x e largura (offsetLeft/offsetWidth).
 */
describe("indicador da aba só anda na horizontal", () => {
  const medidas: Record<string, { left: number; width: number }> = {
    Painel: { left: 0, width: 80 },
    Leituras: { left: 84, width: 90 },
    Comparar: { left: 178, width: 100 },
  }
  const original = {
    left: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetLeft"),
    width: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth"),
  }
  beforeEach(() => {
    mockReduzido.valor = true // duração 0: o estilo final aparece sem esperar a mola
    const medida = (el: HTMLElement) => medidas[el.textContent ?? ""]
    Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
      configurable: true,
      get(this: HTMLElement) {
        return medida(this)?.left ?? 0
      },
    })
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return medida(this)?.width ?? 0
      },
    })
  })
  afterEach(() => {
    for (const [k, d] of [["offsetLeft", original.left], ["offsetWidth", original.width]] as const) {
      if (d) Object.defineProperty(HTMLElement.prototype, k, d)
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[k]
    }
  })

  it("é um só elemento, filho da lista de abas e não de uma aba", () => {
    barra("painel")
    const indicador = screen.getByTestId("indicador-aba")
    expect(indicador.parentElement).toBe(screen.getByRole("tablist"))
    expect(indicador.closest('[role="tab"]')).toBeNull()
  })

  it("x e largura seguem a aba ativa; nenhum deslocamento vertical", async () => {
    const { rerender, props } = barra("painel")
    const indicador = screen.getByTestId("indicador-aba")
    await waitFor(() => expect(indicador.style.width).toBe("80px"))

    rerender(<TopBar {...props} visao="comparar" />)
    await waitFor(() => expect(indicador.style.width).toBe("100px"))
    expect(indicador.style.transform).toMatch(/translateX\(178px\)/)
    expect(indicador.style.transform).not.toMatch(/translateY/)
  })
})
