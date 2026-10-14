import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import type { AutoDashboard, Sheet } from "@/core"
import { AutoPanel } from "./AutoPanel"

const dash: AutoDashboard = {
  kpis: [
    {
      id: "a",
      label: "Total de linhas",
      value: 1234,
      format: "integer",
      hint: "no filtro",
    },
    {
      id: "b",
      label: "Atingimento",
      value: 87.3,
      format: "percent",
      tone: "good",
    },
    { id: "c", label: "Média", value: null, format: "decimal" },
    {
      id: "d",
      label: "Período",
      value: 1,
      format: "integer",
      display: "jan/25 a dez/25",
    },
  ],
  charts: [
    {
      id: "g1",
      kind: "line",
      title: "Meta × Realizado por mês",
      subtitle: "Soma por mês",
      xLabel: "Mês",
      valueFormat: "integer",
      series: [
        { key: "meta", label: "Meta", role: "meta" },
        { key: "real", label: "Realizado", role: "realizado" },
      ],
      data: [
        { x: "jan", meta: 100, real: 90 },
        { x: "fev", meta: 110, real: 95 },
      ],
    },
    {
      id: "g2",
      kind: "bar",
      title: "Por área",
      subtitle: "Contagem",
      xLabel: "Área",
      valueFormat: "integer",
      horizontal: true,
      series: [{ key: "n", label: "Linhas", role: "default" }],
      data: [],
    },
  ],
}

vi.mock("@/core", async (orig) => ({
  ...(await orig<typeof import("@/core")>()),
  buildAutoDashboard: vi.fn(() => dash),
}))
vi.mock("motion/react", async (orig) => ({
  ...(await orig<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const sheet: Sheet = {
  id: "s",
  name: "Aba",
  index: 0,
  columns: [
    {
      key: "k",
      label: "Coluna",
      type: "text",
      filterable: true,
      distinctCount: 1,
    },
  ],
  rows: [{ k: "valor-da-tabela" }],
}

const setup = () =>
  render(<AutoPanel sheet={sheet} rows={sheet.rows} filters={{}} />)

describe("AutoPanel", () => {
  it("mostra selo, KPIs formatados em pt-BR e o valor final de imediato", () => {
    setup()
    expect(screen.getByText("automático")).toBeInTheDocument()
    expect(screen.getByLabelText("1.234")).toHaveTextContent("1.234")
    expect(screen.getByLabelText("87,3%")).toHaveTextContent("87,3%")
    expect(screen.getByText("jan/25 a dez/25")).toBeInTheDocument()
    expect(screen.getByText("no filtro")).toBeInTheDocument()
    expect(screen.getByText("Bom")).toBeInTheDocument() // tom com texto, não só cor
  })

  it("valor nulo vira traço", () => {
    setup()
    const kpi = screen.getByRole("article", { name: "Média" })
    expect(within(kpi).getByLabelText("—")).toHaveTextContent("—")
  })

  it("mostra título e subtítulo dos gráficos, sem tabela de linhas soltas (D36)", () => {
    setup()
    expect(screen.getByText("Meta × Realizado por mês")).toBeInTheDocument()
    expect(screen.getByText("Soma por mês")).toBeInTheDocument()
    expect(screen.getByText("Sem dados para este filtro")).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Dados" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("valor-da-tabela")).not.toBeInTheDocument()
    expect(screen.queryByRole("table", { name: /Tabela da aba/ })).toBeNull()
  })

  it("Ver dados alterna para a tabela do gráfico", async () => {
    const user = userEvent.setup()
    setup()
    const card = screen.getByRole("region", {
      name: "Meta × Realizado por mês",
    })
    const btn = within(card).getByRole("button", { name: /Ver dados/ })
    expect(btn).toHaveAttribute("aria-pressed", "false")
    await user.click(btn)
    expect(btn).toHaveAttribute("aria-pressed", "true")
    const table = within(card).getByRole("table")
    expect(within(table).getByText("fev")).toBeInTheDocument()
    expect(within(table).getByText("110")).toBeInTheDocument()
  })

  it("legenda oculta e mostra a série (aria-pressed)", async () => {
    const user = userEvent.setup()
    setup()
    const meta = screen.getByRole("button", { name: "Meta" })
    expect(meta).toHaveAttribute("aria-pressed", "true")
    await user.click(meta)
    expect(meta).toHaveAttribute("aria-pressed", "false")
  })
})
