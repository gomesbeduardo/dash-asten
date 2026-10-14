import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"

const ALTURA_PADRAO = 80
const LIMIAR_TOPO = 8

/**
 * Visibilidade da barra superior (D20): escondida por padrão. Aparece por
 * `delay` ms ao montar, quando o mouse entra na região da barra (faixa do topo
 * com a altura dela) ou quando recebe foco de teclado dentro dela; ao sair,
 * some após `leaveDelay` ms. `toggle` (tecla H) fixa a barra: sempre visível,
 * ignorando mouse e timer; de novo, solta. `hold` (menu/painel aberto) a mantém
 * visível.
 */
export function useBarVisibility({
  hold,
  delay = 3000,
  leaveDelay = 800,
  barRef,
}: {
  hold: boolean
  delay?: number
  leaveDelay?: number
  barRef?: RefObject<HTMLElement | null>
}) {
  const [awake, setAwake] = useState(true)
  const [fixa, setFixa] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const naRegiao = useRef(false)
  const fixaRef = useRef(false)

  const agendarSumico = useCallback((ms: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAwake(false), ms)
  }, [])

  useEffect(() => {
    // Inicia o ciclo ao montar e quando `hold` solta.
    clearTimeout(timer.current)
    if (!hold && !naRegiao.current) agendarSumico(delay)
    return () => clearTimeout(timer.current)
  }, [hold, delay, agendarSumico])

  useEffect(() => {
    const entrou = () => {
      naRegiao.current = true
      setAwake(true)
      clearTimeout(timer.current)
    }
    const saiu = () => {
      naRegiao.current = false
      agendarSumico(leaveDelay)
    }
    const onMove = (e: MouseEvent) => {
      const altura = barRef?.current?.getBoundingClientRect().height || ALTURA_PADRAO
      if (e.clientY <= Math.max(altura, LIMIAR_TOPO)) entrou()
      else if (naRegiao.current) saiu()
    }
    const onFocusIn = (e: FocusEvent) => {
      const bar = barRef?.current
      if (bar && e.target instanceof Node && bar.contains(e.target)) {
        setAwake(true)
        naRegiao.current = false
        agendarSumico(delay)
      }
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("focusin", onFocusIn)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("focusin", onFocusIn)
    }
  }, [barRef, delay, leaveDelay, agendarSumico])

  const toggle = useCallback(() => {
    const solta = fixaRef.current
    fixaRef.current = !solta
    setFixa(!solta)
    if (solta) {
      // Soltou: volta ao automático, visível e some após o atraso curto.
      setAwake(true)
      if (!naRegiao.current) agendarSumico(leaveDelay)
    }
  }, [agendarSumico, leaveDelay])

  const visible = hold || fixa || awake
  return { visible, fixa, toggle }
}
