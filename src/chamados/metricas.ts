import type { CellValue, Row } from "@/core"
import {
  classificarLinha,
  limitesDaCompetencia,
  mesesAteCompetencia,
  tempo,
  texto,
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
  ItemFoto,
  KpiChamados,
  MetricasChamados,
} from "./tipos"

export { limitesDaCompetencia }

const DIA = 86_400_000
export const SEM_INFO = "(sem informação)"
const MAX_ITENS = 10

const numero = (v: CellValue | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null
/** Fim do dia UTC (23:59:59.999) do instante dado. */
export const fimDoDia = (t: number) => Math.floor(t / DIA) * DIA + DIA - 1

export type Chamado = {
  abertura: number
  solucao: number | null
  aceite: number | null
  sla: number | null
  slaPrevisto: number | null
  /** SLA Renegociado isolado (o `sla` vigente mistura com o previsto). */
  slaReneg: number | null
  /** Situação normalizada (minúsculas, sem acento). */
  situacao: string
  /** Situação como vem na coluna; vazio = "(sem informação)". */
  situacaoTexto: string
  reabertura: number | null
  /** Situação ≠ Finalizado (D64). */
  naoFinalizado: boolean
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
  entradas: "Chamados com Data de Abertura dentro do mês do Mes Ref.",
  finalizados:
    "Chamados com Situação Finalizado e Data de Solução dentro do mês do Mes Ref. (Data de Solução sem Situação Finalizado não conta).",
  naoFinalizados:
    "Chamados da posição do mês com Situação diferente de Finalizado; nenhuma situação é agrupada por conta própria.",
  atraso:
    "Não finalizados abertos antes do mês do Mes Ref., por meses entre a abertura e o Mes Ref. (1, 2–3, 4–6, 7+).",
  slaVencido:
    "Não finalizados cujo SLA vigente (renegociado, senão previsto) venceu antes do fim do mês do Mes Ref.; sem SLA não conta.",
  sla: "Entre os finalizados no mês com SLA, % com Data de Solução até o fim do dia do SLA vigente (renegociado, senão previsto).",
  tempoMedio:
    "Média, em dias corridos, entre abertura e solução dos chamados finalizados no mês.",
  tempoAceite:
    "Média, em dias corridos, entre a Data de Solução e a Data de Aceite dos chamados aceitos no mês (mede quanto o cliente demora para aceitar; diferenças negativas são ignoradas).",
  reabertos:
    "Entre os finalizados no mês, % com ao menos uma reabertura (Qtd Reabertura maior que zero).",
  semSla: "Não finalizados sem SLA Previsto.",
  slaRenegociado: "Não finalizados com SLA Renegociado preenchido.",
  aguardandoAceite:
    'Chamados da posição do mês com Situação contendo "aceite" e sem Data de Aceite até o fim do mês do Mes Ref.',
}

export const FAIXAS_ATRASO = ["1", "2–3", "4–6", "7+"]
const faixaDeAtraso = (meses: number) =>
  meses <= 1 ? 0 : meses <= 3 ? 1 : meses <= 6 ? 2 : 3

/** Período em ms UTC (inclusive nos dois extremos). */
export type Periodo = { inicio: number; fim: number }

function distribuir(
  chamados: Chamado[],
  chave: string | undefined,
  finalizado: (c: Chamado) => boolean
): ItemFoto[] {
  if (!chave) return []
  const cont = new Map<string, ItemFoto>()
  for (const c of chamados) {
    const f = finalizado(c)
    if (!f && !c.naoFinalizado) continue
    const r = texto(c.row[chave]) ?? SEM_INFO
    const it = cont.get(r) ?? { rotulo: r, finalizados: 0, naoFinalizados: 0 }
    if (f) it.finalizados++
    else it.naoFinalizados++
    cont.set(r, it)
  }
  const total = (i: ItemFoto) => i.finalizados + i.naoFinalizados
  const ord = [...cont.values()].sort(
    (a, b) => total(b) - total(a) || a.rotulo.localeCompare(b.rotulo)
  )
  if (ord.length <= MAX_ITENS) return ord
  const resto = ord.slice(MAX_ITENS)
  return [
    ...ord.slice(0, MAX_ITENS),
    {
      rotulo: "Outros",
      finalizados: resto.reduce((s, i) => s + i.finalizados, 0),
      naoFinalizados: resto.reduce((s, i) => s + i.naoFinalizados, 0),
    },
  ]
}

const DIMENSOES: [Distribuicao["id"], string, CampoChamado][] = [
  ["cliente", "Por cliente", "cliente"],
  ["areaSuperior", "Por área superior", "areaSuperior"],
  ["atividade", "Por atividade", "atividade"],
  ["area", "Por área", "area"],
  ["operador", "Por operador", "operador"],
]

function montarDistribuicoes(
  chamados: Chamado[],
  mapa: MapaColunas,
  finalizado: (c: Chamado) => boolean
): Distribuicao[] {
  return DIMENSOES.filter(([, , campo]) => mapa[campo]).map(
    ([id, titulo, campo]) => ({
      id,
      titulo,
      itens: distribuir(chamados, mapa[campo], finalizado),
    })
  )
}

/**
 * Lê a foto: separa as linhas abertas depois do fim do Mes Ref. e as sem Data de Abertura
 * (contadas à parte; nenhuma é excluída da planilha, D34) dos chamados que entram nos números.
 */
export function lerFoto(entrada: EntradaCompetencia) {
  const { mapa } = mapearColunas(entrada.sheet)
  const col = (c: CampoChamado, row: Row) =>
    mapa[c] ? row[mapa[c]] : undefined
  const chamados: Chamado[] = []
  let abertosDepois = 0
  let semAbertura = 0
  for (const row of entrada.sheet.rows) {
    const posicao = classificarLinha(row, mapa, entrada.competencia)
    if (posicao === "aberto-depois") {
      abertosDepois++
      continue
    }
    if (posicao === "sem-abertura") {
      semAbertura++
      continue
    }
    const reneg = tempo(col("slaRenegociado", row))
    const literal = texto(col("situacao", row))
    const situacao = normalizar(literal ?? "")
    chamados.push({
      abertura: tempo(col("abertura", row))!,
      solucao: tempo(col("solucao", row)),
      aceite: tempo(col("aceite", row)),
      sla: reneg ?? tempo(col("slaPrevisto", row)),
      slaPrevisto: tempo(col("slaPrevisto", row)),
      slaReneg: reneg,
      situacao,
      situacaoTexto: literal ?? SEM_INFO,
      reabertura: numero(col("qtdReabertura", row)),
      naoFinalizado: situacao !== "finalizado",
      tempoResolucao: numero(col("tempoResolucao", row)),
      row,
    })
  }
  return { mapa, chamados, abertosDepois, semAbertura }
}

const noPeriodo = (t: number | null, p: Periodo) =>
  t !== null && t >= p.inicio && t <= p.fim

/**
 * Distribuições por cliente, área superior, área, atividade e operador recalculadas para
 * "finalizados no período": Situação Finalizado e Data de Solução entre `inicio` e `fim`.
 * A série de não finalizados não muda. Alimenta o toggle do card (D64).
 */
export function distribuicoesFinalizadosNoPeriodo(
  entrada: EntradaCompetencia,
  periodo: Periodo
): Distribuicao[] {
  const { mapa, chamados } = lerFoto(entrada)
  if ((entrada.colunasSemFiltro ?? []).length > 0 || !mapa.situacao) return []
  return montarDistribuicoes(
    chamados,
    mapa,
    (c) => !c.naoFinalizado && noPeriodo(c.solucao, periodo)
  )
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
    situacoes: [],
    atrasoFaixas: [],
    totalChamados: null,
    abertosDepois: null,
    linhasSemAbertura: null,
    colunasSemFiltro: sem,
    avisos: [...m.avisos, avisoColunasSemFiltro(sem)],
  }
}

