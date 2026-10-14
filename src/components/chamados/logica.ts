/** Lógica pura da UI de Chamados: formatação, deltas, pareamento de cargas e séries. */
import {
  competenciaAnterior,
  formatarCompetencia,
  type CargaMeta,
  type Competencia,
} from "@/cargas"
import {
  calcularMetricas,
  classificarLinha,
  evolucao,
  mapearColunas,
  ROTULO_SITUACAO_COMPETENCIA,
  type CampoChamado,
  type EntradaCompetencia,
  type FormatoKpi,
  type KpiChamados,
  type Leitura,
  type MetricasChamados,
  type ItemDistribuicao,
  type SituacaoNaCompetencia,
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
  rotuloAnterior: string,
  reconstruido = false
): DeltaUI | null {
  const { delta, formato, melhorQuando } = kpi
  if (delta === null || !Number.isFinite(delta)) return null
  const arred = formato === "inteiro" ? Math.round(delta) : Math.round(delta * 10) / 10
  const sentido = arred > 0 ? "alta" : arred < 0 ? "queda" : "igual"
  const fmt = formato === "inteiro" ? inteiro : decimal
  const sinal = arred > 0 ? "+" : arred < 0 ? "-" : ""
  const unidade = formato === "percentual" ? " p.p." : formato === "dias" ? " dias" : ""
  const texto = `${sinal}${fmt.format(Math.abs(arred))}${unidade} vs ${rotuloAnterior}${reconstruido ? " (reconstruído)" : ""}`
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

/** Mês (AAAA-MM) da menor Data de Abertura da aba; null se não houver. */
export function primeiraCompetencia(sheet: Sheet): Competencia | null {
  const { mapa } = mapearColunas(sheet)
  if (!mapa.abertura) return null
  let min: number | null = null
  for (const row of sheet.rows) {
    const v = row[mapa.abertura]
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      const t = v.getTime()
      if (min === null || t < min) min = t
    }
  }
  if (min === null) return null
  const d = new Date(min)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const maiorQue = (a: Competencia, b: Competencia) => a.localeCompare(b) > 0

/** Competências anteriores à dada, da mais recente à mais antiga, até `max` e sem passar de `primeira`. */
function anterioresComDados(
  de: Competencia,
  primeira: Competencia | null,
  max: number
): Competencia[] {
  const out: Competencia[] = []
  let c = de
  for (let i = 0; i < max; i++) {
    c = competenciaAnterior(c)
    if (primeira && maiorQue(primeira, c)) break
    out.push(c)
  }
  return out
}

export type OpcaoCompetencia = {
  competencia: Competencia
  rotulo: string
  propria: boolean
  meta?: CargaMeta
  /** Reconstruído no meio do histórico: competência da carga seguinte cuja planilha o monta. */
  deCarga?: Competencia
}

/** As `n` competências de calendário terminando em `fim` (da mais recente à mais antiga). */
function janelaDe(fim: Competencia, n: number): Competencia[] {
  const out: Competencia[] = []
  let c = fim
  for (let i = 0; i < n; i++) {
    out.push(c)
    c = competenciaAnterior(c)
  }
  return out
}

/** Menor competência própria estritamente posterior a `c` (a "carga seguinte"). */
function proximaPropria(c: Competencia, proprias: Competencia[]) {
  return proprias
    .filter((p) => maiorQue(p, c))
    .sort((x, y) => x.localeCompare(y))[0]
}

/** Competências escolhíveis em Comparar: as cargas; com só uma carga, também meses reconstruídos. */
export function opcoesDeCompetencia(
  historico: CargaMeta[],
  primeira: Competencia | null,
  maxReconstruidas = 6
): OpcaoCompetencia[] {
  const proprias = ultimasVersoes(historico).reverse()
  const comps = proprias.map((m) => m.competencia)
  const porComp = new Map(proprias.map((m) => [m.competencia, m]))
  const opcoes: OpcaoCompetencia[] = []
  if (proprias.length > 0) {
    const janela = new Set(janelaDe(comps[0], 6))
    const todas = new Set([...comps, ...janela])
    const menorPropria = comps[comps.length - 1]
    for (const c of [...todas].sort((x, y) => y.localeCompare(x))) {
      const meta = porComp.get(c)
      if (meta) {
        opcoes.push({
          competencia: c,
          rotulo: cap(formatarCompetencia(c, "longo")),
          propria: true,
          meta,
        })
      } else if (maiorQue(c, menorPropria)) {
        opcoes.push({
          competencia: c,
          rotulo: `${cap(formatarCompetencia(c, "longo"))} (reconstruído)`,
          propria: false,
          deCarga: proximaPropria(c, comps),
        })
      }
    }
  }
  if (proprias.length === 1) {
    const maisAntiga = proprias[proprias.length - 1].competencia
    for (const c of anterioresComDados(maisAntiga, primeira, maxReconstruidas))
      opcoes.push({
        competencia: c,
        rotulo: `${cap(formatarCompetencia(c, "longo"))} (reconstruído)`,
        propria: false,
      })
  }
  return opcoes
}

export type PontoEvolucao = {
  competencia: Competencia
  rotulo: string
  propria: boolean
  valores: Record<string, number | null>
}

export function pontosDaEvolucao(
  proprias: { meta: CargaMeta; sheet: Sheet }[],
  maxPontos = 6,
  filtros: FiltrosChamados = {}
): {
  pontos: PontoEvolucao[]
  kpis: {
    id: string
    rotulo: string
    formato: FormatoKpi
    /** false: depende da carga do mês (colunas da data da exportação). */
    reconstruivel: boolean
  }[]
} {
  const maisRecentes = new Map<Competencia, { meta: CargaMeta; sheet: Sheet }>()
  for (const p of proprias) {
    const a = maisRecentes.get(p.meta.competencia)
    if (!a || p.meta.versao > a.meta.versao)
      maisRecentes.set(p.meta.competencia, p)
  }
  const n = Math.max(maxPontos, 0)
  const comps = [...maisRecentes.keys()].sort((a, b) => a.localeCompare(b))
  if (comps.length === 0 || n === 0) return { pontos: [], kpis: [] }
  // As `n` competências de calendário terminando na carga própria mais recente, sem buracos.
  const janela = janelaDe(comps[comps.length - 1], n).reverse()
  const primeira = primeiraCompetencia(maisRecentes.get(comps[0])!.sheet)
  const reconstruidas: EntradaCompetencia[] = []
  const entradas: EntradaCompetencia[] = []
  for (const c of janela) {
    const propria = maisRecentes.get(c)
    if (propria) {
      entradas.push({ sheet: propria.sheet, competencia: c, cargaPropria: true })
      continue
    }
    // Pela planilha da carga própria seguinte (a mais próxima); antes da primeira
    // carga, é a mais antiga e não passa do primeiro chamado.
    const seguinte = proximaPropria(c, comps)
    if (!seguinte) continue
    if (maiorQue(comps[0], c) && primeira && maiorQue(primeira, c)) continue
    reconstruidas.push({
      sheet: maisRecentes.get(seguinte)!.sheet,
      competencia: c,
      cargaPropria: false,
    })
  }
  const todas = [...reconstruidas, ...entradas]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .map((e) => ({
    ...e,
    sheet: filtrarSheet(e.sheet, filtros, e.competencia),
  }))
  const ev = evolucao(todas)
  const propria = new Map(todas.map((e) => [e.competencia, e.cargaPropria !== false]))
  const pontos = ev.competencias.map((competencia, i) => ({
    competencia,
    rotulo: formatarCompetencia(competencia),
    propria: propria.get(competencia) ?? false,
    valores: Object.fromEntries(ev.series.map((s) => [s.id, s.valores[i]])),
  }))
  return {
    pontos,
    kpis: ev.series.map(({ id, rotulo, formato }) => ({
      id,
      rotulo,
      formato,
      reconstruivel:
        calcularMetricas(todas[0]).kpis.find((k) => k.id === id)
          ?.reconstruivel ?? true,
    })),
  }
}

export type LinhaSerie = {
  competencia: Competencia
  rotulo: string
  propria: boolean
} & Record<string, number | null | string | boolean>

/**
 * Prepara os dados para linhas com trecho sólido (cargas próprias, `<id>_p`) e
 * tracejado (reconstruído, `<id>_r`). O primeiro ponto próprio entra nos dois para ligá-los.
 */
export function linhasDeSerie(
  pontos: PontoEvolucao[],
  ids: string[]
): LinhaSerie[] {
  const primeiraPropria = pontos.findIndex((p) => p.propria)
  return pontos.map((p, i) => {
    const linha: LinhaSerie = {
      competencia: p.competencia,
      rotulo: p.rotulo,
      propria: p.propria,
    }
    for (const id of ids) {
      const v = p.valores[id] ?? null
      linha[`${id}_p`] = p.propria ? v : null
      linha[`${id}_r`] = !p.propria || i === primeiraPropria ? v : null
    }
    return linha
  })
}

/** Um item (categoria) com um valor por competência, na ordem cronológica das colunas. */
export type ItemSerie = { rotulo: string; valores: number[] }

export function agruparSeries(itens: ItemSerie[], max: number): ItemSerie[] {
  if (itens.length <= max) return itens
  const resto = itens.slice(max)
  const colunas = itens[0].valores.length
  return [
    ...itens.slice(0, max),
    {
      rotulo: "Outros",
      valores: Array.from({ length: colunas }, (_, c) =>
        resto.reduce((s, i) => s + i.valores[c], 0)
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
    return antes.reduce((x, y) => (x.competencia > y.competencia ? x : y)).competencia
  return livres.reduce((x, y) => (x.competencia > y.competencia ? x : y)).competencia
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
  distribuicoes: { id: string; titulo: string; itens: ItemSerie[] }[]
  envelhecimento: ItemSerie[]
}

const juntarItens = (listas: ItemDistribuicao[][], ordenar = true): ItemSerie[] => {
  const mapas = listas.map((l) => new Map(l.map((i) => [i.rotulo, i.valor])))
  const rotulos = [...new Set(listas.flatMap((l) => l.map((i) => i.rotulo)))]
  const itens = rotulos.map((rotulo) => ({
    rotulo,
    valores: mapas.map((m) => m.get(rotulo) ?? 0),
  }))
  const total = (i: ItemSerie) => i.valores.reduce((s, v) => s + v, 0)
  return ordenar ? itens.sort((x, y) => total(y) - total(x)) : itens
}

/** Compara N competências (já em ordem cronológica): valores por coluna, Δ = última − primeira e setas vs anterior. */
export function compararN(metricas: MetricasChamados[]): ComparacaoN {
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
  const ids = [...new Set(metricas.flatMap((m) => m.distribuicoes.map((d) => d.id)))]
  const distribuicoes = ids.map((id) => {
    const ds = metricas.map((m) => m.distribuicoes.find((d) => d.id === id))
    return {
      id,
      titulo: (ds[ds.length - 1] ?? ds.find(Boolean))!.titulo,
      itens: juntarItens(ds.map((d) => d?.itens ?? [])),
    }
  })
  return {
    competencias: metricas.map((m) => m.competencia),
    kpis,
    distribuicoes,
    // faixas de idade ficam na ordem do motor, não por total
    envelhecimento: juntarItens(metricas.map((m) => m.envelhecimento), false),
  }
}

/** Por que o delta é "—": o detalhe do motor, a exigência de carga própria ou falta de base. */
export function motivoSemDelta(
  kpi: Pick<KpiChamados, "detalhe" | "reconstruivel">,
  anteriorPropria: boolean
): string {
  if (kpi.detalhe) return kpi.detalhe
  if (!kpi.reconstruivel && !anteriorPropria) return "exige a carga daquele mês"
  return "sem base no mês anterior"
}

// ---------------------------------------------------------------- filtros

export type CampoFiltro =
  | "cliente"
  | "areaSuperior"
  | "area"
  | "atividade"
  | "severidade"
  | "operador"
  | "situacaoNaCompetencia"

export const CAMPOS_FILTRO: { campo: CampoFiltro; rotulo: string }[] = [
  { campo: "cliente", rotulo: "Cliente" },
  { campo: "areaSuperior", rotulo: "Área Superior" },
  { campo: "area", rotulo: "Área" },
  { campo: "atividade", rotulo: "Atividade" },
  { campo: "severidade", rotulo: "Severidade" },
  { campo: "operador", rotulo: "Operador" },
  { campo: "situacaoNaCompetencia", rotulo: "Situação na competência" },
]

/** Valores escolhidos por dimensão. Vale para o painel, a comparação e a evolução. */
export type FiltrosChamados = Partial<Record<CampoFiltro, string[]>>

const SEM_INFO = "(sem informação)"
const ordemSituacoes = Object.values(ROTULO_SITUACAO_COMPETENCIA)

function textoDe(v: CellValue | undefined): string {
  if (v === null || v === undefined) return SEM_INFO
  const t = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()
  return t === "" ? SEM_INFO : t
}

const ativos = (f: FiltrosChamados) =>
  CAMPOS_FILTRO.filter(({ campo }) => (f[campo]?.length ?? 0) > 0)

/** Mesma planilha, só com as linhas do recorte. Nenhuma coluna muda; sem filtro devolve a própria planilha. */
export function filtrarSheet(
  sheet: Sheet,
  filtros: FiltrosChamados,
  competencia: Competencia
): Sheet {
  const lista = ativos(filtros)
  if (lista.length === 0) return sheet
  const { mapa } = mapearColunas(sheet)
  const rows = sheet.rows.filter((row) =>
    lista.every(({ campo }) => {
      const valores = filtros[campo]!
      if (campo === "situacaoNaCompetencia")
        return valores.includes(
          ROTULO_SITUACAO_COMPETENCIA[classificarLinha(row, mapa, competencia)]
        )
      const chave = mapa[campo as CampoChamado]
      return chave ? valores.includes(textoDe(row[chave])) : false
    })
  )
  return { ...sheet, rows }
}

export function opcoesDoFiltro(
  sheet: Sheet,
  campo: CampoFiltro
): string[] {
  if (campo === "situacaoNaCompetencia") return ordemSituacoes
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
  if (f.campo === "situacaoNaCompetencia")
    return {
      campo: f.campo,
      valores: f.valores.map(
        (v) => ROTULO_SITUACAO_COMPETENCIA[v as SituacaoNaCompetencia] ?? v
      ),
    }
  if (CAMPOS_FILTRO.some((c) => c.campo === f.campo))
    return { campo: f.campo as CampoFiltro, valores: f.valores }
  return null
}

// ---------------------------------------------------------------- leituras e selos

/** Origem de um dado que não é original puro; o selo aparece igual em todas as visões. */
export type SeloTipo =
  | "reconstruido"
  | "calculado"
  | "exportacao"
  | "derivado"
  | "outros"

const REGRAS: Record<Leitura["id"], string> = {
  fluxo:
    "Saídas de pelo menos 1,5 vez as entradas e backlog menor que o do mês anterior.",
  concentracao: "Um único cliente com 40% ou mais do backlog (≥ 40%).",
  envelhecimento:
    "Mais de 25% do backlog com mais de 180 dias de abertura (acima de 40% vira crítico).",
  gargaloCliente:
    "30% ou mais do backlog aguardando aceite do cliente (≥ 30%). Usa a Situação da data da exportação.",
  semSla: "20% ou mais do backlog sem SLA previsto (≥ 20%).",
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
  const backlog = kpi("backlog")?.valor ?? 0
  const out: NumeroLeitura[] = []
  if (l.id === "concentracao") {
    const nome = l.filtro?.valores[0]
    const n = m.distribuicoes
      .find((d) => d.id === "cliente")
      ?.itens.find((i) => i.rotulo === nome)?.valor
    if (nome && n !== undefined) {
      out.push({ rotulo: `Chamados de ${nome} no backlog`, valor: inteiro.format(n) })
      out.push({ rotulo: "Participação no backlog", valor: pct(n, backlog) })
    }
  }
  if (l.id === "envelhecimento") {
    const n = m.envelhecimento.find((f) => f.rotulo === "> 180 dias")?.valor
    if (n !== undefined) {
      out.push({ rotulo: "Abertos há mais de 180 dias", valor: inteiro.format(n) })
      out.push({ rotulo: "Participação no backlog", valor: pct(n, backlog) })
    }
  }
  for (const id of l.evidencia) {
    const k = kpi(id)
    if (k) out.push({ rotulo: k.rotulo, valor: formatarKpi(k.valor, k.formato) })
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
  const dist = (id: string) => m.distribuicoes.find((d) => d.id === id)
  switch (l.id) {
    case "concentracao": {
      const d = dist("cliente")
      return d
        ? { titulo: d.titulo, itens: d.itens, destaque: l.filtro?.valores ?? [] }
        : null
    }
    case "envelhecimento":
      return {
        titulo: "Envelhecimento do backlog",
        itens: m.envelhecimento,
        destaque: ["> 180 dias"],
      }
    case "gargaloCliente": {
      const d = dist("situacao")
      return d
        ? {
            titulo: d.titulo,
            itens: d.itens,
            destaque: d.itens
              .filter((i) => normalizarTexto(i.rotulo).includes("aceite"))
              .map((i) => i.rotulo),
          }
        : null
    }
    case "semSla": {
      const backlog = kpi("backlog")
      const sem = kpi("semSla")
      if (backlog === null || sem === null) return null
      return {
        titulo: "Backlog com e sem SLA previsto",
        itens: [
          { rotulo: "Com SLA previsto", valor: backlog - sem },
          { rotulo: "Sem SLA", valor: sem },
        ],
        destaque: ["Sem SLA"],
      }
    }
    case "fluxo": {
      const e = kpi("entradas")
      const s = kpi("saidas")
      if (e === null || s === null) return null
      return {
        titulo: "Entradas e saídas do mês",
        itens: [
          { rotulo: "Entradas", valor: e },
          { rotulo: "Saídas", valor: s },
        ],
        destaque: ["Saídas"],
      }
    }
  }
}

const normalizarTexto = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Selos que a leitura precisa carregar por causa da origem dos dados que usa. */
export function selosDaLeitura(l: Leitura, anteriorPropria: boolean): SeloTipo[] {
  const out: SeloTipo[] = []
  if (l.id === "gargaloCliente") out.push("exportacao")
  if (l.id === "fluxo" && !anteriorPropria) out.push("reconstruido")
  return out
}

/** O gráfico tem itens somados em "Outros". */
export function temOutros<T extends { rotulo: string }>(itens: T[]) {
  return itens.some((i) => i.rotulo === "Outros")
}
