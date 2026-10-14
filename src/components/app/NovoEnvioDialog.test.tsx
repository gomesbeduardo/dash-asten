import { createEvent, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { NovoEnvioDialog } from "./NovoEnvioDialog"

const xlsx = () => new File(["x"], "agosto.xlsx")
const txt = () => new File(["x"], "notas.txt")

function montar() {
  const onFile = vi.fn()
  const onOpenChange = vi.fn()
  render(<NovoEnvioDialog open onOpenChange={onOpenChange} onFile={onFile} />)
  return { onFile, onOpenChange }
}

function soltar(alvo: Element, file: File) {
  const ev = createEvent.drop(alvo)
  Object.defineProperty(ev, "dataTransfer", { value: { files: [file], types: ["Files"] } })
  fireEvent(alvo, ev)
}

describe("NovoEnvioDialog", () => {
  it("mostra a área de soltar e o botão Escolher arquivo, com foco no botão", async () => {
    montar()
    const dialog = await screen.findByRole("dialog", { name: "Nova carga" })
    expect(dialog).toHaveTextContent("Arraste o arquivo .xlsx para cá")
    expect(screen.getByRole("button", { name: "Escolher arquivo" })).toHaveFocus()
  })

  it("soltar um .xlsx entrega o arquivo e fecha", async () => {
    const { onFile, onOpenChange } = montar()
    const area = (await screen.findByRole("dialog")).querySelector("[data-area-envio]")!
    const f = xlsx()
    soltar(area, f)
    expect(onFile).toHaveBeenCalledWith(f)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("escolher pelo botão (input) entrega o arquivo e fecha", async () => {
    const { onFile, onOpenChange } = montar()
    await userEvent.upload(await screen.findByLabelText(/Arquivo da nova carga/), xlsx())
    expect(onFile).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("arquivo que não é .xlsx mostra erro no modal e não fecha", async () => {
    const { onFile, onOpenChange } = montar()
    const area = (await screen.findByRole("dialog")).querySelector("[data-area-envio]")!
    soltar(area, txt())
    expect(await screen.findByRole("alert")).toHaveTextContent(/\.xlsx/)
    expect(onFile).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("Esc fecha", async () => {
    const { onOpenChange } = montar()
    await screen.findByRole("dialog")
    await userEvent.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
