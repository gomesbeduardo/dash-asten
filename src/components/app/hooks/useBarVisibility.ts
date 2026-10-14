import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"

const ALTURA_PADRAO = 80
const LIMIAR_TOPO = 8
const JANELA_FOCO_RESTAURADO = 800

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
  const holdAnterior = useRef(hold)
  const soltouEm = useRef(-Infinity)

  const agendarSumico = useCallback((ms: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAwake(false), ms)
  }, [])

  useEffect(() => {
    // Inicia o ciclo ao montar e quando `hold` solta.
    clearTimeout(timer.current)
    const soltou = holdAnterior.current && !hold
    holdAnterior.current = hold
    if (soltou) soltouEm.current = Date.now()
    // Ao fechar um menu a barra some após o atraso curto, não o de abertura.
    if (!hold && !naRegiao.current) agendarSumico(soltou ? leaveDelay : delay)
    return () => clearTimeout(timer.current)
  }, [hold, delay, leaveDelay, agendarSumico])

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
      // Mede mesmo escondida: a transformação não altera a altura.
      const barra = barRef?.current
      const altura = barra?.offsetHeight || barra?.getBoundingClientRect().height || ALTURA_PADRAO
      if (e.clientY <= Math.max(altura, LIMIAR_TOPO)) entrou()
      else if (naRegiao.current) saiu()
    }
    const onFocusIn = (e: FocusEvent) => {
      // O foco que o menu devolve ao botão ao fechar não conta como pedido.
      if (Date.now() - soltouEm.current < JANELA_FOCO_RESTAURADO) return
      const bar = barRef?.current
      if (bar && e.target instanceof Node && bar.contains(e.target)) {
        setAwake(true)
        naRegiao.current = false
        agendarSumico(delay)
      }
    }
    // Mouse saiu da janela: sem isso `naRegiao` ficaria preso e a barra também.
    const raiz = document.documentElement
    document.addEventListener("mousemove", onMove)
    raiz.addEventListener("mouseleave", saiu)
    document.addEventListener("focusin", onFocusIn)
    return () => {
      document.removeEventListener("mousemove", onMove)
      raiz.removeEventListener("mouseleave", saiu)
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
