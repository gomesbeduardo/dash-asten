import { describe, expect, it } from "vitest"
import { formatCell } from "./format"

describe("formatCell", () => {
  it("mostra traço para vazio, nunca zero", () => {
    expect(formatCell(null, "number")).toBe("—")
    expect(formatCell(null, "text")).toBe("—")
    expect(formatCell(0, "number")).toBe("0")
  })
  it("formata número em pt-BR com até 2 casas", () => {
    expect(formatCell(1234.5, "number")).toBe("1.234,5")
    expect(formatCell(1.23456, "number")).toBe("1,23")
  })
  it("formata data dd/mm/aaaa em UTC", () => {
    expect(formatCell(new Date(Date.UTC(2025, 2, 5)), "date")).toBe("05/03/2025")
  })
  it("mantém texto como está", () => {
    expect(formatCell("abc", "text")).toBe("abc")
  })
})
