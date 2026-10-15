import type { CellValue, Row } from "@/core"
import {
  classificarLinha,
  limitesDaCompetencia,
  reabertoPendente,
  ROTULO_SITUACAO_COMPETENCIA,
  tempo,
  texto,
  type SituacaoNaCompetencia,
} from "./situacao"
import {
  mapearColunas,
  normalizar,
  type CampoChamado,
  type MapaColunas,
} from "./mapeamento"
import type {
  Distribuicao,
  EntradaCompetencia,
  ItemDistribuicao,
  KpiChamados,
  MetricasChamados,
} from "./tipos"

export { limitesDaCompetencia }

const DIA = 86_400_000
const SEM_INFO = "(sem informação)"
const MAX_ITENS = 10

const numero = (v: CellValue | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null
/** Fim do dia UTC (23:59:59.999) do instante dado. */
const fimDoDia = (t: number) => Math.floor(t / DIA) * DIA + DIA - 1

type Chamado = {
  abertura: number
  solucao: number | null
  aceite: number | null
  sla: number | null
  slaPrevisto: number | null
  situacao: string
  reabertura: number | null
  /** Decisão única de backlog: a classificação "aberto-no-fim" (situacao.ts). */
  aberto: boolean
  tempoResolucao: number | null
  row: Row
}

/** Aviso curto de filtro ativo numa carga que não tem a coluna. */
export function avisoColunasSemFiltro(rotulos: string[]): string {
  return rotulos.length === 1
    ? `Sem a coluna ${rotulos[0]} nesta carga: filtro não se aplica`
    : `Sem as colunas ${rotulos.join(", ")} nesta carga: filtros não se aplicam`
}

const DEFINICOES = {
  backlog:
    "Chamados abertos até o fim do mês e sem Data de Solução até o fim do mês (reconstruído pelas datas).",
  entradas: "Chamados com Data de Abertura dentro do mês.",
  saidas: "Chamados com Data de Solução dentro do mês.",
  sla: "Entre os solucionados no mês com SLA, % com Data de Solução até o fim do dia do SLA vigente (renegociado, senão previsto).",
  atraso:
    "Chamados do backlog cujo SLA vigente (renegociado, senão previsto) venceu antes do fim do mês.",
  semSla:
    "Chamados do backlog sem SLA Previsto (considera só o SLA Previsto, pois o renegociado é da data da exportação).",
  abertosApos:
    "Chamados abertos depois do fim da competência. Pertencem à competência seguinte e aparecem só para referência; não entram nos demais indicadores.",
  tempoMedio:
    "Média, em dias corridos, entre abertura e solução dos chamados solucionados no mês.",
  reabertos: "Entre os solucionados no mês, % com ao menos uma reabertura.",
  aguardandoAceite:
    'Chamados abertos até o fim do mês, com Situação contendo "aceite" e sem Data de Aceite até o fim do mês (a Situação é a da data da exportação).',
}

/** KPIs que dependem de colunas da data da exportação (Situação, Qtd Reabertura, SLA Renegociado). */
const NAO_RECONSTRUIVEIS = new Set([
  "aguardandoAceite",
  "reabertos",
  "sla",
  "atraso",
])

function distribuir(
  chamados: Chamado[],
  chave: string | undefined
): ItemDistribuicao[] {
  if (!chave) return []
  const cont = new Map<string, number>()
  for (const c of chamados) {
    const r = texto(c.row[chave]) ?? SEM_INFO
    cont.set(r, (cont.get(r) ?? 0) + 1)
  }
  const ord = [...cont.entries()]
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))
  if (ord.length <= MAX_ITENS) return ord
  const outros = ord.slice(MAX_ITENS).reduce((s, i) => s + i.valor, 0)
  return [...ord.slice(0, MAX_ITENS), { rotulo: "Outros", valor: outros }]
}

function calcularBase(entrada: EntradaCompetencia): MetricasChamados {
  const sem = entrada.colunasSemFiltro ?? []
  const m = calcularBruto(entrada)
  if (sem.length === 0) return m
  return {
    ...m,
    kpis: m.kpis.map((k) => ({
      ...k,
      valor: null,
      detalhe: "filtro sem a coluna nesta carga",
    })),
    distribuicoes: m.distribuicoes.map((d) => ({ ...d, itens: [] })),
    envelhecimento: [],
    porSituacaoNaCompetencia: [],
    linhasConsideradas: null,
    linhasPosteriores: null,
    linhasSemAbertura: null,
    colunasSemFiltro: sem,
    baseAguardandoAceite: null,
    avisos: [...m.avisos, avisoColunasSemFiltro(sem)],
  }
}

