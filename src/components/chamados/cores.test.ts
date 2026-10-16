import { describe, expect, it } from "vitest"

import { corDaSituacao, coresDasSituacoes } from "./cores"

describe("cor da situação por nome", () => {
  it("cada situação conhecida tem a sua cor, com ou sem acento e caixa", () => {
    expect(corDaSituacao("Finalizado")).toBe("var(--serie-finalizados)")
    expect(corDaSituacao("Aguardando cliente")).toBe("var(--sit-aguardando-cliente)")
    expect(corDaSituacao("Em Análise")).toBe("var(--sit-analise)")
    expect(corDaSituacao("em analise")).toBe("var(--sit-analise)")
    expect(corDaSituacao("Em Atendimento")).toBe("var(--sit-atendimento)")
    expect(corDaSituacao("Aguardando aceite")).toBe("var(--sit-aceite)")
  })
  it("a cor não depende da posição: a mesma situação tem a mesma cor em qualquer ordem", () => {
    const a = coresDasSituacoes(["Em Análise", "Finalizado", "Em Atendimento"])
    const b = coresDasSituacoes(["Em Atendimento", "Em Análise", "Aguardando cliente"])
    expect(a.get("Em Análise")).toBe(b.get("Em Análise"))
    expect(a.get("Em Atendimento")).toBe(b.get("Em Atendimento"))
  })
  it("situação desconhecida ganha o cinza neutro (continua visível, com rótulo)", () => {
    expect(corDaSituacao("Aguardando fornecedor")).toBe("var(--sit-outra)")
    expect(coresDasSituacoes(["Aguardando fornecedor"]).get("Aguardando fornecedor")).toBe(
      "var(--sit-outra)"
    )
  })
})
