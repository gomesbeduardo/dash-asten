import { formatarCompetencia, type CargaMeta } from "@/cargas"

const MESES_LONGOS = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export const semAcento = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

export const dataCarga = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

function texto(m: CargaMeta, nomeDoTipo: (id: string) => string): string {
  const [ano, mes] = m.competencia.split("-")
  return semAcento(
    [
      m.arquivo,
      nomeDoTipo(m.tipo),
      m.tipo,
      `v${m.versao}`,
      m.competencia,
      `${mes}/${ano}`,
      formatarCompetencia(m.competencia),
      `${MESES_LONGOS[Number(mes) - 1]} de ${ano}`,
    ].join(" | ")
  )
}

/** Todos os termos da busca precisam aparecer (nome, tipo, versão, competência ou data). */
export function filtrarHistorico(
  metas: CargaMeta[],
  consulta: string,
  nomeDoTipo: (id: string) => string
): CargaMeta[] {
  const termos = semAcento(consulta).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return metas
  return metas.filter((m) => {
    const t = texto(m, nomeDoTipo)
    const data = dataCarga(m.importadaEm)
    // A data só entra quando o termo é uma data completa (dd/mm/aaaa), para
    // "09/2026" (competência) não casar com cargas feitas em 02/09/2026.
    return termos.every(
      (x) => t.includes(x) || (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(x) && data.includes(x))
    )
  })
}
