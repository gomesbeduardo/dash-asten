import { useEffect, useRef, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AreaDeEnvio } from "./AreaDeEnvio"

/** Modal de envio da "Nova carga": solta o .xlsx aqui, sem procurar em pastas. */
export function NovoEnvioDialog({
  open,
  onOpenChange,
  onFile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFile: (file: File) => void
}) {
  const [erro, setErro] = useState<string | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const ref = useRef({ onFile, onOpenChange })
  useEffect(() => {
    ref.current = { onFile, onOpenChange }
  })

  function receber(file: File) {
    if (!/\.xlsx$/i.test(file.name)) {
      setErro(`"${file.name}" não é uma planilha .xlsx. Envie um arquivo .xlsx.`)
      return
    }
    setErro(null)
    onOpenChange(false)
    onFile(file)
  }
  const receberRef = useRef(receber)
  useEffect(() => {
    receberRef.current = receber
  })

  // Com o modal aberto, soltar em qualquer ponto da janela vale como soltar na
  // área (e impede o navegador de abrir o arquivo).
  useEffect(() => {
    if (!open) return
    const over = (e: DragEvent) => e.preventDefault()
    const drop = (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) receberRef.current(file)
    }
    window.addEventListener("dragover", over)
    window.addEventListener("drop", drop)
    return () => {
      window.removeEventListener("dragover", over)
      window.removeEventListener("drop", drop)
    }
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setErro(null)
        onOpenChange(v)
      }}
    >
      <DialogContent
        className="sm:max-w-xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          botao.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Nova carga</DialogTitle>
          <DialogDescription className="text-base">
            Solte a planilha .xlsx aqui ou escolha o arquivo. Depois você
            confirma o tipo e a competência.
          </DialogDescription>
        </DialogHeader>
        <AreaDeEnvio
          onFile={receber}
          rotuloInput="Arquivo da nova carga (.xlsx)"
          botaoRef={botao}
        />
        {erro && (
          <p role="alert" className="border-l-4 border-destructive pl-3 text-base font-medium text-destructive">
            {erro}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
