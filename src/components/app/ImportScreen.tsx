import { useRef, useState, type DragEvent } from "react"
import { FileSpreadsheetIcon } from "lucide-react"

import logo from "@/assets/asten-logo-fundo-claro.png"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LoadState } from "./hooks/useWorkbookLoader"

export function ImportScreen({
  state,
  onFile,
}: {
  state: LoadState
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const loading = state.status === "loading"

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center gap-10 px-6 py-12">
      <img src={logo} alt="Asten" className="h-12 w-auto self-start" />
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl leading-tight text-primary">
          Painel da reunião semanal
        </h1>
        <p className="max-w-prose text-xl text-muted-foreground">
          Escolha a planilha da semana e as abas viram telas para apresentar. O
          arquivo fica neste computador e não é enviado a lugar nenhum.
        </p>
      </div>

      <div
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
        <p className="text-xl font-medium">
          {loading ? "Lendo a planilha…" : "Arraste o arquivo .xlsx para cá"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="sr-only"
          tabIndex={-1}
          aria-label="Arquivo da planilha (.xlsx)"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ""
          }}
        />
        <Button
          size="lg"
          className="h-12 px-6 text-base"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          Escolher arquivo
        </Button>
      </div>

      {state.status === "error" && (
        <div
          role="alert"
          className="border-l-4 border-destructive bg-card py-3 pl-4 text-lg"
        >
          <p className="font-medium text-destructive">{state.message}</p>
          <p className="text-muted-foreground">Tente outro arquivo .xlsx.</p>
        </div>
      )}
    </main>
  )
}
