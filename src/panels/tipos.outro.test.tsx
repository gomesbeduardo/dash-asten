import { render } from "@testing-library/react"
import { useEffect } from "react"
import { describe, expect, it, vi } from "vitest"
import type { Carga } from "@/cargas"
import { visoesDoTipo } from "./tipos"

const mocks = vi.hoisted(() => ({ montagens: 0 }))

vi.mock("@/components/app/PainelOutro", () => ({
  PainelOutro: () => {
    useEffect(() => {
      mocks.montagens++
    }, [])
    return null
  },
}))

const c = (id: string) => ({ id, tipo: "outro" }) as unknown as Carga

describe("tipo genérico: cada carga tem as suas abas e filtros", () => {
  it("trocar a carga remonta o painel (o estado por planilha não vaza de uma carga à outra)", () => {
    const { Painel } = visoesDoTipo("outro")
    const props = (carga: Carga) => ({
      carga,
      historico: [],
      obterCarga: async () => carga,
      entrada: false,
    })
    const { rerender } = render(<Painel {...props(c("1"))} />)
    rerender(<Painel {...props(c("2"))} />)
    expect(mocks.montagens).toBe(2)
  })
})
