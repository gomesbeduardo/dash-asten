import { useEffect, useRef, useState } from "react"

const temArquivos = (e: DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes("Files")
const temDialogo = () => !!document.querySelector('[role="dialog"]')

/**
 * Impede o navegador de abrir o arquivo solto fora de uma área de envio
 * (qualquer arraste de arquivos sobre a janela).
 */
export function useImpedirAbrirArquivo() {
  useEffect(() => {
    const impedir = (e: DragEvent) => {
      if (temArquivos(e)) e.preventDefault()
    }
    window.addEventListener("dragover", impedir)
    window.addEventListener("drop", impedir)
    return () => {
      window.removeEventListener("dragover", impedir)
      window.removeEventListener("drop", impedir)
    }
  }, [])
}

/**
 * Arrastar arquivos sobre QUALQUER ponto da janela: `arrastando` fica true
 * (para o aviso de página inteira) e soltar entrega os arquivos. Ignora
 * arraste sem arquivos e não age com outro diálogo aberto.
 */
export function useArrasteNaJanela(
  aoSoltar: (arquivos: File[]) => void,
  ativo = true
) {
  const [arrastando, setArrastando] = useState(false)
  const ref = useRef(aoSoltar)
  useEffect(() => {
    ref.current = aoSoltar
  })

  useEffect(() => {
    if (!ativo) return
    let profundidade = 0
    const fechar = () => {
      profundidade = 0
      setArrastando(false)
    }
    const entrar = (e: DragEvent) => {
      if (!temArquivos(e) || temDialogo()) return
      profundidade++
      setArrastando(true)
    }
    const sair = (e: DragEvent) => {
      if (!temArquivos(e)) return
      profundidade = Math.max(0, profundidade - 1)
      if (profundidade === 0) setArrastando(false)
    }
    const sobre = (e: DragEvent) => {
      if (temArquivos(e)) e.preventDefault()
    }
    const soltar = (e: DragEvent) => {
      if (!temArquivos(e)) return
      e.preventDefault()
      fechar()
      if (temDialogo()) return
      const arquivos = Array.from(e.dataTransfer?.files ?? [])
      if (arquivos.length > 0) ref.current(arquivos)
    }
    window.addEventListener("dragenter", entrar)
    window.addEventListener("dragleave", sair)
    window.addEventListener("dragover", sobre)
    window.addEventListener("drop", soltar)
    window.addEventListener("dragend", fechar)
    return () => {
      window.removeEventListener("dragenter", entrar)
      window.removeEventListener("dragleave", sair)
      window.removeEventListener("dragover", sobre)
      window.removeEventListener("drop", soltar)
      window.removeEventListener("dragend", fechar)
    }
  }, [ativo])

  return arrastando
}
