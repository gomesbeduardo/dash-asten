import type { Competencia } from "@/cargas/types"
import type { CellValue, Row } from "@/core"
import { mapearColunas, normalizar, type CampoChamado, type MapaColunas } from "./mapeamento"
import type { Distribuicao, EntradaCompetencia, ItemDistribuicao, KpiChamados, MetricasChamados } from "./tipos"

const DIA = 86_400_000
const SEM_INFO = "(sem informação)"
const MAX_ITENS = 10

/** Limites do mês "AAAA-MM" em UTC: início = dia 1 00:00:00; fim = último dia 23:59:59.999. */
export function limitesDaCompetencia(c: Competencia): { inicio: number; fim: number } {
  const [ano, mes] = c.split("-").map(Number)
  return { inicio: Date.UTC(ano, mes - 1, 1), fim: Date.UTC(ano, mes, 1) - 1 }
}

const tempo = (v: CellValue | undefined): number | null => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.getTime() : null)
const numero = (v: CellValue | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const texto = (v: CellValue | undefined): string | null => {
  if (v === null || v === undefined) return null
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()
  return s === "" ? null : s
}
/** Fim do dia UTC (23:59:59.999) do instante dado. */
const fimDoDia = (t: number) => Math.floor(t / DIA) * DIA + DIA - 1

type Chamado = {
  abertura: number
  solucao: number | null
  aceite: number | null
  sla: number | null
  situacao: string
  reabertura: number | null
  tempoResolucao: number | null
  row: Row
}

const DEFINICOES = {
  backlog: "Chamados abertos até o fim do mês e sem Data de Solução até o fim do mês (reconstruído pelas datas).",
  entradas: "Chamados com Data de Abertura dentro do mês.",
  saidas: "Chamados com Data de Solução dentro do mês.",
  sla: "Entre os solucionados no mês com SLA, % com Data de Solução até o fim do dia do SLA vigente (renegociado, senão previsto).",
  atraso: "Chamados do backlog cujo SLA vigente (renegociado, senão previsto) venceu antes do fim do mês.",
  semSla: "Chamados do backlog sem SLA previsto nem renegociado.",
  tempoMedio: "Média, em dias corridos, entre abertura e solução dos chamados solucionados no mês.",
  reabertos: "Entre os solucionados no mês, % com ao menos uma reabertura.",
  aguardandoAceite:
    "Chamados abertos até o fim do mês, com Situação contendo \"aceite\" e sem Data de Aceite até o fim do mês (a Situação é a da data da exportação).",
}

function distribuir(chamados: Chamado[], chave: string | undefined): ItemDistribuicao[] {
  if (!chave) return []
  const cont = new Map<string, number>()
  for (const c of chamados) {
    const r = texto(c.row[chave]) ?? SEM_INFO
    cont.set(r, (cont.get(r) ?? 0) + 1)
  }
  const ord = [...cont.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))
  if (ord.length <= MAX_ITENS) return ord
  const outros = ord.slice(MAX_ITENS).reduce((s, i) => s + i.valor, 0)
  return [...ord.slice(0, MAX_ITENS), { rotulo: "Outros", valor: outros }]
}

