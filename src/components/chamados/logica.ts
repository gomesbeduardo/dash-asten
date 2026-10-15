/** Lógica pura da UI de Chamados: formatação, deltas, pareamento de cargas e séries. */
import {
  competenciaAnterior,
  formatarCompetencia,
  type CargaMeta,
  type Competencia,
} from "@/cargas"
import {
  evolucao,
  mapearColunas,
  classificarLinha,
  type CampoChamado,
  type EntradaCompetencia,
  type FormatoKpi,
  type KpiChamados,
  type Leitura,
  type MetricasChamados,
  type ItemDistribuicao,
  avisoColunasSemFiltro,
} from "@/chamados"
import type { CellValue, Sheet } from "@/core"

const nf = (digitos: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digitos,
    maximumFractionDigits: digitos,
  })
const inteiro = nf(0)
const decimal = nf(1)

export function formatarKpi(valor: number | null, formato: FormatoKpi): string {
  if (valor === null || !Number.isFinite(valor)) return "—"
  if (formato === "inteiro") return inteiro.format(valor)
  if (formato === "percentual") return `${decimal.format(valor)}%`
  return `${decimal.format(valor)} dias`
}

export type DeltaUI = {
  texto: string
  sentido: "alta" | "queda" | "igual"
  tom: "bom" | "ruim" | "neutro"
  /** Palavra que acompanha a cor (a cor nunca vai sozinha). Vazia no tom neutro. */
  rotuloTom: "melhor" | "pior" | ""
}

export function descreverDelta(
  kpi: Pick<KpiChamados, "delta" | "formato" | "melhorQuando">,
  rotuloAnterior: string
): DeltaUI | null {
  const { delta, formato, melhorQuando } = kpi
  if (delta === null || !Number.isFinite(delta)) return null
  const arred =
    formato === "inteiro" ? Math.round(delta) : Math.round(delta * 10) / 10
  const sentido = arred > 0 ? "alta" : arred < 0 ? "queda" : "igual"
  const fmt = formato === "inteiro" ? inteiro : decimal
  const sinal = arred > 0 ? "+" : arred < 0 ? "-" : ""
  const unidade =
    formato === "percentual" ? " p.p." : formato === "dias" ? " dias" : ""
  const texto = `${sinal}${fmt.format(Math.abs(arred))}${unidade} vs ${rotuloAnterior}`
  let tom: DeltaUI["tom"] = "neutro"
  if (sentido !== "igual" && melhorQuando !== "neutro") {
    const subiu = sentido === "alta"
    tom = (melhorQuando === "maior") === subiu ? "bom" : "ruim"
  }
  return {
    texto,
    sentido,
    tom,
    rotuloTom: tom === "bom" ? "melhor" : tom === "ruim" ? "pior" : "",
  }
}

/** Id do elemento (KPI ou gráfico) que uma leitura aponta em `evidencia`. */
export const idAlvo = (id: string) => `ev-${id}`

/** Mais recente versão de cada competência, da mais antiga à mais nova. */
export function ultimasVersoes(metas: CargaMeta[]): CargaMeta[] {
  const por = new Map<Competencia, CargaMeta>()
  for (const m of metas) {
    const atual = por.get(m.competencia)
    if (!atual || m.versao > atual.versao) por.set(m.competencia, m)
  }
  return [...por.values()].sort((a, b) =>
    a.competencia.localeCompare(b.competencia)
  )
}

export function metaAnterior(
  historico: CargaMeta[],
  competencia: Competencia
): CargaMeta | null {
  const alvo = competenciaAnterior(competencia)
  return ultimasVersoes(historico).find((m) => m.competencia === alvo) ?? null
}

