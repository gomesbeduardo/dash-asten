import { describe, expect, it } from "vitest"
import {
  hideSheet,
  resolveActive,
  showSheet,
  stepSheet,
  visibleIds,
} from "./tabs-state"

const all = ["a", "b", "c"]

describe("ocultar abas", () => {
  it("oculta uma aba", () => {
    expect(hideSheet(all, [], "b")).toEqual(["b"])
  })
  it("não oculta a última aba visível", () => {
    expect(hideSheet(all, ["a", "b"], "c")).toEqual(["a", "b"])
  })
  it("reexibe uma aba", () => {
    expect(showSheet(["a", "b"], "a")).toEqual(["b"])
  })
  it("lista só as visíveis, na ordem da planilha", () => {
    expect(visibleIds(all, ["b"])).toEqual(["a", "c"])
  })
})

describe("aba ativa", () => {
  it("mantém a ativa quando visível", () => {
    expect(resolveActive(all, ["b"], "c")).toBe("c")
  })
  it("vai para a primeira visível quando a ativa foi ocultada", () => {
    expect(resolveActive(all, ["a", "b"], "a")).toBe("c")
    expect(resolveActive(all, ["a"], "a")).toBe("b")
  })
  it("passo circular entre as visíveis", () => {
    expect(stepSheet(["a", "c"], "c", 1)).toBe("a")
    expect(stepSheet(["a", "c"], "a", -1)).toBe("c")
  })
})
