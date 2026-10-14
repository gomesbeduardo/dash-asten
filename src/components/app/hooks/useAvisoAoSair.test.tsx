import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useAvisoAoSair } from "./useAvisoAoSair"

function Harness({ ativo }: { ativo: boolean }) {
  useAvisoAoSair(ativo)
  return null
}
function sair() {
  const ev = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(ev)
  return ev
}

describe("useAvisoAoSair", () => {
  it("com envio em andamento, pede confirmação ao fechar ou recarregar", () => {
    render(<Harness ativo />)
    expect(sair().defaultPrevented).toBe(true)
  })

  it("sem envio, não interfere", () => {
    render(<Harness ativo={false} />)
    expect(sair().defaultPrevented).toBe(false)
  })

  it("some quando o envio termina", () => {
    const { rerender } = render(<Harness ativo />)
    rerender(<Harness ativo={false} />)
    expect(sair().defaultPrevented).toBe(false)
  })
})
