import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SessaoGate } from "./SessaoGate"
import { useSessao } from "./SessaoContext"

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } })

function Sair() {
  const { sair } = useSessao()
  return <button onClick={() => void sair()}>sair-teste</button>
}
const App = () => (
  <div>
    <p>conteúdo do app</p>
    <input aria-label="rascunho" />
    <Sair />
  </div>
)

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.stubEnv("VITE_REPOSITORIO", "api")
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const montar = () =>
  render(
    <SessaoGate>
      <App />
    </SessaoGate>
  )

describe("SessaoGate", () => {
  it("fora do modo api renderiza o app direto, sem chamar a API", () => {
    vi.stubEnv("VITE_REPOSITORIO", "")
    montar()
    expect(screen.getByText("conteúdo do app")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("sessão válida mostra o app", async () => {
    fetchMock.mockResolvedValueOnce(json({ expiraEm: "x" }))
    montar()
    expect(await screen.findByText("conteúdo do app")).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe("/api/sessao")
  })

  it("401 mostra o login, com foco em Usuário", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401))
    montar()
    const usuario = await screen.findByLabelText("Usuário")
    expect(usuario).toHaveFocus()
    expect(screen.queryByText("conteúdo do app")).not.toBeInTheDocument()
  })

  it("erro de rede oferece Tentar de novo", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("falhou"))
    montar()
    const botao = await screen.findByRole("button", { name: "Tentar de novo" })
    fetchMock.mockResolvedValueOnce(json({ expiraEm: "x" }))
    await userEvent.click(botao)
    expect(await screen.findByText("conteúdo do app")).toBeInTheDocument()
  })

  it("login errado mostra o erro do servidor em role=alert", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401))
    montar()
    await userEvent.type(await screen.findByLabelText("Usuário"), "ana")
    await userEvent.type(screen.getByLabelText("Senha"), "errada")
    fetchMock.mockResolvedValueOnce(json({ erro: "Usuário ou senha incorretos." }, 401))
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Usuário ou senha incorretos.")
    expect(screen.queryByText("conteúdo do app")).not.toBeInTheDocument()
  })

  it.each([
    [false, false],
    [true, true],
  ])("login certo entra no app e envia lembrar=%s", async (marcar, esperado) => {
    fetchMock.mockResolvedValueOnce(json({}, 401))
    montar()
    await userEvent.type(await screen.findByLabelText("Usuário"), "ana")
    await userEvent.type(screen.getByLabelText("Senha"), "segredo")
    if (marcar) await userEvent.click(screen.getByLabelText("Lembrar login por 14 dias"))
    fetchMock.mockResolvedValueOnce(json({ usuario: "ana", expiraEm: "x" }))
    await userEvent.keyboard("{Enter}")
    expect(await screen.findByText("conteúdo do app")).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe("/api/login")
    expect(JSON.parse(init.body)).toEqual({ usuario: "ana", senha: "segredo", lembrar: esperado })
  })

  it("mostrar/ocultar alterna o tipo do campo de senha", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401))
    montar()
    const senha = await screen.findByLabelText("Senha")
    expect(senha).toHaveAttribute("type", "password")
    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }))
    expect(senha).toHaveAttribute("type", "text")
  })

  it("evento de sessão expirada volta ao login com aviso e preserva a tela", async () => {
    fetchMock.mockResolvedValueOnce(json({ expiraEm: "x" }))
    montar()
    await userEvent.type(await screen.findByLabelText("rascunho"), "meu texto")
    act(() => {
      window.dispatchEvent(new CustomEvent("asten:sessao-expirada"))
    })
    expect(await screen.findByText("Sua sessão expirou. Entre de novo.")).toBeInTheDocument()
    fetchMock.mockResolvedValueOnce(json({ usuario: "ana", expiraEm: "x" }))
    await userEvent.type(screen.getByLabelText("Usuário"), "ana")
    await userEvent.type(screen.getByLabelText("Senha"), "segredo{Enter}")
    await waitFor(() => expect(screen.queryByLabelText("Usuário")).not.toBeInTheDocument())
    expect(screen.getByLabelText("rascunho")).toHaveValue("meu texto")
  })

  it("sair chama /api/logout e volta ao login", async () => {
    fetchMock.mockResolvedValueOnce(json({ expiraEm: "x" }))
    montar()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await userEvent.click(await screen.findByText("sair-teste"))
    expect(await screen.findByLabelText("Usuário")).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][0]).toBe("/api/logout")
    expect(screen.queryByText("conteúdo do app")).not.toBeInTheDocument()
  })
})
