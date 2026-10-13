import { useRef, useState } from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const SAMPLE_FILE_NAME = "reuniao-semanal-exemplo.xlsx"

type Props = { onLoad: (fileName: string) => void }

/** Qualquer arquivo é ignorado: só o nome é usado e o carregamento é fictício. */
export function EmptyState({ onLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Painel da reunião semanal</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Carregue a planilha da semana para ver indicadores e projetos em um só lugar.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) onLoad(f.name)
        }}
        className={cn(
          "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors",
          dragging ? "border-brand bg-brand-soft" : "border-input"
        )}
      >
        <Upload className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-xl font-medium">Arraste a planilha .xlsx para cá</p>
        <p className="text-base text-muted-foreground">ou escolha um arquivo no computador</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onLoad(f.name)
            e.target.value = ""
          }}
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" className="h-11 px-5 text-base" onClick={() => inputRef.current?.click()}>
            Escolher arquivo
          </Button>
          <Button className="h-11 gap-2 px-5 text-base" onClick={() => onLoad(SAMPLE_FILE_NAME)}>
            <FileSpreadsheet aria-hidden /> Carregar exemplo fictício
          </Button>
        </div>
      </div>
      <p className="text-base text-muted-foreground">
        Neste protótipo o arquivo escolhido não é lido: o painel sempre mostra os mesmos dados fictícios.
      </p>
    </div>
  )
}