export type OpcaoCompetencia = {
  competencia: Competencia
  rotulo: string
  meta: CargaMeta
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Competências escolhíveis em Comparar: as que têm carga (foto), da mais recente à mais antiga. Mês sem foto não é reconstruído. */
export function opcoesDeCompetencia(
  historico: CargaMeta[]
): OpcaoCompetencia[] {
  return ultimasVersoes(historico)
    .reverse()
    .map((meta) => ({
      competencia: meta.competencia,
      rotulo: cap(formatarCompetencia(meta.competencia, "longo")),
      meta,
    }))
}

export const MAX_OPERADORES = 8
export const MAX_CLIENTES = 5

export type PontoEvolucao = {
  competencia: Competencia
  rotulo: string
  valores: Record<string, number | null>
}

export function pontosDaEvolucao(
  proprias: { meta: CargaMeta; sheet: Sheet }[],
  maxPontos = 6,
  filtros: FiltrosChamados = {}
): {
  pontos: PontoEvolucao[]
  kpis: { id: string; rotulo: string; formato: FormatoKpi }[]
  /** Filtros ativos sem coluna em alguma carga da janela: os pontos dela ficam vazios. */
  avisosFiltro: string[]
  /** Não finalizados por operador (8 maiores) e por cliente (5 maiores) ao longo da janela. */
  dimensoes: { operador: SeriesDimensao; cliente: SeriesDimensao }
} {
  const maisRecentes = new Map<Competencia, { meta: CargaMeta; sheet: Sheet }>()
  for (const p of proprias) {
    const a = maisRecentes.get(p.meta.competencia)
    if (!a || p.meta.versao > a.meta.versao)
      maisRecentes.set(p.meta.competencia, p)
  }
  const n = Math.max(maxPontos, 0)
  // Uma foto por competência (a versão mais recente), as `n` mais recentes. Mês sem foto não é reconstruído.
  const comps = [...maisRecentes.keys()]
    .sort((a, b) => a.localeCompare(b))
    .slice(-n || undefined)
  if (comps.length === 0 || n === 0)
    return {
      pontos: [],
      kpis: [],
      avisosFiltro: [],
      dimensoes: {
        operador: seriesPorDimensao([], "operador", MAX_OPERADORES),
        cliente: seriesPorDimensao([], "cliente", MAX_CLIENTES),
      },
    }
  const todas = comps.map((c): EntradaCompetencia => {
    const { sheet } = maisRecentes.get(c)!
    return {
      competencia: c,
      colunasSemFiltro: colunasAusentes(sheet, filtros),
      sheet: filtrarSheet(sheet, filtros, c),
    }
  })
  const ev = evolucao(todas)
  const pontos = ev.competencias.map((competencia, i) => ({
    competencia,
    rotulo: formatarCompetencia(competencia),
    valores: Object.fromEntries(ev.series.map((s) => [s.id, s.valores[i]])),
  }))
  const semColuna = [...new Set(todas.flatMap((e) => e.colunasSemFiltro ?? []))]
  return {
    pontos,
    avisosFiltro: semColuna.length ? [avisoColunasSemFiltro(semColuna)] : [],
    dimensoes: {
      operador: seriesPorDimensao(todas, "operador", MAX_OPERADORES),
      cliente: seriesPorDimensao(todas, "cliente", MAX_CLIENTES),
    },
    kpis: ev.series.map(({ id, rotulo, formato }) => ({ id, rotulo, formato })),
  }
}

export type SeriesDimensao = {
  /** Uma por valor da coluna (já limitado a `maxLinhas`); `id` seguro para dataKey. */
  series: { id: string; rotulo: string }[]
  pontos: PontoEvolucao[]
  /** Quantos valores distintos tinham não finalizados na competência mais recente. */
  total: number
  /** Alguma carga da janela tem a coluna. */
  temColuna: boolean
  /** Competência usada no ranking (a mais recente com a coluna). */
  competenciaRanking: Competencia | null
}

/**
 * Não finalizados (Situação ≠ Finalizado, abertos até o fim do Mes Ref., mesma regra do motor)
 * por valor de uma coluna, para cada competência da janela. Mantém os `maxLinhas` valores com
 * mais não finalizados na competência mais recente. Sem a coluna na carga, ou filtro sem coluna (D61): null (a linha
 * quebra), nunca zero. Valor vazio vira "(sem informação)" (D34).
 */
export function seriesPorDimensao(
  todas: EntradaCompetencia[],
  campo: CampoChamado,
  maxLinhas: number
): SeriesDimensao {
  const ordenadas = [...todas].sort((a, b) =>
    a.competencia.localeCompare(b.competencia)
  )
  const contagens = ordenadas.map((e) => {
    const { mapa } = mapearColunas(e.sheet)
    const chave = mapa[campo as CampoChamado]
    if (!chave || !mapa.situacao || (e.colunasSemFiltro ?? []).length > 0)
      return null
    const m = new Map<string, number>()
    for (const row of e.sheet.rows) {
      if (classificarLinha(row, mapa, e.competencia) !== "na-foto") continue
      if (normalizarTexto(textoDe(row[mapa.situacao])) === "finalizado")
        continue
      const t = textoDe(row[chave])
      m.set(t, (m.get(t) ?? 0) + 1)
    }
    return m
  })
  const temColuna = ordenadas.some((e) => {
    const { mapa } = mapearColunas(e.sheet)
    return !!mapa[campo as CampoChamado]
  })
  let ref = -1
  contagens.forEach((c, i) => {
    if (c) ref = i
  })
  const rank = ref >= 0 ? [...contagens[ref]!.entries()] : []
  rank.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const series = rank
    .slice(0, Math.max(maxLinhas, 0))
    .map(([rotulo], i) => ({ id: `d${i}`, rotulo }))
  const pontos = ordenadas.map((e, i) => ({
    competencia: e.competencia,
    rotulo: formatarCompetencia(e.competencia),
    valores: Object.fromEntries(
      series.map((s) => [
        s.id,
        contagens[i] ? (contagens[i]!.get(s.rotulo) ?? 0) : null,
      ])
    ),
  }))
  return {
    series,
    pontos,
    total: rank.length,
    temColuna,
    competenciaRanking: ref >= 0 ? ordenadas[ref].competencia : null,
  }
}

export type LinhaSerie = {
  competencia: Competencia
  rotulo: string
} & Record<string, number | null | string>

/** Prepara os dados para linhas: uma chave por série (`<id>`); sem dado (null) quebra a linha. */
export function linhasDeSerie(
  pontos: PontoEvolucao[],
  ids: string[]
): LinhaSerie[] {
  return pontos.map((p) => {
    const linha: LinhaSerie = {
      competencia: p.competencia,
      rotulo: p.rotulo,
    }
    for (const id of ids) linha[id] = p.valores[id] ?? null
    return linha
  })
}

/** Um item (categoria) com um valor por competência, na ordem cronológica das colunas. */
export type ItemSerie = { rotulo: string; valores: (number | null)[] }

export function agruparSeries(itens: ItemSerie[], max: number): ItemSerie[] {
  if (itens.length <= max) return itens
  const resto = itens.slice(max)
  const colunas = itens[0].valores.length
  return [
    ...itens.slice(0, max),
    {
      rotulo: "Outros",
      valores: Array.from({ length: colunas }, (_, c) =>
        resto.reduce((s, i) => s + (i.valores[c] ?? 0), 0)
      ),
    },
  ]
}

export type Sentido = "alta" | "queda" | "igual"

/** Sentido de `anterior` para `atual`, com o mesmo arredondamento do Δ exibido; null se faltar dado. */
export function sentidoEntre(
  anterior: number | null,
  atual: number | null,
  formato: FormatoKpi
): Sentido | null {
  if (anterior === null || atual === null) return null
  const d = atual - anterior
  if (!Number.isFinite(d)) return null
  const arred = formato === "inteiro" ? Math.round(d) : Math.round(d * 10) / 10
  return arred > 0 ? "alta" : arred < 0 ? "queda" : "igual"
}

/** Competência a sugerir em "Adicionar": a mais próxima antes da mais antiga escolhida; senão a mais recente livre. */
export function proximaParaAdicionar(
  opcoes: { competencia: Competencia }[],
  escolhidas: Competencia[]
): Competencia | null {
  const livres = opcoes.filter((o) => !escolhidas.includes(o.competencia))
  if (livres.length === 0) return null
  const maisAntiga = [...escolhidas].sort()[0]
  const antes = livres.filter((o) => o.competencia < maisAntiga)
  if (antes.length > 0)
    return antes.reduce((x, y) => (x.competencia > y.competencia ? x : y))
      .competencia
  return livres.reduce((x, y) => (x.competencia > y.competencia ? x : y))
    .competencia
}

export type KpiN = {
  id: string
  rotulo: string
  formato: FormatoKpi
  melhorQuando: KpiChamados["melhorQuando"]
  valores: (number | null)[]
  /** última − primeira; null se qualquer das duas não tiver dado. */
  delta: number | null
  /** Por coluna: sentido contra a coluna anterior (null na primeira ou sem dado). */
  setas: (Sentido | null)[]
}
export type ComparacaoN = {
  competencias: Competencia[]
  kpis: KpiN[]
  /** Valores = não finalizados de cada foto. */
  distribuicoes: { id: string; titulo: string; itens: ItemSerie[] }[]
  atrasoFaixas: ItemSerie[]
}

/** O que `compararN` lê de uma coluna: uma foto (`MetricasChamados`), corrigida ou o mês sem foto (D65). */
export type MetricasComparavel = Pick<
  MetricasChamados,
  "competencia" | "kpis" | "atrasoFaixas"
> & {
  distribuicoes: {
    id: string
    titulo: string
    itens: { rotulo: string; naoFinalizados: number | null }[]
  }[]
  colunasSemFiltro?: string[]
  /** Mês sem foto: distribuições e faixas ficam sem dado (nunca zero). */
  semFoto?: boolean
}

const juntarItens = (
  listas: ItemDistribuicao[][],
  ordenar = true,
  semDados: boolean[] = []
): ItemSerie[] => {
  const mapas = listas.map((l) => new Map(l.map((i) => [i.rotulo, i.valor])))
  const rotulos = [...new Set(listas.flatMap((l) => l.map((i) => i.rotulo)))]
  const itens = rotulos.map((rotulo) => ({
    rotulo,
    valores: mapas.map((m, k) => (semDados[k] ? null : (m.get(rotulo) ?? 0))),
  }))
  const total = (i: ItemSerie) =>
    i.valores.reduce<number>((s, v) => s + (v ?? 0), 0)
  return ordenar ? itens.sort((x, y) => total(y) - total(x)) : itens
}

/** Compara N competências (já em ordem cronológica): valores por coluna, Δ = última − primeira e setas vs anterior. */
export function compararN(metricas: MetricasComparavel[]): ComparacaoN {
  const ultima = metricas[metricas.length - 1]
  const kpis = ultima.kpis.map((k) => {
    const valores = metricas.map(
      (m) => m.kpis.find((x) => x.id === k.id)?.valor ?? null
    )
    const primeiro = valores[0]
    const fim = valores[valores.length - 1]
    return {
      id: k.id,
      rotulo: k.rotulo,
      formato: k.formato,
      melhorQuando: k.melhorQuando,
      valores,
      delta: primeiro !== null && fim !== null ? fim - primeiro : null,
      setas: valores.map((v, i) =>
        i === 0 ? null : sentidoEntre(valores[i - 1], v, k.formato)
      ),
    }
  })
  const semDados = metricas.map(
    (m) => (m.colunasSemFiltro ?? []).length > 0 || m.semFoto === true
  )
  const ids = [
    ...new Set(metricas.flatMap((m) => m.distribuicoes.map((d) => d.id))),
  ]
  const distribuicoes = ids.map((id) => {
    const ds = metricas.map((m) => m.distribuicoes.find((d) => d.id === id))
    return {
      id,
      titulo: (ds[ds.length - 1] ?? ds.find(Boolean))!.titulo,
      itens: juntarItens(
        ds.map((d, k) =>
          (metricas[k].semFoto ? [] : (d?.itens ?? [])).map((i) => ({
            rotulo: i.rotulo,
            valor: i.naoFinalizados ?? 0,
          }))
        ),
        true,
        semDados
      ),
    }
  })
  return {
    competencias: metricas.map((m) => m.competencia),
    kpis,
    distribuicoes,
    // faixas de atraso ficam na ordem do motor, não por total
    atrasoFaixas: juntarItens(
      metricas.map((m) => m.atrasoFaixas),
      false,
      semDados
    ),
  }
}

/** Por que o delta é "—": o detalhe do motor ou a falta de base no mês anterior. */
export function motivoSemDelta(kpi: Pick<KpiChamados, "detalhe">): string {
  return kpi.detalhe ?? "sem base no mês anterior"
}

// ---------------------------------------------------------------- filtros

export type CampoFiltro =
  | "cliente"
  | "autarquia"
  | "areaSuperior"
  | "area"
  | "atividade"
  | "tipo"
  | "severidade"
  | "operador"
  | "situacao"

export const CAMPOS_FILTRO: { campo: CampoFiltro; rotulo: string }[] = [
  { campo: "cliente", rotulo: "Cliente" },
  { campo: "autarquia", rotulo: "Autarquia" },
  { campo: "areaSuperior", rotulo: "Área Superior" },
  { campo: "area", rotulo: "Área" },
  { campo: "atividade", rotulo: "Atividade" },
  { campo: "tipo", rotulo: "Tipo" },
  { campo: "severidade", rotulo: "Severidade" },
  { campo: "operador", rotulo: "Operador" },
  { campo: "situacao", rotulo: "Situação" },
]

/** Valores escolhidos por dimensão. Vale para o painel, a comparação e a evolução. */
export type FiltrosChamados = Partial<Record<CampoFiltro, string[]>>

const SEM_INFO = "(sem informação)"

function textoDe(v: CellValue | undefined): string {
  if (v === null || v === undefined) return SEM_INFO
  const t = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()
  return t === "" ? SEM_INFO : t
}

const ativos = (f: FiltrosChamados) =>
  CAMPOS_FILTRO.filter(({ campo }) => (f[campo]?.length ?? 0) > 0)

/** Rótulos dos filtros ativos cuja coluna não existe na planilha (a carga não consegue aplicá-los). */
export function colunasAusentes(
  sheet: Sheet,
  filtros: FiltrosChamados
): string[] {
  const { mapa } = mapearColunas(sheet)
  return ativos(filtros)
    .filter(({ campo }) => !mapa[campo as CampoChamado])
    .map(({ rotulo }) => rotulo)
}

/** Mesma planilha, só com as linhas do recorte. Nenhuma coluna muda; sem filtro devolve a própria planilha. */
export function filtrarSheet(
  sheet: Sheet,
  filtros: FiltrosChamados,
  // a competência não decide mais o recorte (a Situação é literal); o parâmetro fica para não mexer nos chamadores (hooks.ts)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _competencia?: Competencia
): Sheet {
  const lista = ativos(filtros)
  if (lista.length === 0) return sheet
  const { mapa } = mapearColunas(sheet)
  const rows = sheet.rows.filter((row) =>
    lista.every(({ campo }) => {
      const valores = filtros[campo]!
      const chave = mapa[campo as CampoChamado]
      return chave ? valores.includes(textoDe(row[chave])) : false
    })
  )
  return { ...sheet, rows }
}

export function opcoesDoFiltro(sheet: Sheet, campo: CampoFiltro): string[] {
  const chave = mapearColunas(sheet).mapa[campo as CampoChamado]
  if (!chave) return []
  const conjunto = new Set(sheet.rows.map((r) => textoDe(r[chave])))
  const tem = conjunto.delete(SEM_INFO)
  const lista = [...conjunto].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  )
  return tem ? [SEM_INFO, ...lista] : lista
}

