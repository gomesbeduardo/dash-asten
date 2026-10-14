import { act, createEvent, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AreaDeEnvio } from "./AreaDeEnvio"

const x = (n: string) => new File(["x"], n)

function evento(tipo: "dragenter" | "dragover" | "dragleave" | "drop", alvo: Element | Document, dt: object) {
  const ev = createEvent[tipo === "dragenter" ? "dragEnter" : tipo === "dragover" ? "dragOver" : tipo === "dragleave" ? "dragLeave" : "drop"](
    alvo as Element
  )
  Object.defineProperty(ev, "dataTransfer", { value: dt })
  act(() => {
    fireEvent(alvo, ev)
  })
  return ev
}
const comArquivos = (...files: File[]) => ({ files, types: ["Files"] })
const comTexto = { files: [], types: ["text/plain"] }

function montar() {
  const onFiles = vi.fn()
  render(<AreaDeEnvio janela onFiles={onFiles} />)
  return { onFiles }
}

describe("AreaDeEnvio com a janela inteira como alvo", () => {
  it("arrastar arquivos sobre qualquer ponto mostra o aviso de página inteira", () => {
    montar()
    expect(screen.queryByText("Solte para carregar")).toBeNull()
    evento("dragenter", document.body, comArquivos(x("a.xlsx")))
    expect(screen.getByText("Solte para carregar")).toBeInTheDocument()
  })

  it("arrastar texto não abre o aviso", () => {
    montar()
    evento("dragenter", document.body, comTexto)
    expect(screen.queryByText("Solte para carregar")).toBeNull()
  })

  it("não abre o aviso com outro diálogo aberto", () => {
    montar()
    const d = document.createElement("div")
    d.setAttribute("role", "dialog")
    document.body.appendChild(d)
    evento("dragenter", document.body, comArquivos(x("a.xlsx")))
    expect(screen.queryByText("Solte para carregar")).toBeNull()
    d.remove()
  })

  it("sair da janela com o arraste fecha o aviso", () => {
    montar()
    evento("dragenter", document.body, comArquivos(x("a.xlsx")))
    evento("dragleave", document.body, comArquivos(x("a.xlsx")))
    expect(screen.queryByText("Solte para carregar")).toBeNull()
  })

  it("soltar fora da caixa entrega os .xlsx, fecha o aviso e impede o navegador de abrir o arquivo", () => {
    const { onFiles } = montar()
    const a = x("a.xlsx")
    evento("dragenter", document.body, comArquivos(a))
    const over = evento("dragover", document.body, comArquivos(a))
    expect(over.defaultPrevented).toBe(true)
    const drop = evento("drop", document.body, comArquivos(a, x("notas.txt")))
    expect(drop.defaultPrevented).toBe(true)
    expect(onFiles).toHaveBeenCalledWith([a], ["notas.txt"])
    expect(screen.queryByText("Solte para carregar")).toBeNull()
  })

  it("soltar na caixa entrega uma vez só", () => {
    const { onFiles } = montar()
    const area = document.querySelector("[data-area-envio]")!
    evento("drop", area, comArquivos(x("a.xlsx")))
    expect(onFiles).toHaveBeenCalledTimes(1)
  })

  it("soltar só arquivos que não são .xlsx mostra o erro e não entrega nada", () => {
    const { onFiles } = montar()
    evento("drop", document.body, comArquivos(x("notas.txt")))
    expect(screen.getByRole("alert")).toHaveTextContent(/\.xlsx/)
    expect(onFiles).not.toHaveBeenCalled()
  })
})
