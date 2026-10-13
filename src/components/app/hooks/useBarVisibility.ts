import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Visibilidade da barra superior (D20): aparece com mouse/teclado, some após
 * `delay` ms de inatividade. `hold` (menu/painel aberto) a mantém visível.
 * `toggle` (tecla H) esconde de vez, ou mostra de volta, ignorando o mouse.
 */
export function useBarVisibility({
  hold,
  delay = 3000,
}: {
  hold: boolean
  delay?: number
}) {
  const [awake, setAwake] = useState(true)
  const [forcedHidden, setForcedHidden] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const wake = useCallback(() => {
    setAwake(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAwake(false), delay)
  }, [delay])

  useEffect(() => {
    // Inicia o ciclo de inatividade ao montar e quando `hold` solta.
    clearTimeout(timer.current)
    if (!hold) timer.current = setTimeout(() => setAwake(false), delay)
    return () => clearTimeout(timer.current)
  }, [hold, delay])

  useEffect(() => {
    document.addEventListener("mousemove", wake)
    document.addEventListener("focusin", wake)
    return () => {
      document.removeEventListener("mousemove", wake)
      document.removeEventListener("focusin", wake)
    }
  }, [wake])

  const toggle = useCallback(() => {
    setForcedHidden((v) => !v)
    wake()
  }, [wake])

  const visible = hold || (awake && !forcedHidden)
  return { visible, toggle }
}
