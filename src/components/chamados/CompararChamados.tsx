import { useEntrada } from "@/components/app/motion/useEntrada"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, EqualIcon, PlusIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import {
  calcularMetricas,
  escolherAba,
  gerarLeituras,
  type EntradaCompetencia,
  avisoColunasSemFiltro,
} from "@/chamados"
import { DESTAQUES, GRUPOS_KPI } from "./kpis-grupos"
import { entryContainer } from "@/components/app/motion/variants"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Sheet } from "@/core"
import type { VisaoTipoProps } from "@/panels/tipos"
import { GraficoCartao } from "./cartoes"
import { SeloDelta } from "./selo-delta"
import { BarrasComparar } from "./graficos"
import { ListaLeituras } from "./ListaLeituras"
import { ModalKpi } from "./ModalKpi"
import {
  AvisoFiltroSemColuna,
  ChipsFiltrosChamados,
  useFiltrosChamados,
} from "./filtros"
import { LegendaSimbolos, SELOS } from "./selos"
import { Carregando } from "./Carregando"
import { useVersoesDoTipo } from "./hooks"
import {
  agruparSeries,
  compararN,
  type Sentido,
  temOutros,
  type SeloTipo,
  descreverDelta,
  formatarKpi,
} from "./logica"
import {
  cartoesDeKpis,
  cartoesDeSituacoes,
  calcularColuna,
  chaveFoto,
  opcoesDeColuna,
  ordenarOpcoes,
  proximaChave,
  selecaoDoPedido,
  selecaoPadrao,
  type Cartao,
  type ColunaOpcao,
} from "./comparar"
import { limparPedido, lerPedido, ouvirPedido } from "./pedidoComparar"

const MAX_ITENS = 8
const MIN_COMPETENCIAS = 2
const MAX_COMPETENCIAS = 6

export function CompararChamados({
  carga,
  historico,
  obterCarga,
  entrada,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const entradaFixa = useEntrada(entrada)
  // Todas as versões ativas (D66): o seletor desdobra as versões de cada mês.
  const cargas = useVersoesDoTipo(historico, obterCarga)
  const sheetAtual = useMemo(
    () => escolherAba(carga.workbook),
    [carga.workbook]
  )
  const chaveAberta = chaveFoto(carga.competencia, carga.versao)

  const sheets = useMemo(() => {
    const m = new Map(
      cargas?.map((c) => [
        chaveFoto(c.meta.competencia, c.meta.versao),
        c.sheet,
      ])
    )
    if (sheetAtual) m.set(chaveAberta, sheetAtual)
    return m
  }, [cargas, sheetAtual, chaveAberta])

  const opcoes = useMemo(() => {
    if (!cargas || !sheetAtual) return []
    const metas = [...historico, carga].filter(
      (m, i, todas) =>
        !m.arquivadaEm &&
        todas.findIndex((x) => x.id === m.id) === i &&
        sheets.has(chaveFoto(m.competencia, m.versao))
    )
    const recente = metas.reduce<(typeof metas)[number] | null>(
      (a, m) =>
        !a ||
        m.competencia > a.competencia ||
        (m.competencia === a.competencia && m.versao > a.versao)
          ? m
          : a,
      null
    )
    const maisAtual: EntradaCompetencia | undefined = recente
      ? {
          sheet: sheets.get(chaveFoto(recente.competencia, recente.versao))!,
          competencia: recente.competencia,
        }
      : undefined
    return opcoesDeColuna(metas, maisAtual)
  }, [cargas, historico, carga, sheetAtual, sheets])

  const cabecalho = (
    <h1 className="text-6xl leading-none text-primary">
      Comparar competências
    </h1>
  )
  if (!sheetAtual)
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <p role="alert" className="text-xl text-destructive">
          Não encontrei uma aba de chamados nesta planilha.
        </p>
      </div>
    )
  if (!cargas)
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <Carregando forma="comparar" />
      </div>
    )
  if (opcoes.length === 0)
    return <div className="flex flex-col gap-4">{cabecalho}</div>

  return (
    <ComparacaoVisao
      key={chaveAberta}
      cabecalho={cabecalho}
      opcoes={opcoes}
      sheets={sheets}
      chaveAberta={chaveAberta}
      play={entradaFixa && !reduce}
    />
  )
}

const ICONE_SENTIDO = {
  alta: ArrowUpIcon,
  queda: ArrowDownIcon,
  igual: EqualIcon,
} as const
const VERBO_SENTIDO = { alta: "subiu", queda: "caiu", igual: "igual" } as const

