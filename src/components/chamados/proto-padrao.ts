/** PROTÓTIPO descartável (prancha de decisão, specs 003 e 004): escolhe a variante pela query string. */
export type VarianteComparar = "atual" | "A" | "B"
export type VarianteLeituras = "atual" | "A" | "B"

function ler<T extends string>(nome: string, validas: T[], padrao: T): T {
  if (typeof window === "undefined") return padrao
  const v = new URLSearchParams(window.location.search).get(nome)
  return (validas as string[]).includes(v ?? "") ? (v as T) : padrao
}

export const varianteComparar = () =>
  ler<VarianteComparar>("comparar", ["atual", "A", "B"], "A")
export const varianteLeituras = () =>
  ler<VarianteLeituras>("leituras", ["atual", "A", "B"], "A")

/** Peso da cor cheia de cada competência, da mais recente (100%) para trás; o resto é o fundo do cartão. */
const PESOS = [100, 80, 62, 48, 38, 30]

/** Competências em ordem cronológica: a mais recente na cor cheia dos finalizados, as anteriores cada vez mais claras (só tokens). */
export const corCronologica = (indice: number, total: number) =>
  indice === total - 1
    ? "var(--serie-finalizados)"
    : `color-mix(in srgb, var(--serie-finalizados) ${PESOS[total - 1 - indice]}%, var(--card))`

import { COR_FIN, COR_NAO, corDaFaixa, corDaSituacao } from "./cores"

/** Cor por significado de cada barra da evidência de uma leitura; o que não é destaque fica atenuado na mesma cor. */
export function corDaEvidencia(
  leituraId: string,
  rotulo: string,
  destaque: boolean
): string {
  let cor: string
  switch (leituraId) {
    case "envelhecimento":
      cor = corDaFaixa(rotulo)
      break
    case "gargaloCliente":
      cor = corDaSituacao(rotulo)
      break
    case "fluxo":
      cor = rotulo === "Entradas" ? "var(--serie-entradas)" : COR_FIN
      break
    default:
      cor = COR_NAO // concentração e sem SLA: são não finalizados
  }
  return destaque
    ? cor
    : `color-mix(in srgb, ${cor} 45%, var(--card))`
}