export function definirFiltro(
  filtros: FiltrosChamados,
  campo: CampoFiltro,
  valores: string[]
): FiltrosChamados {
  const resto = { ...filtros }
  if (valores.length === 0) delete resto[campo]
  else resto[campo] = valores
  return resto
}

export function chipsDosFiltros(
  filtros: FiltrosChamados
): { key: CampoFiltro; label: string; text: string }[] {
  return ativos(filtros).map(({ campo, rotulo }) => ({
    key: campo,
    label: rotulo,
    text: filtros[campo]!.join(", "),
  }))
}

export function recorteTexto(filtros: FiltrosChamados): string {
  return chipsDosFiltros(filtros)
    .map((c) => `${c.label}: ${c.text}`)
    .join(" · ")
}

/** Filtro de linhas sugerido por uma leitura; "idade" só destaca o gráfico, não filtra. */
export function filtroDaLeitura(
  leitura: Pick<Leitura, "filtro">
): { campo: CampoFiltro; valores: string[] } | null {
  const f = leitura.filtro
  if (!f || f.campo === "idade") return null
  if (CAMPOS_FILTRO.some((c) => c.campo === f.campo))
    return { campo: f.campo as CampoFiltro, valores: f.valores }
  return null
}

// ---------------------------------------------------------------- leituras e selos

