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
