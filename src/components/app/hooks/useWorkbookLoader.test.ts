import { describe, expect, it } from "vitest"
import { WorkbookError } from "@/core"
import { messageForError } from "./useWorkbookLoader"

describe("mensagens de importação", () => {
  it("planilha vazia", () => {
    expect(messageForError(new WorkbookError("empty", "x"))).toBe(
      "A planilha está vazia."
    )
  })
  it("arquivo que não é a planilha, incluindo erros desconhecidos", () => {
    const msg = "Esse arquivo não parece ser a planilha da reunião."
    expect(messageForError(new WorkbookError("not-xlsx", "x"))).toBe(msg)
    expect(messageForError(new Error("boom"))).toBe(msg)
  })
})
