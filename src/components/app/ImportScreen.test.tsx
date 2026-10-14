import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ImportScreen } from "./ImportScreen"

afterEach(() => vi.unstubAllEnvs())
const tela = () =>
  render(<ImportScreen state={{ status: "idle" }} onFile={() => {}} />)

describe("ImportScreen texto por modo", () => {
  it("modo API: diz que a carga fica no banco do app", () => {
    vi.stubEnv("VITE_REPOSITORIO", "api")
    tela()
    expect(screen.getByText(/banco do app e aparece em qualquer computador/)).toBeInTheDocument()
    expect(screen.queryByText(/só neste navegador/)).toBeNull()
  })
  it("modo local: mantém o texto do navegador", () => {
    vi.stubEnv("VITE_REPOSITORIO", "local")
    tela()
    expect(screen.getByText(/só neste navegador; nada é enviado/)).toBeInTheDocument()
  })
})
