import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ImportScreen } from "./ImportScreen"

afterEach(() => vi.unstubAllEnvs())
const tela = () =>
  render(<ImportScreen state={{ status: "idle" }} onFiles={() => {}} />)

describe("ImportScreen texto por modo", () => {
  it("modo API: texto curto, sem falar do banco nem de telas", () => {
    vi.stubEnv("VITE_REPOSITORIO", "api")
    tela()
    expect(
      screen.getByText(
        "Escolha a planilha do mês (ou várias de uma vez) e confirme o tipo e a competência."
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/banco do app/)).toBeNull()
    expect(screen.queryByText(/vira telas/)).toBeNull()
    expect(screen.queryByText(/só neste navegador/)).toBeNull()
  })
  it("modo local: mantém o texto do navegador", () => {
    vi.stubEnv("VITE_REPOSITORIO", "local")
    tela()
    expect(
      screen.getByText(/só neste navegador; nada é enviado/)
    ).toBeInTheDocument()
    expect(screen.queryByText(/vira telas/)).toBeNull()
  })
})
