import type { TipoDeConjunto } from "@/cargas/types"
import type { Sheet, Workbook } from "@/core"

export type CampoChamado =
  | "codigo"
  | "abertura"
  | "solucao"
  | "aceite"
  | "slaPrevisto"
  | "slaRenegociado"
  | "situacao"
  | "cliente"
  | "areaSuperior"
  | "area"
  | "atividade"
  | "severidade"
  | "qtdReabertura"
  | "tempoResolucao"
  | "tempoAtraso"
  | "resumo"
  | "operador"
  | "responsavel"
export type MapaColunas = Partial<Record<CampoChamado, string /* Column.key */>>

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

// Sinônimos já normalizados e sem as palavras "de/da/do/em" (ver `chave`).
const SINONIMOS: Record<CampoChamado, string[]> = {
  codigo: [
    "codigo",
    "cod",
    "id",
    "numero",
    "chamado",
    "os",
    "numero chamado",
    "numero os",
  ],
  abertura: [
    "data abertura",
    "abertura",
    "dt abertura",
    "data aberto",
    "aberto",
  ],
  solucao: [
    "data solucao",
    "solucao",
    "dt solucao",
    "data resolucao",
    "data conclusao",
  ],
  aceite: ["data aceite", "aceite", "dt aceite"],
  slaPrevisto: ["sla previsto", "sla", "prazo sla", "data sla", "sla prevista"],
  slaRenegociado: ["sla renegociado", "sla renegociada", "novo sla"],
  situacao: ["situacao", "status"],
  cliente: ["cliente"],
  areaSuperior: ["area superior", "area pai"],
  area: ["area"],
  atividade: ["atividade"],
  severidade: ["severidade", "prioridade"],
  qtdReabertura: [
    "qtd reabertura",
    "qtd reaberturas",
    "quantidade reabertura",
    "quantidade reaberturas",
    "reaberturas",
    "qtde reabertura",
  ],
  tempoResolucao: ["tempo resolucao", "tempo solucao"],
  tempoAtraso: ["tempo atraso"],
  resumo: ["resumo", "titulo", "assunto"],
  operador: ["operador"],
  responsavel: ["responsavel cliente", "responsavel"],
}

const ESSENCIAIS: CampoChamado[] = ["abertura", "situacao"]
const RECONHECIMENTO: CampoChamado[] = [
  "abertura",
  "situacao",
  "solucao",
  "slaPrevisto",
  "codigo",
]

function chave(s: string): string {
  return normalizar(s)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((p) => p && !["de", "da", "do", "em"].includes(p))
    .join(" ")
}

export function mapearColunas(sheet: Sheet): {
  mapa: MapaColunas
  faltando: CampoChamado[]
} {
  const mapa: MapaColunas = {}
  const usadas = new Set<string>()
  const campos = Object.keys(SINONIMOS) as CampoChamado[]
  // Mais específicos primeiro (sinônimo exato de prioridade mais alta vence).
  for (const campo of campos) {
    for (const sin of SINONIMOS[campo]) {
      const col = sheet.columns.find(
        (c) =>
          !usadas.has(c.key) && (chave(c.label) === sin || chave(c.key) === sin)
      )
      if (col) {
        mapa[campo] = col.key
        usadas.add(col.key)
        break
      }
    }
  }
  return { mapa, faltando: ESSENCIAIS.filter((c) => !mapa[c]) }
}

function pontuar(sheet: Sheet): number {
  return Object.keys(mapearColunas(sheet).mapa).length
}

export function escolherAba(workbook: Workbook): Sheet | null {
  let melhor: Sheet | null = null
  let pontos = 0
  for (const s of workbook.sheets) {
    const p = pontuar(s)
    if (p > pontos) {
      melhor = s
      pontos = p
    }
  }
  return melhor
}

export const tipoChamados: TipoDeConjunto = {
  id: "chamados",
  nome: "Chamados / OS",
  descricao:
    "Registro de chamados/OS, uma linha por chamado, com datas de abertura, solução e SLA.",
  reconhecer(workbook) {
    let melhor = 0
    for (const s of workbook.sheets) {
      const { mapa } = mapearColunas(s)
      const achados = RECONHECIMENTO.filter((c) => mapa[c]).length
      melhor = Math.max(melhor, achados / RECONHECIMENTO.length)
    }
    return melhor
  },
}
