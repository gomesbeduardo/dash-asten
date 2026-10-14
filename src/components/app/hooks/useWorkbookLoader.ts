import { useCallback, useState } from "react"
import { readWorkbook, WorkbookError, type Workbook } from "@/core"

export type ProgressoDeLeitura = { atual: number; total: number }

export type LoadState =
  | { status: "idle" }
  | { status: "loading"; progresso?: ProgressoDeLeitura }
  | { status: "error"; message: string }

export type LoteLido = {
  itens: { workbook: Workbook; original: ArrayBuffer }[]
  falhas: { nome: string; mensagem: string }[]
  ignorados: string[]
}

export function messageForError(error: unknown): string {
  if (error instanceof WorkbookError && error.code === "empty")
    return "A planilha está vazia."
  return "Esse arquivo não parece ser a planilha da reunião."
}

/** Cede a vez ao navegador para a tela atualizar entre uma planilha e outra. */
const respirar = () => new Promise<void>((r) => setTimeout(r, 0))

/** Lê os arquivos escolhidos inteiros no navegador, um de cada vez; nada é enviado a lugar nenhum. */
export function useWorkbookLoader(
  onLoaded: (workbook: Workbook, original: ArrayBuffer) => void,
  onLoadedMany?: (lote: LoteLido) => void
) {
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

  const loadMany = useCallback(
    async (files: File[], ignorados: string[] = []) => {
      const lote: LoteLido = { itens: [], falhas: [], ignorados }
      for (const [i, file] of files.entries()) {
        setState({ status: "loading", progresso: { atual: i + 1, total: files.length } })
        await respirar()
        try {
          const original = await file.arrayBuffer()
          lote.itens.push({ workbook: readWorkbook(original, file.name), original })
        } catch (error) {
          lote.falhas.push({ nome: file.name, mensagem: messageForError(error) })
        }
      }
      if (lote.itens.length === 0) {
        setState({
          status: "error",
          message: "Nenhuma das planilhas pôde ser lida.",
        })
        return
      }
      setState({ status: "idle" })
      onLoadedMany?.(lote)
    },
    [onLoadedMany]
  )

  const dismiss = useCallback(() => setState({ status: "idle" }), [])
  return { state, load, loadMany, dismiss }
}
