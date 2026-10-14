import type { Competencia } from "./types"

/** Quantas planilhas cabem num envio em lote. */
export const LIMITE_LOTE = 12

export type SeparacaoDoLote<T extends { name: string }> = {
  aceitos: T[]
  /** Nomes dos arquivos que não são .xlsx (ficam fora, sem bloquear os outros). */
  ignorados: string[]
  excedeu: boolean
}

/** Acima do limite nada é aceito (nada será lido); fora isso, só os .xlsx entram. */
export function separarArquivos<T extends { name: string }>(
  arquivos: T[]
): SeparacaoDoLote<T> {
  if (arquivos.length > LIMITE_LOTE)
    return { aceitos: [], ignorados: [], excedeu: true }
  const aceitos: T[] = []
  const ignorados: string[] = []
  for (const a of arquivos) {
    if (/\.xlsx$/i.test(a.name)) aceitos.push(a)
    else ignorados.push(a.name)
  }
  return { aceitos, ignorados, excedeu: false }
}

export type MensagemDoLote = { nivel: "erro" | "aviso"; texto: string }

export function mensagemDoLote(
  r: SeparacaoDoLote<{ name: string }>,
  total: number
): MensagemDoLote | null {
  if (r.excedeu)
    return {
      nivel: "erro",
      texto: `Envie no máximo ${LIMITE_LOTE} planilhas por vez (você escolheu ${total}). Nada foi lido.`,
    }
  if (r.aceitos.length === 0 && r.ignorados.length > 0)
    return {
      nivel: "erro",
      texto:
        r.ignorados.length === 1
          ? `"${r.ignorados[0]}" não é uma planilha .xlsx. Envie um arquivo .xlsx.`
          : `Nenhum dos arquivos é uma planilha .xlsx: ${r.ignorados.join(", ")}.`,
    }
  if (r.ignorados.length > 0)
    return {
      nivel: "aviso",
      texto: `Ficaram de fora por não serem .xlsx: ${r.ignorados.join(", ")}.`,
    }
  return null
}

type Versionavel = { tipo: string; competencia: Competencia }

/** Versão que cada linha do lote receberá, na ordem da lista (existentes + repetidas antes dela). */
export function versoesDoLote(
  existentes: (Versionavel & { versao: number })[],
  linhas: Versionavel[]
): number[] {
  const mesma = (a: Versionavel, b: Versionavel) =>
    a.tipo === b.tipo && a.competencia === b.competencia
  return linhas.map(
    (l, i) =>
      existentes.filter((m) => mesma(m, l)).reduce((max, m) => Math.max(max, m.versao), 0) +
      1 +
      linhas.slice(0, i).filter((o) => mesma(o, l)).length
  )
}

/** A carga de competência mais recente (em empate, a de maior versão). */
export function maisRecenteDoLote<
  T extends { competencia: Competencia; versao: number },
>(guardadas: T[]): T | null {
  let melhor: T | null = null
  for (const g of guardadas) {
    if (
      !melhor ||
      g.competencia > melhor.competencia ||
      (g.competencia === melhor.competencia && g.versao >= melhor.versao)
    )
      melhor = g
  }
  return melhor
}
