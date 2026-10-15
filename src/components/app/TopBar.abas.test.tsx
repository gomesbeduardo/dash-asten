import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
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
      expect(within(ativa()[0]).getByTestId("indicador-aba")).toBeTruthy()
      expect(screen.getAllByTestId("indicador-aba")).toHaveLength(1)

      rerender(<TopBar {...props} visao="comparar" />)
      expect(ativa()[0].textContent).toMatch(/Comparar/)
      expect(within(ativa()[0]).getByTestId("indicador-aba")).toBeTruthy()
      expect(screen.getAllByTestId("indicador-aba")).toHaveLength(1)
    })
  }
)
