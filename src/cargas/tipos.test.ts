import { beforeEach, describe, expect, it } from "vitest"
import type { Workbook } from "@/core"
import { limparRegistroParaTeste, reconhecerTipo, registrarTipo, TIPO_OUTRO, tiposRegistrados } from "./tipos"
import type { TipoDeConjunto } from "./types"

const wb: Workbook = { fileName: "x.xlsx", importedAt: new Date(), sheets: [] }
const tipo = (id: string, nota: number): TipoDeConjunto => ({ id, nome: id, descricao: "", reconhecer: () => nota })

describe("registro de tipos", () => {
  beforeEach(() => limparRegistroParaTeste())

  it("TIPO_OUTRO está sempre presente e nunca reconhece", () => {
    expect(TIPO_OUTRO).toMatchObject({ id: "outro", nome: "Outro" })
    expect(TIPO_OUTRO.reconhecer(wb)).toBe(0)
    expect(tiposRegistrados().map((t) => t.id)).toEqual(["outro"])
  })
  it("registrar acrescenta e substitui tipo com o mesmo id", () => {
    registrarTipo(tipo("a", 0.1))
    registrarTipo(tipo("a", 0.9))
    expect(tiposRegistrados().map((t) => t.id)).toEqual(["outro", "a"])
    expect(reconhecerTipo(wb).tipo.id).toBe("a")
  })
  it("escolhe a maior pontuação >= 0.6", () => {
    registrarTipo(tipo("a", 0.7))
    registrarTipo(tipo("b", 0.95))
    expect(reconhecerTipo(wb)).toMatchObject({ tipo: { id: "b" }, pontuacao: 0.95 })
  })
  it("abaixo de 0.6 cai em Outro", () => {
    registrarTipo(tipo("a", 0.59))
    expect(reconhecerTipo(wb).tipo.id).toBe("outro")
  })
})