function calcularBruto(entrada: EntradaCompetencia): MetricasChamados {
  const { mapa } = mapearColunas(entrada.sheet)
  const { inicio, fim } = limitesDaCompetencia(entrada.competencia)
  const avisos: string[] = []
  const nome = (c: CampoChamado) => c
  const faltam = (campos: CampoChamado[]) => campos.filter((c) => !mapa[c])
  const col = (c: CampoChamado, row: Row) =>
    mapa[c] ? row[mapa[c]] : undefined

  const ausentes = faltam([
    "abertura",
    "situacao",
    "solucao",
    "slaPrevisto",
    "slaRenegociado",
    "aceite",
    "qtdReabertura",
  ])
  if (ausentes.length)
    avisos.push(
      `Colunas não encontradas: ${ausentes.map(nome).join(", ")}. Os indicadores que dependem delas ficam sem valor.`
    )

  const chamados: Chamado[] = []
  const contagem: Record<SituacaoNaCompetencia, number> = {
    "aberto-no-fim": 0,
    "resolvido-no-mes": 0,
    "resolvido-antes": 0,
    "aberto-apos": 0,
    "sem-abertura": 0,
  }
  let reabertosPendentes = 0
  for (const row of entrada.sheet.rows) {
    const abertura = tempo(col("abertura", row))
    const situacaoCompetencia = classificarLinha(row, mapa, entrada.competencia)
    contagem[situacaoCompetencia]++
    if (abertura === null || abertura > fim) continue
    const solucaoTempo = tempo(col("solucao", row))
    if (
      reabertoPendente(row, mapa) &&
      solucaoTempo !== null &&
      solucaoTempo <= fim
    )
      reabertosPendentes++
    const reneg = tempo(col("slaRenegociado", row))
    chamados.push({
      abertura,
      solucao: solucaoTempo,
      aceite: tempo(col("aceite", row)),
      sla: reneg ?? tempo(col("slaPrevisto", row)),
      slaPrevisto: tempo(col("slaPrevisto", row)),
      situacao: normalizar(texto(col("situacao", row)) ?? ""),
      reabertura: numero(col("qtdReabertura", row)),
      aberto: situacaoCompetencia === "aberto-no-fim",
      tempoResolucao: numero(col("tempoResolucao", row)),
      row,
    })
  }
  if (contagem["aberto-apos"] > 0)
    avisos.push(
      `${contagem["aberto-apos"]} chamado(s) abertos após o fim da competência — mostrados à parte`
    )
  if (contagem["sem-abertura"] > 0)
    avisos.push(
      `${contagem["sem-abertura"]} chamado(s) sem Data de Abertura — mostrados à parte`
    )

  if (reabertosPendentes > 0)
    avisos.push(
      `${reabertosPendentes} chamado(s) reabertos depois da solução e não finalizados contam como resolvidos pela Data de Solução`
    )

  const temSolucao = !!mapa.solucao
  const temSla = !!(mapa.slaPrevisto || mapa.slaRenegociado)
  const noMes = (t: number | null) => t !== null && t >= inicio && t <= fim

  const backlog = temSolucao ? chamados.filter((c) => c.aberto) : []
  const saidas = temSolucao ? chamados.filter((c) => noMes(c.solucao)) : []
  const entradas = chamados.filter((c) => noMes(c.abertura))

  const comSla = saidas.filter((c) => c.sla !== null)
  const sla =
    temSolucao && temSla && comSla.length > 0
      ? (comSla.filter((c) => c.solucao! <= fimDoDia(c.sla!)).length /
          comSla.length) *
        100
      : null

  const dias = saidas
    .map((c) => {
      const d = (c.solucao! - c.abertura) / DIA
      return d >= 0 ? d : c.tempoResolucao
    })
    .filter((d): d is number => d !== null)
  const tempoMedio = dias.length
    ? Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10
    : null

  const reabertos =
    mapa.qtdReabertura && saidas.length
      ? (saidas.filter((c) => (c.reabertura ?? 0) > 0).length / saidas.length) *
        100
      : null
  const aguardandoAceite = (c: Chamado) =>
    c.situacao.includes("aceite") && !(c.aceite !== null && c.aceite <= fim)
  const aguardando = mapa.situacao
    ? chamados.filter(aguardandoAceite).length
    : null
  // backlog + resolvidos (até o fim) que ainda aguardam aceite: base coerente do % aguardando
  const baseAguardandoAceite = mapa.situacao
    ? chamados.filter(
        (c) => c.aberto || (c.solucao !== null && aguardandoAceite(c))
      ).length
    : null

  const k = (
    id: string,
    rotulo: string,
    valor: number | null,
    formato: KpiChamados["formato"],
    melhorQuando: KpiChamados["melhorQuando"]
  ): KpiChamados => {
    const reconstruivel = !NAO_RECONSTRUIVEIS.has(id)
    const anular = !reconstruivel && entrada.cargaPropria === false
    return {
      id,
      rotulo,
      valor: anular ? null : valor,
      formato,
      anterior: null,
      delta: null,
      melhorQuando,
      definicao: DEFINICOES[id as keyof typeof DEFINICOES],
      reconstruivel,
      ...(anular ? { detalhe: "exige a carga daquele mês" } : {}),
    }
  }

  const kpis: KpiChamados[] = [
    k(
      "backlog",
      "Backlog aberto",
      temSolucao ? backlog.length : null,
      "inteiro",
      "menor"
    ),
    k("entradas", "Entradas no mês", entradas.length, "inteiro", "neutro"),
    k(
      "saidas",
      "Saídas no mês",
      temSolucao ? saidas.length : null,
      "inteiro",
      "maior"
    ),
    k(
      "abertosApos",
      "Abertos após a competência",
      contagem["aberto-apos"],
      "inteiro",
      "neutro"
    ),
    k("sla", "% no SLA", sla, "percentual", "maior"),
    k(
      "atraso",
      "Em atraso",
      temSolucao && temSla
        ? backlog.filter((c) => c.sla !== null && fimDoDia(c.sla) < fim).length
        : null,
      "inteiro",
      "menor"
    ),
    k(
      "semSla",
      "Sem SLA",
      temSolucao && mapa.slaPrevisto
        ? backlog.filter((c) => c.slaPrevisto === null).length
        : null,
      "inteiro",
      "menor"
    ),
    k("tempoMedio", "Tempo médio de resolução", tempoMedio, "dias", "menor"),
    k("reabertos", "% reabertos", reabertos, "percentual", "menor"),
    k("aguardandoAceite", "Aguardando aceite", aguardando, "inteiro", "neutro"),
  ]

  const defs: [Distribuicao["id"], string, CampoChamado][] = [
    ["cliente", "Backlog por cliente", "cliente"],
    ["areaSuperior", "Backlog por área superior", "areaSuperior"],
    ["atividade", "Backlog por atividade", "atividade"],
    ["situacao", "Backlog por situação atual (na exportação)", "situacao"],
    ["area", "Backlog por área", "area"],
    ["operador", "Backlog por operador (na exportação)", "operador"],
  ]
  const distribuicoes: Distribuicao[] = defs
    .filter(([, , campo]) => mapa[campo as keyof MapaColunas])
    .map(([id, titulo, campo]) => ({
      id,
      titulo,
      itens: distribuir(backlog, mapa[campo]),
      reconstruivel: id !== "situacao" && id !== "operador",
    }))

  const faixas: [string, number][] = [
    ["0–30 dias", 30],
    ["31–90 dias", 90],
    ["91–180 dias", 180],
    ["> 180 dias", Infinity],
  ]
  const envelhecimento: ItemDistribuicao[] = faixas.map(([rotulo]) => ({
    rotulo,
    valor: 0,
  }))
  for (const c of backlog) {
    const idade = Math.floor((fim - c.abertura) / DIA)
    envelhecimento[faixas.findIndex(([, max]) => idade <= max)].valor++
  }

  return {
    competencia: entrada.competencia,
    kpis,
    distribuicoes,
    envelhecimento,
    baseAguardandoAceite: temSolucao ? baseAguardandoAceite : null,
    linhasConsideradas: chamados.length,
    linhasPosteriores: contagem["aberto-apos"],
    linhasSemAbertura: contagem["sem-abertura"],
    porSituacaoNaCompetencia: (
      Object.keys(contagem) as SituacaoNaCompetencia[]
    ).map((s) => ({
      rotulo: ROTULO_SITUACAO_COMPETENCIA[s],
      valor: contagem[s],
    })),
    avisos,
  }
}

export function calcularMetricas(
  atual: EntradaCompetencia,
  anterior?: EntradaCompetencia
): MetricasChamados {
  const m = calcularBase(atual)
  if (!anterior) return m
  const ant = calcularBase(anterior)
  m.kpis = m.kpis.map((k) => {
    const a = ant.kpis.find((x) => x.id === k.id)?.valor ?? null
    return {
      ...k,
      anterior: a,
      delta: k.valor !== null && a !== null ? k.valor - a : null,
    }
  })
  return m
}
