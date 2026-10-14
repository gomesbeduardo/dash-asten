import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LoginScreen } from "./LoginScreen"

describe("LoginScreen", () => {
  it("'Lembrar login' é um switch e envia o valor escolhido", async () => {
    const user = userEvent.setup()
    const entrar = vi.fn().mockResolvedValue({ ok: true })
    render(<LoginScreen entrar={entrar} />)
    const sw = screen.getByRole("switch", { name: "Lembrar login" })
    expect(sw).toHaveAttribute("aria-checked", "false")
    await user.click(sw)
    expect(sw).toHaveAttribute("aria-checked", "true")
    await user.type(screen.getByLabelText(/usuário/i), "ana")
    await user.type(screen.getByLabelText("Senha"), "segredo")
    await user.click(screen.getByRole("button", { name: /^Entrar/ }))
    expect(entrar).toHaveBeenCalledWith("ana", "segredo", true)
  })
})
