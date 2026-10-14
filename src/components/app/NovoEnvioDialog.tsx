import { useEffect, useRef, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  mensagemDoLote,
  separarArquivos,
  type MensagemDoLote,
} from "@/cargas/lote"
import { AreaDeEnvio } from "./AreaDeEnvio"

/** Modal de envio da "Nova carga": solta o .xlsx aqui, sem procurar em pastas. */
export function NovoEnvioDialog({
  open,
  onOpenChange,
  onFiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFiles: (files: File[], ignorados: string[]) => void
}) {
  const [mensagem, setMensagem] = useState<MensagemDoLote | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const ref = useRef({ onFiles, onOpenChange })
  useEffect(() => {
    ref.current = { onFiles, onOpenChange }
  })

  // Soltar fora da área (qualquer ponto da janela) passa pelas mesmas regras.
  function receberSolto(lista: FileList | File[]) {
    const todos = Array.from(lista)
    if (todos.length === 0) return
    const r = separarArquivos(todos)
    const m = mensagemDoLote(r, todos.length)
    if (r.aceitos.length === 0) {
      setMensagem(m)
      return
    }
    setMensagem(null)
    ref.current.onOpenChange(false)
    ref.current.onFiles(r.aceitos, r.ignorados)
  }
  const receberRef = useRef(receberSolto)
  useEffect(() => {
    receberRef.current = receberSolto
  })

  // Com o modal aberto, soltar em qualquer ponto da janela vale como soltar na
  // área (e impede o navegador de abrir o arquivo).
  useEffect(() => {
    if (!open) return
    const over = (e: DragEvent) => e.preventDefault()
    const drop = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.files) receberRef.current(e.dataTransfer.files)
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
        if (!v) setMensagem(null)
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
            Solte a planilha .xlsx (ou várias de uma vez, até 12) aqui ou escolha
            os arquivos. Depois você confirma o tipo e a competência.
          </DialogDescription>
        </DialogHeader>
        <AreaDeEnvio
          onFiles={(files, ignorados) => {
            setMensagem(null)
            onOpenChange(false)
            onFiles(files, ignorados)
          }}
          rotuloInput="Arquivo da nova carga (.xlsx)"
          botaoRef={botao}
        />
        {mensagem && (
          <p
            role={mensagem.nivel === "erro" ? "alert" : "status"}
            className="border-l-4 border-destructive pl-3 text-base font-medium text-destructive"
          >
            {mensagem.texto}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