/** Setinha discreta contra a coluna anterior; o espaço fica reservado para os números alinharem. */
function SetaVs({
  sentido,
  rotuloAnterior,
}: {
  sentido: Sentido | null
  rotuloAnterior: string
}) {
  const Icone = sentido ? ICONE_SENTIDO[sentido] : null
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
      {Icone && sentido && (
        <span
          role="img"
          aria-label={`${VERBO_SENTIDO[sentido]} em relação a ${rotuloAnterior}`}
          className="flex"
        >
          <Icone className="size-4" aria-hidden />
        </span>
      )}
    </span>
  )
}

const idSerie = (o: ColunaOpcao) => o.chave.replace("@", "-v")

/** Mesmos grupos do Painel; o que não estiver aqui cai em "Outros indicadores". */
const GRUPOS_COMPARAR = [
  { titulo: "Como estamos", ids: DESTAQUES },
  ...GRUPOS_KPI,
]

const textoCorrigido = (m: NonNullable<Cartao["marcas"][number]>, c: Cartao) =>
  `corrigido pela posição de ${m.por.join(" e ")}, era ${formatarKpi(m.original, c.formato)}`

/** Ícone pequeno ao lado do número; o texto completo está no tooltip e no aria-label. */
function IconeCorrigido({ texto }: { texto: string }) {
  const { Icon } = SELOS.corrigido
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-selo="corrigido"
          aria-label={texto}
          onClick={(e) => e.stopPropagation()}
          className="size-5 rounded-full border border-dashed border-atencao/60 bg-brand-soft text-atencao-ink hover:bg-brand-soft hover:text-atencao-ink"
        >
          <Icon className="size-3.5" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-md text-base">{texto}</TooltipContent>
    </Tooltip>
  )
}

function CelulaValor({
  cartao,
  i,
  rotulos,
  referencia,
}: {
  cartao: Cartao
  i: number
  rotulos: string[]
  referencia: boolean
}) {
  const v = cartao.valores[i]
  const marca = cartao.marcas[i]
  return (
    <TableCell
      className={cn(
        "px-4 py-3 text-right align-middle whitespace-nowrap",
        referencia && "bg-primary/5"
      )}
    >
      <span className="num inline-flex items-center justify-end gap-1.5 font-display text-3xl leading-none font-semibold text-primary">
        <SetaVs
          sentido={cartao.setas[i]}
          rotuloAnterior={rotulos[i - 1] ?? ""}
        />
        {v === null ? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">{cartao.notas[i] ?? "sem dado"}</span>
          </>
        ) : (
          <span>{formatarKpi(v, cartao.formato)}</span>
        )}
        {marca && <IconeCorrigido texto={textoCorrigido(marca, cartao)} />}
      </span>
    </TableCell>
  )
}

