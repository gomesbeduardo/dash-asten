import { useEffect, useRef } from "react"

export type VisaoTecla = "painel" | "leituras" | "comparar" | "evolucao"

/** Todos opcionais: o painel do tipo "outro" e a casca registram cada um os seus. */
export type ShortcutHandlers = {
  onStep: (dir: 1 | -1) => void
  onGoTo: (index: number) => void
  onToggleFilters: () => void
  onEscape: () => void
  onToggleBar: () => void
  onVisao: (visao: VisaoTecla) => void
  onTelaCheia: () => void
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  const role = target.getAttribute("role")
  return role === "combobox" || role === "textbox" || role === "searchbox"
}

/** Atalhos globais do modo apresentação (D20). Ignorados quando o foco está num campo. */
export function useShortcuts(handlers: Partial<ShortcutHandlers>) {
  const ref = useRef<Partial<ShortcutHandlers>>(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (isEditable(e.target)) return
      const h = ref.current
      const k = e.key.toLowerCase()
      if (e.key === "ArrowRight") h.onStep?.(1)
      else if (e.key === "ArrowLeft") h.onStep?.(-1)
      else if (/^[1-9]$/.test(e.key)) h.onGoTo?.(Number(e.key) - 1)
      else if (k === "f") h.onToggleFilters?.()
      else if (k === "h") h.onToggleBar?.()
      else if (k === "t") h.onTelaCheia?.()
      else if (k === "p") h.onVisao?.("painel")
      else if (k === "c") h.onVisao?.("comparar")
      else if (k === "e") h.onVisao?.("evolucao")
      else if (k === "l") h.onVisao?.("leituras")
      else if (e.key === "Escape" && !e.defaultPrevented) h.onEscape?.()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
