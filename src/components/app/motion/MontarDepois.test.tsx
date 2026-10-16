import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MontarDepois, reiniciarFilaMontagem } from "./MontarDepois"

beforeEach(() => {
  reiniciarFilaMontagem()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const cena = (props = {}) => (
  <MontarDepois reservado={<p>reservado</p>} {...props}>
    <p>conteúdo</p>
  </MontarDepois>
)

describe("MontarDepois", () => {
  it("mostra o reservado no 1º quadro e os filhos na tarefa seguinte", () => {
    render(cena())
    expect(screen.getByText("reservado")).toBeInTheDocument()
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText("conteúdo")).toBeInTheDocument()
    expect(screen.queryByText("reservado")).not.toBeInTheDocument()
  })

  it("com `aoVisivel`, espera entrar na tela; sem aparecer, monta no limite", () => {
    let aoEntrar: (e: { isIntersecting: boolean }[]) => void = () => {}
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof aoEntrar) {
          aoEntrar = cb
        }
        observe() {}
        disconnect() {}
      }
    )
    const { unmount } = render(cena({ aoVisivel: true, limite: 1000 }))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument()

    act(() => aoEntrar([{ isIntersecting: true }]))
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText("conteúdo")).toBeInTheDocument()
    unmount()

    render(cena({ aoVisivel: true, limite: 1000 }))
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(screen.getByText("conteúdo")).toBeInTheDocument()
  })

  it("vários blocos montam um por vez, na ordem", () => {
    render(
      <>
        <MontarDepois reservado={<p>reservado 1</p>}>
          <p>conteúdo 1</p>
        </MontarDepois>
        <MontarDepois reservado={<p>reservado 2</p>}>
          <p>conteúdo 2</p>
        </MontarDepois>
      </>
    )
    act(() => {
      vi.advanceTimersByTime(17)
    })
    expect(screen.getByText("conteúdo 1")).toBeInTheDocument()
    expect(screen.queryByText("conteúdo 2")).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText("conteúdo 2")).toBeInTheDocument()
  })
})