function LinhaComparacao({
  cartao,
  rotulos,
  referencias,
  onAbrir,
}: {
  cartao: Cartao
  rotulos: string[]
  referencias: boolean[]
  onAbrir: () => void
}) {
  const d = descreverDelta(
    {
      delta: cartao.delta,
      formato: cartao.formato,
      melhorQuando: cartao.melhorQuando,
    },
    rotulos[0]
  )
  return (
    <TableRow className="cursor-pointer" onClick={onAbrir}>
      <TableHead
        scope="row"
        className="h-auto px-4 py-3 text-xl font-medium whitespace-normal text-foreground"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-kpi-cartao={cartao.id}
          className="h-auto justify-start px-0 py-0 text-left text-xl font-medium whitespace-normal text-foreground hover:bg-transparent hover:text-foreground"
        >
          {cartao.rotulo}
          <span className="sr-only">, ver gráfico</span>
        </Button>
      </TableHead>
      {cartao.valores.map((_, i) => (
        <CelulaValor
          key={i}
          cartao={cartao}
          i={i}
          rotulos={rotulos}
          referencia={referencias[i]}
        />
      ))}
      <TableCell className="px-4 py-3 text-right align-middle">
        {d ? (
          <SeloDelta
            delta={{ ...d, periodo: "" }}
            className="justify-end gap-x-0"
          />
        ) : (
          <span className="text-muted-foreground/70">
            <span aria-hidden>—</span>
            <span className="sr-only">sem comparação</span>
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}

function TabelaComparacao({
  grupos,
  ordenadas,
  rotulos,
  chaveAberta,
  onAbrir,
}: {
  grupos: { titulo: string; cartoes: Cartao[] }[]
  ordenadas: ColunaOpcao[]
  rotulos: string[]
  chaveAberta: string
  onAbrir: (id: string) => () => void
}) {
  const referencias = ordenadas.map((o) => o.chave === chaveAberta)
  const colunas = ordenadas.length + 2
  return (
    <Table className="text-xl">
      <caption className="sr-only">
        Indicadores e situações de {rotulos.join(", ")}
      </caption>
      <TableHeader>
        <TableRow className="border-b-2 border-primary/30 hover:bg-transparent">
          <TableHead
            scope="col"
            className="h-auto px-4 py-3 font-display text-xl text-primary"
          >
            Indicador
          </TableHead>
          {ordenadas.map((o, i) => (
            <TableHead
              key={o.chave}
              scope="col"
              aria-current={referencias[i] ? "true" : undefined}
              className={cn(
                "h-auto px-4 py-3 text-right align-bottom font-display text-xl text-primary",
                referencias[i] && "bg-primary/5"
              )}
            >
              <span className="whitespace-nowrap">{rotulos[i]}</span>{" "}
              {referencias[i] && (
                <span className="block font-sans text-base font-normal whitespace-normal text-muted-foreground">
                  aberta
                </span>
              )}
              {!o.temFoto && (
                <span className="block font-sans text-base font-normal whitespace-normal text-muted-foreground">
                  sem posição
                </span>
              )}
            </TableHead>
          ))}
          <TableHead
            scope="col"
            className="h-auto px-4 py-3 text-right align-bottom font-display text-xl text-primary"
          >
            Δ
          </TableHead>
        </TableRow>
      </TableHeader>
      {grupos.map((g) => (
        <TableBody key={g.titulo}>
          <TableRow className="border-b-0 bg-muted/40 hover:bg-muted/40">
            <TableHead
              scope="rowgroup"
              colSpan={colunas}
              className="h-auto px-4 py-2 text-lg font-medium text-muted-foreground"
            >
              {g.titulo}
            </TableHead>
          </TableRow>
          {g.cartoes.map((c) => (
            <LinhaComparacao
              key={c.id}
              cartao={c}
              rotulos={rotulos}
              referencias={referencias}
              onAbrir={onAbrir(c.id)}
            />
          ))}
        </TableBody>
      ))}
    </Table>
  )
}

function ComparacaoVisao({
  cabecalho,
  opcoes,
  sheets,
  chaveAberta,
  play,
}: {
  cabecalho: React.ReactNode
  opcoes: ColunaOpcao[]
  sheets: Map<string, Sheet>
  chaveAberta: string
  play: boolean
}) {
  const { filtros } = useFiltrosChamados()
  // O atalho "Comparar versões" do Histórico pede as versões de um mês (pedidoComparar).
  const [escolha, setEscolha] = useState<string[] | null>(() =>
    selecaoDoPedido(opcoes, lerPedido())
  )
  useEffect(
    () =>
      ouvirPedido(() => {
        const pedida = selecaoDoPedido(opcoes, lerPedido())
        if (pedida) setEscolha(pedida)
      }),
    [opcoes]
  )
  const minimo = Math.min(MIN_COMPETENCIAS, opcoes.length)
  const padrao = useMemo(
    () => selecaoPadrao(opcoes, chaveAberta),
    [opcoes, chaveAberta]
  )
  const validas = (escolha ?? padrao).filter((c) =>
    opcoes.some((o) => o.chave === c)
  )
  const escolhidas = validas.length >= minimo ? validas : padrao
  // seletores e colunas em ordem cronológica, qualquer que seja a ordem da escolha
  const ordenadas = useMemo(
    () =>
      ordenarOpcoes(escolhidas.map((c) => opcoes.find((o) => o.chave === c)!)),
    [escolhidas, opcoes]
  )
  const selecao = ordenadas.map((o) => o.chave)
  const alterar = (nova: string[]) => {
    limparPedido()
    setEscolha(nova)
  }
  const onTrocar = (indice: number, v: string) =>
    alterar(selecao.map((c, i) => (i === indice ? v : c)))
  const onAdicionar = () => {
    const proxima = proximaChave(opcoes, selecao)
    if (proxima) alterar([...selecao, proxima])
  }
  const onRemover = (indice: number) =>
    alterar(selecao.filter((_, i) => i !== indice))
  const podeAdicionar =
    selecao.length < MAX_COMPETENCIAS && proximaChave(opcoes, selecao) !== null

  const colunas = useMemo(
    () => ordenadas.map((o) => calcularColuna(o, opcoes, sheets, filtros)),
    [ordenadas, opcoes, sheets, filtros]
  )
  const avisosFiltro = useMemo(() => {
    const rotulos = [
      ...new Set(colunas.flatMap((c) => c.metricas.colunasSemFiltro ?? [])),
    ]
    return rotulos.length ? [avisoColunasSemFiltro(rotulos)] : []
  }, [colunas])
  const metricas = useMemo(() => colunas.map((c) => c.metricas), [colunas])
  const cmp = useMemo(() => compararN(metricas), [metricas])
  const n = ordenadas.length
  const rotulos = ordenadas.map((o) => o.curto)
  const nomes = rotulos

  const cartoesKpi = useMemo(() => cartoesDeKpis(cmp, colunas), [cmp, colunas])
  const cartoesSit = useMemo(() => cartoesDeSituacoes(colunas), [colunas])

  // Leituras: as duas últimas colunas com foto de meses diferentes (versões do mesmo mês não geram leitura)
  const recente = colunas[n - 1]?.entrada ?? null
  const anterior = colunas[n - 2]?.entrada ?? null
  const comLeitura =
    recente !== null &&
    anterior !== null &&
    recente.competencia !== anterior.competencia
  const leituras = useMemo(
    () => (comLeitura ? gerarLeituras(recente, anterior) : []),
    [comLeitura, recente, anterior]
  )
  const metricasLeitura = useMemo(
    () => (comLeitura ? calcularMetricas(recente, anterior) : null),
    [comLeitura, recente, anterior]
  )

  const grupos = useMemo(() => {
    const usados = new Set<string>(GRUPOS_COMPARAR.flatMap((g) => g.ids))
    const doKpi = (ids: readonly string[]) =>
      ids
        .map((id) => cartoesKpi.find((c) => c.id === id))
        .filter((c): c is Cartao => !!c)
    const resto = cartoesKpi.filter((c) => !usados.has(c.id))
    return [
      { titulo: "Situações", cartoes: cartoesSit },
      ...GRUPOS_COMPARAR.map((g) => ({ titulo: g.titulo, cartoes: doKpi(g.ids) })),
      { titulo: "Outros indicadores", cartoes: resto },
    ].filter((g) => g.cartoes.length > 0)
  }, [cartoesKpi, cartoesSit])

  const selosCmp = (itens: { rotulo: string }[]): SeloTipo[] =>
    temOutros(itens) ? ["outros"] : []
  const [cartaoAberto, setCartaoAberto] = useState<string | null>(null)
  const ultimoKpi = useRef<string | null>(null)
  const cartaoModal = [...cartoesKpi, ...cartoesSit].find(
    (x) => x.id === cartaoAberto
  )
  const deltaDe = (k: Cartao) =>
    descreverDelta(
      { delta: k.delta, formato: k.formato, melhorQuando: k.melhorQuando },
      rotulos[0]
    )
  const maxItens = n > 3 ? 6 : MAX_ITENS
  const dists = cmp.distribuicoes.filter((d) => d.id !== "operador")
  const series = ordenadas.map((o, i) => ({
    id: idSerie(o),
    rotulo: nomes[i],
  }))
  const temCorrigido = [...cartoesKpi, ...cartoesSit].some((c) =>
    c.marcas.some((m) => m !== null)
  )
  // símbolos que aparecem nesta tela, para a legenda
  const tiposNaTela: SeloTipo[] = [
    ...(dists.some((d) => temOutros(agruparSeries(d.itens, maxItens)))
      ? (["outros"] as const)
      : []),
    ...(temCorrigido ? (["corrigido"] as const) : []),
  ]
  const tabelaSeries = (
    itens: { rotulo: string; valores: (number | null)[] }[]
  ) => ({
    colunas: ["Categoria", ...nomes],
    linhas: itens.map((i) => [i.rotulo, ...i.valores.map((v) => v ?? "—")]),
  })
  // gráficos: faixas de atraso + uma barra por dimensão (em "Outros" além do limite)
  const graficos = [
    {
      id: "cmp-atrasoFaixas",
      titulo: "Em atraso por meses desde a abertura",
      dados: cmp.atrasoFaixas,
      itens: cmp.atrasoFaixas,
    },
    ...dists.map((d) => ({
      id: `cmp-${d.id}`,
      titulo: `Não finalizados ${d.titulo.toLowerCase()}`,
      dados: d.itens,
      itens: agruparSeries(d.itens, maxItens),
    })),
  ]
  const abrir = (id: string) => () => {
    ultimoKpi.current = id
    setCartaoAberto(id)
  }
  const semFotoNaTela = ordenadas.some((o) => !o.temFoto)

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-8"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        <header className="flex flex-col gap-4">
          {cabecalho}
          <ChipsFiltrosChamados />
          <AvisoFiltroSemColuna avisos={avisosFiltro} />
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            {selecao.map((valor, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`comp-${i + 1}`}
                  className="text-base font-medium"
                >
                  Competência {i + 1}
                </label>
                <div className="flex items-center gap-2">
                  <Select value={valor} onValueChange={(v) => onTrocar(i, v)}>
                    <SelectTrigger id={`comp-${i + 1}`} className="min-w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoes.map((o) => (
                        <SelectItem
                          key={o.chave}
                          value={o.chave}
                          disabled={
                            o.chave !== valor && selecao.includes(o.chave)
                          }
                        >
                          {o.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Remover competência ${i + 1}`}
                    disabled={selecao.length <= MIN_COMPETENCIAS}
                    onClick={() => onRemover(i)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={!podeAdicionar}
              onClick={onAdicionar}
            >
              <PlusIcon aria-hidden /> Adicionar competência
            </Button>
          </div>
          <p className="text-base text-muted-foreground">
            De {MIN_COMPETENCIAS} a {MAX_COMPETENCIAS} colunas, em ordem
            cronológica. Δ = {rotulos[n - 1]} menos {rotulos[0]}; a setinha de
            cada valor compara com a coluna anterior; a coluna marcada
            “aberta” é a competência aberta.
            {semFotoNaTela &&
              " Mês sem posição mostra só entradas e finalizados, pelas datas da posição mais atual; o resto fica “—”."}
          </p>
          <LegendaSimbolos tipos={tiposNaTela} />
        </header>

        <ModalKpi
          aberto={!!cartaoModal}
          titulo={cartaoModal?.rotulo ?? ""}
          formato={cartaoModal?.formato ?? "inteiro"}
          pontos={(cartaoModal?.valores ?? []).map((v, i) => ({
            competencia: ordenadas[i].chave,
            rotulo: rotulos[i],
            valor: v,
            nota: cartaoModal?.notas[i] ?? null,
            marca: cartaoModal?.marcas[i]
              ? {
                  por: cartaoModal.marcas[i]!.por,
                  original: formatarKpi(
                    cartaoModal.marcas[i]!.original,
                    cartaoModal.formato
                  ),
                }
              : null,
          }))}
          delta={cartaoModal ? deltaDe(cartaoModal) : null}
          animar={play}
          onFechar={() => setCartaoAberto(null)}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            document
              .querySelector<HTMLElement>(
                `[data-kpi-cartao="${CSS.escape(ultimoKpi.current ?? "")}"]`
              )
              ?.focus()
          }}
        />

        <section
          aria-label="Indicadores lado a lado"
          className="min-w-0 rounded-lg bg-card p-2 shadow-(--shadow-card)"
        >
          <TabelaComparacao
            grupos={grupos}
            ordenadas={ordenadas}
            rotulos={rotulos}
            chaveAberta={chaveAberta}
            onAbrir={abrir}
          />
        </section>

        {comLeitura && metricasLeitura && (
          <section aria-labelledby="leituras-b" className="flex flex-col gap-3">
            <h2 id="leituras-b" className="text-3xl text-primary">
              Leituras de {rotulos[n - 1]} contra {rotulos[n - 2]}
            </h2>
            {leituras.length > 0 ? (
              <ListaLeituras leituras={leituras} metricas={metricasLeitura} />
            ) : (
              <p className="text-lg text-muted-foreground">
                Nenhuma leitura automática para {rotulos[n - 1]}.
              </p>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:[&>:last-child:nth-child(odd)]:col-span-2">
          {graficos.map((g, i) => {
            // cartões da mesma linha (2 por linha) ficam com a mesma altura
            const linha = graficos.slice(i - (i % 2), i - (i % 2) + 2)
            const itensParaAltura = Math.max(
              ...linha.map((x) => x.itens.length)
            )
            return (
              <GraficoCartao
                key={g.id}
                id={g.id}
                titulo={g.titulo}
                subtitulo={nomes.join(", ")}
                tabela={tabelaSeries(g.dados)}
                selos={selosCmp(g.itens)}
              >
                <BarrasComparar
                  itens={g.itens}
                  series={series}
                  animar={play}
                  tv
                  itensParaAltura={itensParaAltura}
                />
              </GraficoCartao>
            )
          })}
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
