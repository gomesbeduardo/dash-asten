import { formatarCompetencia, type CargaMeta } from "@/cargas"

export const competenciaLonga = (c: string): string => {
  const t = formatarCompetencia(c, "longo")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const dataHora = (iso: string): string =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export const rotuloVersao = (m: Pick<CargaMeta, "versao">): string =>
  `v${m.versao}`

/** "v2 · Correção do Líder" (ou só "v2" quando a carga não tem nome). */
export const rotuloComNome = (m: Pick<CargaMeta, "versao" | "nome">): string =>
  m.nome ? `v${m.versao} · ${m.nome}` : `v${m.versao}`

export const LIMITE_NOME = 80

/** Sugestão de nome: o do arquivo sem .xlsx, sem os caracteres que o servidor recusa, até 80. */
export const nomeSugerido = (arquivo: string): string =>
  // eslint-disable-next-line no-control-regex
  arquivo.replace(/\.xlsx$/i, "").replace(/[<>\u0000-\u001f\u007f]/g, "").trim().slice(0, LIMITE_NOME)
