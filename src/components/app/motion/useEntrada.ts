import { useState } from "react"

/**
 * Trava o `entrada` recebido na montagem. O painel remonta a cada troca de
 * aba/competência (key na Apresentacao), mas a Apresentacao marca a chave como
 * vista logo após o 1º render: se os dados chegam depois, o prop já virou
 * false e o conteúdo real entraria sem animação. Travado, `play` e `animar`
 * ficam estáveis durante a vida do painel (revisita monta com false).
 */
export function useEntrada(entrada: boolean) {
  return useState(() => entrada)[0]
}
