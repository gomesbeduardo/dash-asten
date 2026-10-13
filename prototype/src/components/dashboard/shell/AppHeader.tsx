import { useRef, useState } from "react"
import { FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SheetStatus } from "./SheetStatus"

type Props = {
  fileName: string
  importedAt: Date
  hasActiveFilters: boolean
  onReplace: (fileName: string) => void
  onClearSession: () => void
}

export function AppHeader({ fileName, importedAt, hasActiveFilters, onReplace, onClearSession }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const when = importedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <span className="text-2xl font-semibold tracking-tight text-brand">Asten</span>
        <div className="flex min-w-0 items-center gap-2 text-base">
          <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="truncate font-medium" title={fileName}>
              {fileName}
            </p>
            <p className="text-sm text-muted-foreground">
              Importada em <span className="num">{when}</span>
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SheetStatus />
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onReplace(f.name)
              e.target.value = ""
            }}
          />
          <Button variant="outline" className="h-10 gap-2 px-3 text-base" onClick={() => inputRef.current?.click()}>
            <RefreshCw aria-hidden /> Substituir planilha
          </Button>
          <Button
            variant="outline"
            className="h-10 gap-2 px-3 text-base"
            onClick={() => (hasActiveFilters ? setConfirmOpen(true) : onClearSession())}
          >
            <Trash2 aria-hidden /> Limpar sessão
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Limpar a sessão?</DialogTitle>
            <DialogDescription className="text-base">
              Há filtros ativos. Ao limpar, você perde os filtros de todas as abas e volta para a tela de carregamento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-10 text-base" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="h-10 text-base"
              onClick={() => {
                setConfirmOpen(false)
                onClearSession()
              }}
            >
              Limpar sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