function calcularBruto(entrada: EntradaCompetencia): MetricasChamados {
  const { mapa, chamados, abertosDepois, semAbertura } = lerFoto(entrada)
  const mes = limitesDaCompetencia(entrada.competencia)
  const { fim } = mes
  const avisos: string[] = []

  const ausentes = (
    [
      "abertura",
      "situacao",
      "solucao",
      "slaPrevisto",
      "slaRenegociado",
      "aceite",
      "qtdReabertura",
    ] as CampoChamado[]
  ).filter((c) => !mapa[c])
  if (ausentes.length)
    avisos.push(
      `Colunas não encontradas: ${ausentes.join(", ")}. Os indicadores que dependem delas ficam sem valor.`
    )
  if (abertosDepois > 0)
    avisos.push(
      `${abertosDepois} ${abertosDepois === 1 ? "aberto" : "abertos"} depois do Mes Ref.`
    )
  if (semAbertura > 0)
    avisos.push(
      `${semAbertura} chamado(s) sem Data de Abertura — mostrados à parte`
    )

  const temSituacao = !!mapa.situacao
  const temSolucao = !!mapa.solucao
  const temSla = !!(mapa.slaPrevisto || mapa.slaRenegociado)
  const noMes = (t: number | null) => noPeriodo(t, mes)

  const naoFinalizados = temSituacao
    ? chamados.filter((c) => c.naoFinalizado)
    : []
  const finalizados =
    temSituacao && temSolucao
      ? chamados.filter((c) => !c.naoFinalizado && noMes(c.solucao))
      : []
  const entradas = chamados.filter((c) => noMes(c.abertura))

  // Em atraso (ciclo = Mes Ref.): não finalizado aberto antes do mês, por meses de distância.
  const atrasados = naoFinalizados.filter((c) => c.abertura < mes.inicio)
  const atrasoFaixas: ItemDistribuicao[] = FAIXAS_ATRASO.map((rotulo) => ({
    rotulo,
    valor: 0,
  }))
  for (const c of atrasados) {
    atrasoFaixas[
      faixaDeAtraso(mesesAteCompetencia(c.abertura, entrada.competencia))
    ].valor++
  }

  const comSla = finalizados.filter((c) => c.sla !== null)
  const sla =
    temSla && comSla.length > 0
      ? (comSla.filter((c) => c.solucao! <= fimDoDia(c.sla!)).length /
          comSla.length) *
        100
      : null

  const dias = finalizados
    .map((c) => {
      const d = (c.solucao! - c.abertura) / DIA
      return d >= 0 ? d : c.tempoResolucao
    })
    .filter((d): d is number => d !== null)
  const tempoMedio = dias.length
    ? Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10
    : null

  const diasAceite =
    mapa.aceite && temSolucao
      ? chamados
          .filter((c) => noMes(c.aceite) && c.solucao !== null)
          .map((c) => (c.aceite! - c.solucao!) / DIA)
          .filter((d) => d >= 0)
      : []
  const tempoAceite = diasAceite.length
    ? Math.round(
        (diasAceite.reduce((a, b) => a + b, 0) / diasAceite.length) * 10
      ) / 10
    : null

  const reabertos =
    mapa.qtdReabertura && finalizados.length
      ? (finalizados.filter((c) => (c.reabertura ?? 0) > 0).length /
          finalizados.length) *
        100
      : null
  const aguardando = temSituacao
    ? chamados.filter(
        (c) =>
          c.situacao.includes("aceite") &&
          !(c.aceite !== null && c.aceite <= fim)
      ).length
    : null

  const k = (
    id: keyof typeof DEFINICOES,
    rotulo: string,
    valor: number | null,
    formato: KpiChamados["formato"],
    melhorQuando: KpiChamados["melhorQuando"]
  ): KpiChamados => ({
    id,
    rotulo,
    valor,
    formato,
    anterior: null,
    delta: null,
    melhorQuando,
    definicao: DEFINICOES[id],
  })

  const kpis: KpiChamados[] = [
    k("entradas", "Entradas no mês", entradas.length, "inteiro", "neutro"),
    k(
      "finalizados",
      "Finalizados no mês",
      temSituacao && temSolucao ? finalizados.length : null,
      "inteiro",
      "maior"
    ),
    k(
      "naoFinalizados",
      "Não finalizados",
      temSituacao ? naoFinalizados.length : null,
      "inteiro",
      "menor"
    ),
    k(
      "atraso",
      "Em atraso",
      temSituacao ? atrasados.length : null,
      "inteiro",
      "menor"
    ),
    k(
      "slaVencido",
      "SLA vencido",
      temSituacao && temSla
        ? naoFinalizados.filter((c) => c.sla !== null && fimDoDia(c.sla) < fim)
            .length
        : null,
      "inteiro",
      "menor"
    ),
    k("sla", "% no SLA", sla, "percentual", "maior"),
    k("tempoMedio", "Tempo médio de resolução", tempoMedio, "dias", "menor"),
    k("tempoAceite", "Tempo até o aceite", tempoAceite, "dias", "menor"),
    k("reabertos", "% reabertos", reabertos, "percentual", "menor"),
    k(
      "semSla",
      "Sem SLA",
      temSituacao && mapa.slaPrevisto
        ? naoFinalizados.filter((c) => c.slaPrevisto === null).length
        : null,
      "inteiro",
      "menor"
    ),
    k(
      "slaRenegociado",
      "SLA renegociado",
      temSituacao && mapa.slaRenegociado
        ? naoFinalizados.filter((c) => c.slaReneg !== null).length
        : null,
      "inteiro",
      "neutro"
    ),
    k("aguardandoAceite", "Aguardando aceite", aguardando, "inteiro", "neutro"),
  ]

  const porSituacao = new Map<string, number>()
  if (temSituacao)
    for (const c of chamados)
      porSituacao.set(
        c.situacaoTexto,
        (porSituacao.get(c.situacaoTexto) ?? 0) + 1
      )
  const situacoes = [...porSituacao.entries()]
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))

  return {
    competencia: entrada.competencia,
    kpis,
    distribuicoes: temSituacao
      ? montarDistribuicoes(
          chamados,
          mapa,
          (c) => !c.naoFinalizado && noMes(c.solucao)
        )
      : [],
    situacoes,
    totalChamados: chamados.length,
    atrasoFaixas: temSituacao ? atrasoFaixas : [],
    abertosDepois,
    linhasSemAbertura: semAbertura,
    avisos,
  }
}

/** Põe em cada KPI o valor do mês anterior e o Δ. Não altera `m` (pode ser um resultado em cache). */
export function aplicarAnterior(
  m: MetricasChamados,
  ant: MetricasChamados
): MetricasChamados {
  return {
    ...m,
    kpis: m.kpis.map((k) => {
      const a = ant.kpis.find((x) => x.id === k.id)?.valor ?? null
      return {
        ...k,
        anterior: a,
        delta: k.valor !== null && a !== null ? k.valor - a : null,
      }
    }),
  }
}

export function calcularMetricas(
  atual: EntradaCompetencia,
  anterior?: EntradaCompetencia
): MetricasChamados {
  const m = calcularBase(atual)
  if (!anterior) return m
  return aplicarAnterior(m, calcularBase(anterior))
}
