import { describe, expect, it } from "vitest"
import { AVISO_EXPIRADA, estadoInicial, reduzir, type EstadoSessao } from "./sessao"

describe("máquina de estados da sessão", () => {
  it("começa verificando", () => {
    expect(estadoInicial).toEqual({ fase: "verificando" })
  })
  it("sessão válida entra no app", () => {
    expect(reduzir(estadoInicial, { tipo: "sessao-valida" })).toEqual({ fase: "autenticado" })
  })
  it("sem sessão vai para o login, sem aviso", () => {
    expect(reduzir(estadoInicial, { tipo: "sem-sessao" })).toEqual({ fase: "login" })
  })
  it("falha de rede mostra erro e tentar de novo volta a verificar", () => {
    const erro = reduzir(estadoInicial, { tipo: "rede-falhou" })
    expect(erro).toEqual({ fase: "erro-rede" })
    expect(reduzir(erro, { tipo: "tentar-de-novo" })).toEqual({ fase: "verificando" })
  })
  it("login correto autentica", () => {
    expect(reduzir({ fase: "login" }, { tipo: "login-ok" })).toEqual({ fase: "autenticado" })
  })
  it("sessão expirada no app volta ao login com aviso", () => {
    expect(reduzir({ fase: "autenticado" }, { tipo: "expirou" })).toEqual({
      fase: "login",
      aviso: AVISO_EXPIRADA,
    })
    expect(AVISO_EXPIRADA).toBe("Sua sessão expirou. Entre novamente!")
  })
  it("expirou fora do app não muda nada", () => {
    const e: EstadoSessao = { fase: "login" }
    expect(reduzir(e, { tipo: "expirou" })).toBe(e)
  })
  it("sair volta ao login sem aviso", () => {
    expect(reduzir({ fase: "autenticado" }, { tipo: "saiu" })).toEqual({ fase: "login" })
  })
  it("eventos de verificação inicial são ignorados depois de autenticado", () => {
    const e: EstadoSessao = { fase: "autenticado" }
    expect(reduzir(e, { tipo: "sem-sessao" })).toBe(e)
  })
})
