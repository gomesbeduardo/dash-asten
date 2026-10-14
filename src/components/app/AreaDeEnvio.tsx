import { useRef, useState, type DragEvent, type Ref } from "react"
import { FileSpreadsheetIcon } from "lucide-react"

import {
  mensagemDoLote,
  separarArquivos,
  type MensagemDoLote,
} from "@/cargas/lote"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ProgressoDeLeitura } from "./hooks/useWorkbookLoader"


/**
 * Área de arrastar e soltar as planilhas (uma ou várias, até 12), com o botão
 * "Escolher arquivo" como alternativa. Só entrega os .xlsx; o resto fica fora
 * e a pessoa é avisada aqui mesmo.
 */
export function AreaDeEnvio({
  onFiles,
  loading = false,
  progresso,
  rotuloInput = "Arquivo da planilha (.xlsx)",
  botaoRef,
}: {
  onFiles: (files: File[], ignorados: string[]) => void
  loading?: boolean
  progresso?: ProgressoDeLeitura | null
  rotuloInput?: string
  botaoRef?: Ref<HTMLButtonElement>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [mensagem, setMensagem] = useState<MensagemDoLote | null>(null)

  function receber(lista: FileList | File[]) {
    const todos = Array.from(lista)
    if (todos.length === 0) return
    const r = separarArquivos(todos)
    setMensagem(mensagemDoLote(r, todos.length))
    if (r.aceitos.length > 0) onFiles(r.aceitos, r.ignorados)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    receber(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        data-area-envio
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-start gap-5 rounded-xl border-2 border-dashed border-input bg-card p-8 transition-colors motion-reduce:transition-none",
          dragging && "border-brand bg-brand-soft"
        )}
      >
        <FileSpreadsheetIcon className="size-10 text-primary" aria-hidden />
        <p className="text-xl font-medium" aria-live="polite">
          {loading
            ? progresso && progresso.total > 1
              ? `Lendo ${progresso.atual} de ${progresso.total}…`
              : "Lendo a planilha…"
            : "Arraste o arquivo .xlsx para cá"}
        </p>
        <p className="-mt-3 text-base text-muted-foreground">
          Uma planilha ou várias de uma vez (até 12).
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label={rotuloInput}
          onChange={(e) => {
            receber(e.target.files ?? [])
            e.target.value = ""
          }}
        />
        <Button
          ref={botaoRef}
          size="lg"
          className="h-12 px-6 text-base"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          Escolher arquivo
        </Button>
      </div>
      {mensagem && (
        <p
          role={mensagem.nivel === "erro" ? "alert" : "status"}
          className={cn(
            "border-l-4 pl-3 text-base font-medium",
            mensagem.nivel === "erro"
              ? "border-destructive text-destructive"
              : "border-brand"
          )}
        >
          {mensagem.texto}
        </p>
      )}
    </div>
  )
}
