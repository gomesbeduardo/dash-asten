import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Avisos } from "./Avisos"

describe("Avisos", () => {
  it("avisos simultâneos ficam no mesmo contêiner de pilha", () => {
    render(
      <Avisos
        itens={[
          { id: "abrindo", conteudo: "Abrindo a carga…" },
          {
            id: "aviso",
            conteudo: (
              <>
                3 de 3 guardadas<button type="button">Fechar</button>
              </>
            ),
          },
        ]}
      />
    )
    const pilha = screen.getByTestId("pilha-avisos")
    expect(within(pilha).getByText("Abrindo a carga…")).toBeInTheDocument()
    expect(within(pilha).getByText(/3 de 3 guardadas/)).toBeInTheDocument()
    expect(within(pilha).getAllByRole("status")).toHaveLength(2)
  })
})
