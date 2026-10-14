import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useShortcuts, type ShortcutHandlers } from "./useShortcuts"

function Harness(props: Partial<ShortcutHandlers> & { withInput?: boolean }) {
  useShortcuts(props)
  return props.withInput ? <input aria-label="busca" /> : null
}

const handlers = () => ({
  onStep: vi.fn(),
  onGoTo: vi.fn(),
  onToggleFilters: vi.fn(),
  onEscape: vi.fn(),
  onToggleBar: vi.fn(),
})

describe("useShortcuts", () => {
  it("setas pedem aba anterior/próxima", () => {
    const h = handlers()
    render(<Harness {...h} />)
    fireEvent.keyDown(window, { key: "ArrowRight" })
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(h.onStep.mock.calls).toEqual([[1], [-1]])
  })

  it("1 a 9 vão direto à aba (índice a partir de 0)", () => {
    const h = handlers()
    render(<Harness {...h} />)
    fireEvent.keyDown(window, { key: "1" })
    fireEvent.keyDown(window, { key: "9" })
    fireEvent.keyDown(window, { key: "0" })
    expect(h.onGoTo.mock.calls).toEqual([[0], [8]])
  })

  it("F, Esc e H disparam seus atalhos", () => {
    const h = handlers()
    render(<Harness {...h} />)
    fireEvent.keyDown(window, { key: "f" })
    fireEvent.keyDown(window, { key: "F" })
    fireEvent.keyDown(window, { key: "Escape" })
    fireEvent.keyDown(window, { key: "h" })
    expect(h.onToggleFilters).toHaveBeenCalledTimes(2)
    expect(h.onEscape).toHaveBeenCalledTimes(1)
    expect(h.onToggleBar).toHaveBeenCalledTimes(1)
  })

  it("ignora teclas de ação quando o foco está num campo de texto", () => {
    const h = handlers()
    const { getByLabelText } = render(<Harness {...h} withInput />)
    const input = getByLabelText("busca")
    input.focus()
    fireEvent.keyDown(input, { key: "f" })
    fireEvent.keyDown(input, { key: "ArrowRight" })
    fireEvent.keyDown(input, { key: "2" })
    expect(h.onToggleFilters).not.toHaveBeenCalled()
    expect(h.onStep).not.toHaveBeenCalled()
    expect(h.onGoTo).not.toHaveBeenCalled()
  })

  it("ignora combinações com Ctrl/Alt/Meta", () => {
    const h = handlers()
    render(<Harness {...h} />)
    fireEvent.keyDown(window, { key: "f", ctrlKey: true })
    expect(h.onToggleFilters).not.toHaveBeenCalled()
  })
})

describe("useShortcuts e Esc já tratado", () => {
  it("não repete o Esc quando um popover/painel já o consumiu", () => {
    const h = handlers()
    render(<Harness {...h} />)
    const ev = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
      bubbles: true,
    })
    ev.preventDefault()
    window.dispatchEvent(ev)
    expect(h.onEscape).not.toHaveBeenCalled()
  })

  it("P, C, E e L pedem a visão (só se o handler existir)", () => {
    const onVisao = vi.fn()
    render(<Harness onVisao={onVisao} />)
    fireEvent.keyDown(window, { key: "p" })
    fireEvent.keyDown(window, { key: "C" })
    fireEvent.keyDown(window, { key: "e" })
    fireEvent.keyDown(window, { key: "l" })
    expect(onVisao.mock.calls).toEqual([
      ["painel"],
      ["comparar"],
      ["evolucao"],
      ["leituras"],
    ])
  })

  it("sem handlers, tecla não quebra", () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: "ArrowRight" })
    fireEvent.keyDown(window, { key: "f" })
  })

  it("T pede tela cheia", () => {
    const onTelaCheia = vi.fn()
    render(<Harness onTelaCheia={onTelaCheia} />)
    fireEvent.keyDown(window, { key: "t" })
    fireEvent.keyDown(window, { key: "T" })
    expect(onTelaCheia).toHaveBeenCalledTimes(2)
  })
})
