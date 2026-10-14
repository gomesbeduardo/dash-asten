import { useRef, useState, type DragEvent, type Ref } from "react"
import { FileSpreadsheetIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Área de arrastar e soltar a planilha, com o botão "Escolher arquivo" como alternativa. */
export function AreaDeEnvio({
  onFile,
  loading = false,
  rotuloInput = "Arquivo da planilha (.xlsx)",
  botaoRef,
}: {
  onFile: (file: File) => void
  loading?: boolean
  rotuloInput?: string
  botaoRef?: Ref<HTMLButtonElement>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
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
      <p className="text-xl font-medium">
        {loading ? "Lendo a planilha…" : "Arraste o arquivo .xlsx para cá"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="sr-only"
        tabIndex={-1}
        aria-label={rotuloInput}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
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
  )
}