function calcularBase(entrada: EntradaCompetencia): MetricasChamados {
  const { mapa } = mapearColunas(entrada.sheet)
  const { inicio, fim } = limitesDaCompetencia(entrada.competencia)
  const avisos: string[] = []
  const nome = (c: CampoChamado) => c
  const faltam = (campos: CampoChamado[]) => campos.filter((c) => !mapa[c])
  const col = (c: CampoChamado, row: Row) => (mapa[c] ? row[mapa[c]] : undefined)

  const ausentes = faltam(["abertura", "situacao", "solucao", "slaPrevisto", "slaRenegociado", "aceite", "qtdReabertura"])
  if (ausentes.length) avisos.push(`Colunas não encontradas: ${ausentes.map(nome).join(", ")}. Os indicadores que dependem delas ficam sem valor.`)

  const chamados: Chamado[] = []
  let ignoradas = 0
  for (const row of entrada.sheet.rows) {
    const abertura = tempo(col("abertura", row))
    if (abertura === null || abertura > fim) {
      ignoradas++
      continue
    }
    const reneg = tempo(col("slaRenegociado", row))
    chamados.push({
      abertura,
      solucao: tempo(col("solucao", row)),
      aceite: tempo(col("aceite", row)),
      sla: reneg ?? tempo(col("slaPrevisto", row)),
      situacao: normalizar(texto(col("situacao", row)) ?? ""),
      reabertura: numero(col("qtdReabertura", row)),
      tempoResolucao: numero(col("tempoResolucao", row)),
      row,
    })
  }
  if (ignoradas > 0)
    avisos.push(`${ignoradas} linha(s) ignorada(s): sem Data de Abertura ou abertas depois do fim da competência.`)

  const temSolucao = !!mapa.solucao
  const temSla = !!(mapa.slaPrevisto || mapa.slaRenegociado)
  const noMes = (t: number | null) => t !== null && t >= inicio && t <= fim

  const backlog = temSolucao ? chamados.filter((c) => c.solucao === null || c.solucao > fim) : []
  const saidas = temSolucao ? chamados.filter((c) => noMes(c.solucao)) : []
  const entradas = chamados.filter((c) => noMes(c.abertura))

  const comSla = saidas.filter((c) => c.sla !== null)
  const sla = temSolucao && temSla && comSla.length > 0 ? (comSla.filter((c) => c.solucao! <= fimDoDia(c.sla!)).length / comSla.length) * 100 : null

  const dias = saidas
    .map((c) => {
      const d = (c.solucao! - c.abertura) / DIA
      return d >= 0 ? d : c.tempoResolucao
    })
    .filter((d): d is number => d !== null)
  const tempoMedio = dias.length ? Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10 : null

  const reabertos = mapa.qtdReabertura && saidas.length ? (saidas.filter((c) => (c.reabertura ?? 0) > 0).length / saidas.length) * 100 : null
  const aguardando =
    mapa.situacao ? chamados.filter((c) => c.situacao.includes("aceite") && !(c.aceite !== null && c.aceite <= fim)).length : null

  const k = (
    id: string, rotulo: string, valor: number | null, formato: KpiChamados["formato"], melhorQuando: KpiChamados["melhorQuando"],
  ): KpiChamados => ({ id, rotulo, valor, formato, anterior: null, delta: null, melhorQuando, definicao: DEFINICOES[id as keyof typeof DEFINICOES] })

  const kpis: KpiChamados[] = [
    k("backlog", "Backlog aberto", temSolucao ? backlog.length : null, "inteiro", "menor"),
    k("entradas", "Entradas no mês", entradas.length, "inteiro", "neutro"),
    k("saidas", "Saídas no mês", temSolucao ? saidas.length : null, "inteiro", "maior"),
    k("sla", "% no SLA", sla, "percentual", "maior"),
    k("atraso", "Em atraso", temSolucao && temSla ? backlog.filter((c) => c.sla !== null && fimDoDia(c.sla) < fim).length : null, "inteiro", "menor"),
    k("semSla", "Sem SLA", temSolucao && temSla ? backlog.filter((c) => c.sla === null).length : null, "inteiro", "menor"),
    k("tempoMedio", "Tempo médio de resolução", tempoMedio, "dias", "menor"),
    k("reabertos", "% reabertos", reabertos, "percentual", "menor"),
    k("aguardandoAceite", "Aguardando aceite", aguardando, "inteiro", "neutro"),
  ]

  const defs: [Distribuicao["id"], string, CampoChamado][] = [
    ["cliente", "Backlog por cliente", "cliente"],
    ["areaSuperior", "Backlog por área superior", "areaSuperior"],
    ["atividade", "Backlog por atividade", "atividade"],
    ["situacao", "Backlog por situação", "situacao"],
  ]
  const distribuicoes: Distribuicao[] = defs
    .filter(([, , campo]) => mapa[campo as keyof MapaColunas])
    .map(([id, titulo, campo]) => ({ id, titulo, itens: distribuir(backlog, mapa[campo]) }))

  const faixas: [string, number][] = [["0–30 dias", 30], ["31–90 dias", 90], ["91–180 dias", 180], ["> 180 dias", Infinity]]
  const envelhecimento: ItemDistribuicao[] = faixas.map(([rotulo]) => ({ rotulo, valor: 0 }))
  for (const c of backlog) {
    const idade = Math.floor((fim - c.abertura) / DIA)
    envelhecimento[faixas.findIndex(([, max]) => idade <= max)].valor++
  }

  return { competencia: entrada.competencia, kpis, distribuicoes, envelhecimento, linhasConsideradas: chamados.length, linhasIgnoradas: ignoradas, avisos }
}

export function calcularMetricas(atual: EntradaCompetencia, anterior?: EntradaCompetencia): MetricasChamados {
  const m = calcularBase(atual)
  if (!anterior) return m
  const ant = calcularBase(anterior)
  m.kpis = m.kpis.map((k) => {
    const a = ant.kpis.find((x) => x.id === k.id)?.valor ?? null
    return { ...k, anterior: a, delta: k.valor !== null && a !== null ? k.valor - a : null }
  })
  return m
}
