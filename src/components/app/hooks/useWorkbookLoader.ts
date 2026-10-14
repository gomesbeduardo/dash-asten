import { useCallback, useState } from "react"
import { readWorkbook, WorkbookError, type Workbook } from "@/core"

export type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }

export function messageForError(error: unknown): string {
  if (error instanceof WorkbookError && error.code === "empty")
    return "A planilha está vazia."
  return "Esse arquivo não parece ser a planilha da reunião."
}

/** Lê o arquivo escolhido inteiro no navegador; nada é enviado a lugar nenhum. */
export function useWorkbookLoader(onLoaded: (workbook: Workbook, original: ArrayBuffer) => void) {
  const [state, setState] = useState<LoadState>({ status: "idle" })

  const load = useCallback(
    async (file: File) => {
      setState({ status: "loading" })
      try {
        const data = await file.arrayBuffer()
        const workbook = readWorkbook(data, file.name)
        setState({ status: "idle" })
        onLoaded(workbook, data)
      } catch (error) {
        setState({ status: "error", message: messageForError(error) })
      }
    },
    [onLoaded]
  )

  const dismiss = useCallback(() => setState({ status: "idle" }), [])
  return { state, load, dismiss }
}
