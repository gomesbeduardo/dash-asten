import { describe, expect, it } from "vitest"

import { tipoDoPonto } from "./graficos"

const linhas = [
  { rotulo: "a", s: 1 },
  { rotulo: "b", s: 2 },
  { rotulo: "c", s: null },
  { rotulo: "d", s: 4 },
  { rotulo: "e", s: null },
  { rotulo: "f", s: 6, s__o: 5 },
  { rotulo: "g", s: 7 },
] as never[]

describe("tipoDoPonto (série em área)", () => {
  it("meses comuns, ligados por linha, não ganham ponto", () => {
    expect(tipoDoPonto(linhas, "s", 1)).toBeNull()
  })
  it("o último mês ganha destaque", () => {
    expect(tipoDoPonto(linhas, "s", 6)).toBe("ultimo")
  })
  it("o ponto corrigido por posição posterior continua vazado, mesmo no meio da linha", () => {
    expect(tipoDoPonto(linhas, "s", 5)).toBe("corrigido")
  })
  it("o ponto isolado (sem vizinho com dado) aparece, para o dado não sumir", () => {
    expect(tipoDoPonto(linhas, "s", 3)).toBe("isolado")
  })
  it("mês sem dado não tem ponto", () => {
    expect(tipoDoPonto(linhas, "s", 2)).toBeNull()
  })
})
