import { createEvent, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { NovoEnvioDialog } from "./NovoEnvioDialog"

const xlsx = () => new File(["x"], "agosto.xlsx")
const txt = () => new File(["x"], "notas.txt")

function montar() {
  const onFiles = vi.fn()
  const onOpenChange = vi.fn()
  render(<NovoEnvioDialog open onOpenChange={onOpenChange} onFiles={onFiles} />)
  return { onFiles, onOpenChange }
}

function soltar(alvo: Element, ...files: File[]) {
  const ev = createEvent.drop(alvo)
  Object.defineProperty(ev, "dataTransfer", { value: { files, types: ["Files"] } })
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
    const { onFiles, onOpenChange } = montar()
    const area = (await screen.findByRole("dialog")).querySelector("[data-area-envio]")!
    const f = xlsx()
    soltar(area, f)
    expect(onFiles).toHaveBeenCalledWith([f], [])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("escolher pelo botão (input) entrega o arquivo e fecha", async () => {
    const { onFiles, onOpenChange } = montar()
    await userEvent.upload(await screen.findByLabelText(/Arquivo da nova carga/), xlsx())
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("arquivo que não é .xlsx mostra erro no modal e não fecha", async () => {
    const { onFiles, onOpenChange } = montar()
    const area = (await screen.findByRole("dialog")).querySelector("[data-area-envio]")!
    soltar(area, txt())
    expect(await screen.findByRole("alert")).toHaveTextContent(/\.xlsx/)
    expect(onFiles).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("soltar vários .xlsx entrega o lote e fecha; o não-xlsx vai como ignorado", async () => {
    const { onFiles, onOpenChange } = montar()
    const area = (await screen.findByRole("dialog")).querySelector("[data-area-envio]")!
    const a = xlsx()
    const b = new File(["x"], "setembro.xlsx")
    soltar(area, a, txt(), b)
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles).toHaveBeenCalledWith([a, b], ["notas.txt"])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("Esc fecha", async () => {
    const { onOpenChange } = montar()
    await screen.findByRole("dialog")
    await userEvent.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