/** Origem de um dado que não é original puro; o selo aparece igual em todas as visões. */
export type SeloTipo = "outros" | "corrigido"

const REGRAS: Record<Leitura["id"], string> = {
  fluxo:
    "Finalizados no mês de pelo menos 1,5 vez as entradas e menos não finalizados que no mês anterior.",
  concentracao: "Um único cliente com 40% ou mais dos não finalizados (≥ 40%).",
  envelhecimento:
    "Mais de 25% dos não finalizados abertos há 7 meses ou mais do Mes Ref. (acima de 40% vira crítico).",
  gargaloCliente:
    "30% ou mais dos não finalizados aguardando aceite do cliente (≥ 30%).",
  semSla: "20% ou mais dos não finalizados sem SLA previsto (≥ 20%).",
}
export const regraDaLeitura = (id: Leitura["id"]) => REGRAS[id]

export type NumeroLeitura = { rotulo: string; valor: string }
const pct = (parte: number, todo: number) =>
  todo > 0 ? `${Math.round((parte / todo) * 100)}%` : "—"

/** Números que sustentam a leitura: os específicos primeiro, depois os indicadores da evidência. */
export function numerosDaLeitura(
  l: Leitura,
  m: MetricasChamados
): NumeroLeitura[] {
  const kpi = (id: string) => m.kpis.find((k) => k.id === id)
  const abertos = kpi("naoFinalizados")?.valor ?? 0
  const out: NumeroLeitura[] = []
  if (l.id === "concentracao") {
    const nome = l.filtro?.valores[0]
    const n = m.distribuicoes
      .find((d) => d.id === "cliente")
      ?.itens.find((i) => i.rotulo === nome)?.naoFinalizados
    if (nome && n !== undefined) {
      out.push({
        rotulo: `Não finalizados de ${nome}`,
        valor: inteiro.format(n),
      })
      out.push({
        rotulo: "Participação nos não finalizados",
        valor: pct(n, abertos),
      })
    }
  }
  if (l.id === "envelhecimento") {
    const n = m.atrasoFaixas.find((f) => f.rotulo === "7+")?.valor
    if (n !== undefined) {
      out.push({
        rotulo: "Abertos há 7 meses ou mais",
        valor: inteiro.format(n),
      })
      out.push({
        rotulo: "Participação nos não finalizados",
        valor: pct(n, abertos),
      })
    }
  }
  for (const id of l.evidencia) {
    const k = kpi(id)
    if (k)
      out.push({ rotulo: k.rotulo, valor: formatarKpi(k.valor, k.formato) })
  }
  return out
}

