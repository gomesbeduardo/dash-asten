import { useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"

import { chartGrow } from "./tokens"

const SEP = "\u0000"

/**
 * Ordem das linhas que acompanha a transição dos valores: quando os dados mudam (filtro,
 * competência), as linhas que continuam ficam na ordem antiga e as novas entram no fim enquanto as
 * barras deslizam; passados `atraso` ms, vale a ordem nova. Primeiro o valor, depois a posição.
 * Com movimento reduzido a ordem nova vale na hora. As chaves devem ser únicas.
 */
export function useOrdemAtrasada<T>(
  itens: T[],
  chave: (item: T) => string,
  atraso = chartGrow
): T[] {
  const reduce = useReducedMotion()
  const alvo = itens.map(chave)
  const assinatura = alvo.join(SEP)
  const [ordem, setOrdem] = useState(alvo)
  const [vista, setVista] = useState(assinatura)
  let mostrada = ordem
  if (assinatura !== vista) {
    // Ajuste de estado no render (padrão do React para reagir a props): sem um frame na ordem nova.
    const presentes = new Set(alvo)
    const antes = new Set(ordem)
    mostrada = reduce
      ? alvo
      : [
          ...ordem.filter((k) => presentes.has(k)),
          ...alvo.filter((k) => !antes.has(k)),
        ]
    setVista(assinatura)
    setOrdem(mostrada)
  }
  const pendente = mostrada.join(SEP) !== assinatura
  useEffect(() => {
    if (!pendente) return
    const t = setTimeout(
      () => setOrdem(assinatura === "" ? [] : assinatura.split(SEP)),
      atraso
    )
    return () => clearTimeout(t)
  }, [pendente, assinatura, atraso])
  const porChave = new Map(itens.map((i) => [chave(i), i]))
  return mostrada.map((k) => porChave.get(k)!)
}
