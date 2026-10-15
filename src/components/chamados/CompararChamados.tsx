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
import { entryContainer } from "@/components/app/motion/variants"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Sheet } from "@/core"
import type { VisaoTipoProps } from "@/panels/tipos"
import { GraficoCartao } from "./cartoes"
import { BarrasComparar } from "./graficos"
import { ListaLeituras } from "./ListaLeituras"
import { ModalKpi } from "./ModalKpi"
import {
  AvisoFiltroSemColuna,
  ChipsFiltrosChamados,
  useFiltrosChamados,
} from "./filtros"
import { LegendaSimbolos, MarcaCorrigido } from "./selos"
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

const TOM = {
  bom: "text-[#00694b]",
  ruim: "text-late",
  neutro: "text-muted-foreground",
} as const
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

function ValoresDoCartao({
  cartao,
  rotulos,
}: {
  cartao: Cartao
  rotulos: string[]
}) {
  const n = rotulos.length
  return (
    <ul className="flex flex-wrap items-end gap-x-6 gap-y-3">
      {cartao.valores.map((v, i) => {
        const ultimo = i === n - 1
        const marca = cartao.marcas[i]
        return (
          <li
            key={i}
            className={cn(
              "flex min-w-0 flex-col",
              ultimo && "order-first basis-full",
              marca && !ultimo && "max-w-60"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>{rotulos[i]}</span>
            </span>
            <span
              className={cn(
                "num flex items-center gap-1.5 font-display text-primary",
                ultimo
                  ? "text-6xl leading-none font-bold"
                  : "text-3xl leading-none font-semibold opacity-80"
              )}
            >
              <SetaVs
                sentido={cartao.setas[i]}
                rotuloAnterior={rotulos[i - 1] ?? ""}
              />
              <span>{formatarKpi(v, cartao.formato)}</span>
            </span>
            {cartao.notas[i] && (
              <span className="max-w-40 font-sans text-sm text-muted-foreground">
                {cartao.notas[i]}
              </span>
            )}
            {marca && (
              <MarcaCorrigido
                por={marca.por}
                original={formatarKpi(marca.original, cartao.formato)}
                className="mt-1.5"
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function CartaoComparacao({
  cartao,
  rotulos,
  onAbrir,
}: {
  cartao: Cartao
  rotulos: string[]
  onAbrir: () => void
}) {
  const d = descreverDelta(
    {
      delta: cartao.delta,
      formato: cartao.formato,
      melhorQuando: cartao.melhorQuando,
    },
    ""
  )
  return (
    <article
      aria-label={cartao.rotulo}
      className="relative flex min-w-0 flex-col gap-4 rounded-lg bg-card p-6 shadow-(--shadow-card) transition-shadow has-[button:hover]:shadow-(--shadow-card-hover)"
    >
      <button
        type="button"
        data-kpi-cartao={cartao.id}
        aria-label={`Ver gráfico de ${cartao.rotulo}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none"
        onClick={onAbrir}
      />
      <h3 className="flex items-start gap-2 font-sans text-xl leading-tight font-medium text-muted-foreground">
        <span>{cartao.rotulo}</span>
      </h3>
      <ValoresDoCartao cartao={cartao} rotulos={rotulos} />
      <p
        className={cn(
          "num mt-auto border-t pt-3 text-xl font-medium",
          d ? TOM[d.tom] : "text-muted-foreground"
        )}
      >
        <span className="mr-2 text-sm font-normal text-muted-foreground">
          Δ
        </span>
        {d ? (
          <>
            {d.texto.replace(/ vs\s*/, " ").trim()}
            {d.rotuloTom && (
              <span className="ml-2 text-base font-normal">
                {d.sentido === "alta" ? "↑" : "↓"} {d.rotuloTom}
              </span>
            )}
          </>
        ) : (
          "—"
        )}
      </p>
    </article>
  )
}

/** Linha da tabela de leitura por tecnologia assistiva (cartões são a versão visual). */
function LinhaDoCartao({
  cartao,
  rotulos,
}: {
  cartao: Cartao
  rotulos: string[]
}) {
  const d = descreverDelta(
    {
      delta: cartao.delta,
      formato: cartao.formato,
      melhorQuando: cartao.melhorQuando,
    },
    ""
  )
  return (
    <tr className="border-b bg-card">
      <th scope="row" className="px-3 py-3 font-medium">
        {cartao.rotulo}
      </th>
      {cartao.valores.map((v, i) => {
        const marca = cartao.marcas[i]
        return (
          <td
            key={i}
            className="num px-3 py-3 text-right font-display font-semibold whitespace-nowrap text-primary"
          >
            <div className="flex items-center justify-end gap-1.5">
              <SetaVs
                sentido={cartao.setas[i]}
                rotuloAnterior={rotulos[i - 1] ?? ""}
              />
              <span>{formatarKpi(v, cartao.formato)}</span>
            </div>
            {cartao.notas[i] && (
              <span className="block font-sans text-sm font-normal whitespace-normal text-muted-foreground">
                {cartao.notas[i]}
              </span>
            )}
            {marca && (
              <span className="block font-sans text-sm font-normal whitespace-normal text-muted-foreground">
                corrigido pela posição de {marca.por.join(" e ")} · era{" "}
                {formatarKpi(marca.original, cartao.formato)}
              </span>
            )}
          </td>
        )
      })}
      <td
        className={cn(
          "num px-3 py-3 text-right font-medium whitespace-nowrap",
          d ? TOM[d.tom] : "text-muted-foreground"
        )}
      >
        {d ? (
          <>
            {d.texto.replace(/ vs\s*/, " ").trim()}
            {d.rotuloTom && (
              <span className="ml-2 text-base font-normal">
                {d.sentido === "alta" ? "↑" : "↓"} {d.rotuloTom}
              </span>
            )}
          </>
        ) : (
          "—"
        )}
      </td>
    </tr>
  )
}

const GRADE_CARTOES =
  "grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[2200px]:grid-cols-4 min-[3000px]:grid-cols-6"

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
  const selecao = validas.length >= minimo ? validas : padrao
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

  // colunas em ordem cronológica, independente da ordem dos seletores
  const ordenadas = useMemo(
    () => ordenarOpcoes(selecao.map((c) => opcoes.find((o) => o.chave === c)!)),
    [selecao, opcoes]
  )
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
      ""
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
            cada valor compara com a coluna anterior.
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

        {cartoesSit.length > 0 && (
          <section aria-label="Situações lado a lado" className="min-w-0">
            <div className={GRADE_CARTOES}>
              {cartoesSit.map((c) => (
                <CartaoComparacao
                  key={c.id}
                  cartao={c}
                  rotulos={rotulos}
                  onAbrir={abrir(c.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section aria-label="Indicadores lado a lado" className="min-w-0">
          <div className={GRADE_CARTOES}>
            {cartoesKpi.map((k) => (
              <CartaoComparacao
                key={k.id}
                cartao={k}
                rotulos={rotulos}
                onAbrir={abrir(k.id)}
              />
            ))}
          </div>
          <div className="sr-only">
            <table className="w-full text-left text-xl">
              <caption className="sr-only">
                Indicadores e situações de {rotulos.join(", ")}
              </caption>
              <thead>
                <tr className="border-b-2 border-primary/30 text-primary">
                  <th scope="col" className="px-3 py-3 font-display">
                    Indicador
                  </th>
                  {ordenadas.map((o, i) => (
                    <th
                      key={o.chave}
                      scope="col"
                      className="px-3 py-3 text-right font-display"
                    >
                      <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                        <span>{rotulos[i]}</span>
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3 text-right font-display">
                    Δ
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...cartoesKpi, ...cartoesSit].map((k) => (
                  <LinhaDoCartao key={k.id} cartao={k} rotulos={rotulos} />
                ))}
              </tbody>
            </table>
          </div>
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
                subtitulo={nomes.join(" · ")}
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