export type EvidenciaLeitura = {
  titulo: string
  itens: ItemDistribuicao[]
  /** Rótulos dos itens em destaque no mini-gráfico. */
  destaque: string[]
}

/** Dados do mini-gráfico do modal: o recorte que mostra de onde vem a conclusão. */
export function evidenciaDaLeitura(
  l: Leitura,
  m: MetricasChamados
): EvidenciaLeitura | null {
  const kpi = (id: string) => m.kpis.find((k) => k.id === id)?.valor ?? null
  switch (l.id) {
    case "concentracao": {
      const d = m.distribuicoes.find((x) => x.id === "cliente")
      return d
        ? {
            titulo: "Não finalizados por cliente",
            itens: d.itens
              .filter((i) => i.naoFinalizados > 0)
              .map((i) => ({ rotulo: i.rotulo, valor: i.naoFinalizados })),
            destaque: l.filtro?.valores ?? [],
          }
        : null
    }
    case "envelhecimento":
      return {
        titulo: "Em atraso por meses desde a abertura",
        itens: m.atrasoFaixas,
        destaque: ["7+"],
      }
    case "gargaloCliente":
      return {
        titulo: "Chamados por situação",
        itens: m.situacoes,
        destaque: m.situacoes
          .filter((i) => normalizarTexto(i.rotulo).includes("aceite"))
          .map((i) => i.rotulo),
      }
    case "semSla": {
      const abertos = kpi("naoFinalizados")
      const sem = kpi("semSla")
      if (abertos === null || sem === null) return null
      return {
        titulo: "Não finalizados com e sem SLA previsto",
        itens: [
          { rotulo: "Com SLA previsto", valor: abertos - sem },
          { rotulo: "Sem SLA", valor: sem },
        ],
        destaque: ["Sem SLA"],
      }
    }
    case "fluxo": {
      const e = kpi("entradas")
      const f = kpi("finalizados")
      if (e === null || f === null) return null
      return {
        titulo: "Entradas e finalizados do mês",
        itens: [
          { rotulo: "Entradas", valor: e },
          { rotulo: "Finalizados", valor: f },
        ],
        destaque: ["Finalizados"],
      }
    }
  }
}

const normalizarTexto = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** O gráfico tem itens somados em "Outros". */
export function temOutros<T extends { rotulo: string }>(itens: T[]) {
  return itens.some((i) => i.rotulo === "Outros")
}

/** Mantém os `max` maiores e soma o resto (inclusive um "Outros" já existente) em "Outros". */
export function limitarItens<T extends { rotulo: string; valor: number }>(
  itens: T[],
  max: number
): { rotulo: string; valor: number }[] {
  const nomeados = itens.filter((i) => i.rotulo !== "Outros")
  const outros = itens.find((i) => i.rotulo === "Outros")?.valor ?? 0
  if (nomeados.length <= max && !outros) return itens
  const resto = nomeados.slice(max).reduce((s, i) => s + i.valor, 0) + outros
  const topo = nomeados.slice(0, max)
  return resto > 0 ? [...topo, { rotulo: "Outros", valor: resto }] : topo
}
