import { useEffect, useRef } from "react"

export type ShortcutHandlers = {
  onStep: (dir: 1 | -1) => void
  onGoTo: (index: number) => void
  onToggleFilters: () => void
  onEscape: () => void
  onToggleBar: () => void
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
export function useShortcuts(handlers: ShortcutHandlers) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (isEditable(e.target)) return
      const h = ref.current
      if (e.key === "ArrowRight") h.onStep(1)
      else if (e.key === "ArrowLeft") h.onStep(-1)
      else if (/^[1-9]$/.test(e.key)) h.onGoTo(Number(e.key) - 1)
      else if (e.key === "f" || e.key === "F") h.onToggleFilters()
      else if (e.key === "h" || e.key === "H") h.onToggleBar()
      else if (e.key === "Escape" && !e.defaultPrevented) h.onEscape()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
