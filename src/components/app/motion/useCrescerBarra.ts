import { useCallback, useInsertionEffect, useRef } from "react"
import { useReducedMotion } from "motion/react"

import { chartGrow } from "./tokens"

// A barra pronta desliza da esquerda (translateX) e o clip esconde o que ainda está antes da base:
// a ponta (raio), o gradiente e a sombra andam inteiros, sem distorcer. As margens negativas do
// clip preservam a sombra (≈9 px) em cima, embaixo e à direita.
const M = "-12px"
const ESCONDIDA = {
  transform: "translateX(-100%)",
  clipPath: `inset(${M} ${M} ${M} 100%)`,
}
const REVELADA = {
  transform: "translateX(0)",
  clipPath: `inset(${M} ${M} ${M} 0%)`,
}

/**
 * Entrada das barras horizontais (D26): em vez de esticar com `scaleX` (que achata o raio da ponta,
 * o gradiente e a sombra), a barra pronta entra da base até o valor, em `chartGrow` e ease-out.
 * Devolve o `ref` do elemento da barra; sem `animar` ou com movimento reduzido ela aparece pronta.
 */
export function useCrescerBarra<T extends HTMLElement>(
  animar: boolean,
  atraso = 0
) {
  const reduce = useReducedMotion()
  // Lidos por ref: o callback fica estável e a entrada roda só na montagem do elemento
  // (um atraso novo, vindo de linha que entrou ou saiu, não pode reanimar a barra).
  const atual = useRef({ ativo: animar && !reduce, atraso })
  // Insertion effect: roda antes de qualquer ref ligar no commit, então um elemento que monta num
  // componente já vivo lê o `animar`/`atraso` deste render (o layout effect viria depois do ref do filho).
  useInsertionEffect(() => {
    atual.current = { ativo: animar && !reduce, atraso }
  })
  return useCallback((el: T | null) => {
    const { ativo, atraso } = atual.current
    if (!el || !ativo || typeof el.animate !== "function") return
    const anim = el.animate([ESCONDIDA, REVELADA], {
      duration: chartGrow,
      easing: "ease-out",
      delay: atraso * 1000,
      fill: "backwards",
    })
    return () => anim.cancel()
  }, [])
}
