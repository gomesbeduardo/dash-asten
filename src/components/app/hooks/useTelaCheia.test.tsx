import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useTelaCheia } from "./useTelaCheia"

function Harness() {
  const t = useTelaCheia()
  if (!t.suportado) return <p>sem suporte</p>
  return (
    <button onClick={t.alternar}>{t.ativa ? "ativa" : "inativa"}</button>
  )
}

let el: HTMLElement | null = null
function suportar(req = vi.fn(() => Promise.resolve())) {
  const sai = vi.fn(() => Promise.resolve())
  document.documentElement.requestFullscreen = req
  document.exitFullscreen = sai
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => el,
  })
  return { req, sai }
}
afterEach(() => {
  el = null
  // @ts-expect-error limpeza do mock
  delete document.documentElement.requestFullscreen
  // @ts-expect-error limpeza do mock
  delete document.exitFullscreen
  // @ts-expect-error limpeza do mock
  delete document.fullscreenElement
})

describe("useTelaCheia", () => {
  it("sem a Fullscreen API, informa que não há suporte", () => {
    render(<Harness />)
    expect(screen.getByText("sem suporte")).toBeInTheDocument()
  })

  it("alternar entra em tela cheia e acompanha o fullscreenchange", async () => {
    const { req } = suportar()
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "inativa" }))
    expect(req).toHaveBeenCalledTimes(1)
    el = document.documentElement
    act(() => {
      fireEvent(document, new Event("fullscreenchange"))
    })
    expect(screen.getByRole("button", { name: "ativa" })).toBeInTheDocument()
  })

  it("estando em tela cheia, alternar sai dela", async () => {
    const { sai } = suportar()
    el = document.documentElement
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "ativa" }))
    expect(sai).toHaveBeenCalledTimes(1)
  })

  it("tolera a recusa do navegador", async () => {
    suportar(vi.fn(() => Promise.reject(new Error("negado"))))
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "inativa" }))
    expect(screen.getByRole("button", { name: "inativa" })).toBeInTheDocument()
  })
})
