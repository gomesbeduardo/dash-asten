import { useEntrada } from "@/components/app/motion/useEntrada"
import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRightIcon } from "lucide-react"

import { formatarCompetencia, inferirCompetencia } from "@/cargas"
import { formatValue } from "@/components/app/motion/format"
import { avisoColunasSemFiltro, type Distribuicao } from "@/chamados"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { KpiCartao, TituloBloco } from "./cartoes"
import { AvisoFiltroSemColuna, ChipsFiltrosChamados } from "./filtros"
import { BlocoTempo } from "./BlocoTempo"
import { Carregando } from "./Carregando"
import { MontarDepois } from "@/components/app/motion/MontarDepois"
import { ANTERIOR, usePainelComparado } from "./comparar-com"
import { useCargasDoTipo, useMesDeChamados } from "./hooks"
import { COR_FIN, COR_NAO } from "./cores"
import { pontosDaEvolucao, temOutros, type SeloTipo } from "./logica"
import {
  AtrasoMes,
  coresDasSituacoes,
  FaixaSituacao,
  GraficoMes,
} from "./painel-foto"
import {
  AreaSla,
  ClienteSituacao,
  ClienteTempo,
  OperadorAtraso,
} from "./cruzamentos-ui"
import { LegendaSimbolos, MarcaCorrigido } from "./selos"

/** Entrada do painel: mais curta que a padrão (são ~25 itens; ~110 ms cada deixaria a tela quase vazia). */
const entradaRapida = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}
/** Ordem e títulos dos grupos do "Comparar com"; o padrão fica solto no topo. */
const GRUPOS_COMPARAR = [
  { grupo: "padrao", titulo: null },
  { grupo: "posicao", titulo: "Meses com posição" },
  { grupo: "semPosicao", titulo: "Meses sem posição" },
  { grupo: "versao", titulo: "Outras versões deste mês" },
] as const
const DESTAQUES = ["naoFinalizados", "finalizados", "atraso", "sla"] as const
/** Cor do ponto do mês atual no minigráfico de cada indicador em destaque. */
const COR_SERIE: Record<string, string> = {
  naoFinalizados: COR_NAO,
  finalizados: COR_FIN,
  atraso: COR_NAO,
  sla: COR_FIN,
}
/** Os 8 indicadores compactos, em dois grupos com rótulo. */
const GRUPOS_KPI = [
  {
    titulo: "Fluxo",
    ids: ["entradas", "reabertos", "aguardandoAceite", "semSla"],
  },
  {
    titulo: "Prazo",
    ids: ["slaVencido", "slaRenegociado", "tempoMedio", "tempoAceite"],
  },
] as const
const inteiro = new Intl.NumberFormat("pt-BR")
const n = (v: number) => inteiro.format(v)

/** Colunas de uma linha fechada de N cartões: nenhum cartão fica sozinho nem sobra vazio em nenhuma largura. */
const COLUNAS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 xl:grid-cols-2",
  3: "grid-cols-1 xl:grid-cols-3",
  4: "grid-cols-1 xl:max-[2199px]:grid-cols-2 min-[2200px]:grid-cols-4",
}
const linha = (n: number) =>
  `grid items-start gap-5 ${COLUNAS[Math.min(Math.max(n, 1), 4)]}`

/** Painel estratégico do mês (D31–D36): KPIs com delta e gráficos. Sem tabela de linhas soltas. */
export function PainelChamados({
  carga,
  historico,
  obterCarga,
  entrada,
  irPara,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const entradaFixa = useEntrada(entrada)
  // leituras e filtros vêm do hook de sempre (a aba Leituras usa a mesma conta)
  const { sheet, filtros, leituras, semColuna } = useMesDeChamados(
    carga,
    historico,
    obterCarga
  )
  const [escolhaDe, setEscolha] = useState({ carga: carga.id, valor: ANTERIOR })
  const escolha = escolhaDe.carga === carga.id ? escolhaDe.valor : ANTERIOR
  const comparado = usePainelComparado({
    carga,
    historico,
    obterCarga,
    sheet,
    filtros,
    escolha,
  })

  // tendência de 6 meses dos indicadores em destaque (cache do motor: a mesma conta do "Ao longo do tempo")
  const cargasEvolucao = useCargasDoTipo(historico, obterCarga)
  const evolucao = useMemo(
    () =>
      cargasEvolucao
        ? pontosDaEvolucao(cargasEvolucao, 6, filtros, carga.competencia)
        : null,
    [cargasEvolucao, filtros, carga.competencia]
  )

  const anoPresumido = useMemo(
    () => inferirCompetencia(carga.workbook, carga.arquivo).anoPresumido,
    [carga.workbook, carga.arquivo]
  )
  const cabecalho = (
    <header className="flex flex-col gap-2">
      <h1 className="text-6xl leading-none text-primary">
        Chamados{" "}
        <span className="font-normal text-primary/65">
          {formatarCompetencia(carga.competencia, "longo")}
        </span>
      </h1>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-lg text-muted-foreground">
        {carga.versao > 1 && <span>versão {carga.versao}</span>}
        <span>
          carga de {new Date(carga.importadaEm).toLocaleDateString("pt-BR")}
        </span>
        <span>{carga.arquivo}</span>
        {anoPresumido && <span>ano não consta na planilha</span>}
      </p>
      <ChipsFiltrosChamados />
      <AvisoFiltroSemColuna
        avisos={semColuna.length ? [avisoColunasSemFiltro(semColuna)] : []}
      />
    </header>
  )

  if (!sheet)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <p role="alert" className="text-xl text-destructive">
          Não encontrei, nesta planilha, uma aba de chamados com as colunas de
          abertura e situação.
        </p>
      </div>
    )
  if (!comparado)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <Carregando texto="Carregando o painel…" forma="painel" />
      </div>
    )

  const play = entradaFixa && !reduce
  // a entrada do zero é só da primeira visita; filtro e "Comparar com" transitam o valor (.transicao-valor)
  const { metricas, entradaAtual, base, entradaBase, opcoes, corrigidoPor } =
    comparado
  // o aviso de filtro sem coluna já aparece junto dos chips
  const avisosRodape = metricas.avisos.filter(
    (a) => !a.startsWith("Sem a coluna") && !a.startsWith("Sem as colunas")
  )
  const rotuloAnterior = comparado.rotuloBase ?? "mês anterior"
  const marcaDe = (k: (typeof metricas.kpis)[number]) =>
    k.original !== undefined && corrigidoPor.length ? (
      <MarcaCorrigido
        por={corrigidoPor}
        original={formatValue(
          k.original,
          k.formato === "inteiro"
            ? "integer"
            : k.formato === "percentual"
              ? "percent"
              : "decimal"
        )}
      />
    ) : undefined
  const kpiDe = (id: string) => metricas.kpis.find((k) => k.id === id)
  const destaques = DESTAQUES.map(kpiDe).filter((k) => !!k)
  const naGrupos = new Set<string>([
    ...DESTAQUES,
    ...GRUPOS_KPI.flatMap((g) => g.ids),
  ])
  // indicador fora das listas (se o motor criar um novo) entra no fim do 1º grupo: nada some
  const sobras = metricas.kpis.filter((k) => !naGrupos.has(k.id))
  const grupos = GRUPOS_KPI.map((g, i) => ({
    titulo: g.titulo,
    kpis: [...g.ids.map(kpiDe).filter((k) => !!k), ...(i === 0 ? sobras : [])],
  }))
  const serieDe = (id: string) =>
    evolucao && COR_SERIE[id]
      ? {
          valores: evolucao.pontos.map((p) => p.valores[id] ?? null),
          rotulos: evolucao.pontos.map((p) => p.rotulo),
          cor: COR_SERIE[id],
        }
      : undefined
  const naoFinalizados =
    metricas.kpis.find((k) => k.id === "naoFinalizados")?.valor ?? null
  const dist = (id: Distribuicao["id"]) =>
    metricas.distribuicoes.find((d) => d.id === id)
  const mes = formatarCompetencia(carga.competencia, "longo")
  const semDados = semColuna.length > 0
  const vazio = (
    <p className="py-10 text-center text-lg text-muted-foreground">
      Sem dados com este filtro nesta carga
    </p>
  )
  const rankings: { id: Distribuicao["id"]; sub: string; max?: number }[] = [
    { id: "operador", sub: "por operador", max: 8 },
    { id: "area", sub: "por área (módulo)", max: 8 },
    { id: "atividade", sub: "por atividade", max: 8 },
    { id: "areaSuperior", sub: "por área superior", max: 8 },
  ]
  const cliente = dist("cliente")
  const rankingsAqui = rankings.filter((r) => dist(r.id))
  // sem cliente, o atraso entra na linha dos rankings (nenhuma linha fica com um cartão só)
  const cartoesLinha2 = rankingsAqui.length + (cliente ? 0 : 1)
  // símbolos que aparecem nesta tela, para a legenda
  const tiposNaTela: SeloTipo[] = [
    ...([cliente, ...rankings.map((r) => dist(r.id))].some(
      (d) => d && temOutros(d.itens)
    )
      ? (["outros"] as const)
      : []),
    ...(corrigidoPor.length ? (["corrigido"] as const) : []),
  ]
  const cores = coresDasSituacoes([
    ...metricas.situacoes.map((s) => s.rotulo),
    ...(base?.situacoes.map((s) => s.rotulo) ?? []),
  ])
  const cruz = {
    atual: entradaAtual,
    competencia: carga.competencia,
    base,
    entradaBase,
    cores,
    animar: play,
  }
  const graficoRanking = (r: (typeof rankings)[number]) => {
    const d = dist(r.id)
    if (!d) return null
    return (
      <GraficoMes
        key={r.id}
        dist={d}
        base={base}
        entrada={entradaAtual}
        competencia={carga.competencia}
        sub={r.sub}
        max={r.max}
        animar={play}
        corrigidoPor={corrigidoPor}
      />
    )
  }
  const atraso = (
    <AtrasoMes
      key="atraso"
      faixas={metricas.atrasoFaixas}
      base={base}
      competencia={carga.competencia}
      animar={play}
      tabelaVazia={semDados}
    />
  )

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-10"
        variants={entradaRapida}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        {cabecalho}
        <LegendaSimbolos tipos={tiposNaTela} />

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-base text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <Label
                htmlFor="comparar-com"
                className="text-base font-medium text-foreground"
              >
                Comparar com
              </Label>
              <Select
                value={escolha}
                onValueChange={(valor) => {
                  setEscolha({ carga: carga.id, valor })
                }}
              >
                <SelectTrigger id="comparar-com" className="w-auto min-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRUPOS_COMPARAR.map(({ grupo, titulo }) => {
                    const itens = opcoes.filter((o) => o.grupo === grupo)
                    if (itens.length === 0) return null
                    const lista = itens.map((o) => (
                      <SelectItem key={o.valor} value={o.valor}>
                        {o.rotulo}{" "}
                        {o.secundario && (
                          <span className="text-sm font-normal text-muted-foreground">
                            {o.secundario}
                          </span>
                        )}
                      </SelectItem>
                    ))
                    return titulo ? (
                      <SelectGroup key={grupo}>
                        <SelectLabel>{titulo}</SelectLabel>
                        {lista}
                      </SelectGroup>
                    ) : (
                      <SelectGroup key={grupo}>{lista}</SelectGroup>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <p>
              {!base
                ? "Sem variação: sem carga do mês anterior. Os cartões mostram só o valor do mês."
                : `Variação contra ${rotuloAnterior}${
                    base?.semFoto
                      ? " (sem posição: só entradas e finalizados)"
                      : base
                        ? " (carga própria)"
                        : ""
                  }. Vale para o topo, os indicadores e os gráficos.`}
            </p>
          </div>
          {irPara && (
            <Button
              type="button"
              variant="link"
              onClick={() => irPara("leituras")}
              className="h-auto gap-1.5 p-0 text-base font-medium underline"
            >
              {leituras.length === 1
                ? "1 leitura do mês"
                : `${leituras.length} leituras do mês`}
              <ArrowRightIcon className="size-4" aria-hidden />
            </Button>
          )}
        </div>

        <section
          id="faixa-como"
          aria-labelledby="titulo-como"
          className="flex scroll-mt-4 flex-col gap-6"
        >
          <TituloBloco
            id="titulo-como"
            titulo="Como estamos?"
            texto={`Situação dos chamados e indicadores de ${mes}`}
          />
          {metricas.totalChamados === null ? (
            <section aria-label="Chamados por situação">{vazio}</section>
          ) : (
            <FaixaSituacao
              total={metricas.totalChamados}
              situacoes={metricas.situacoes}
              anterior={base}
              mes={mes}
              entrada={play}
              corrigidoPor={corrigidoPor}
              cores={cores}
            />
          )}

          <section aria-label="Indicadores" className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {destaques.map((k) => (
                <KpiCartao
                  key={k.id}
                  kpi={k}
                  destaque
                  rotuloAnterior={rotuloAnterior}
                  entrada={play}
                  marca={marcaDe(k)}
                  serie={serieDe(k.id)}
                />
              ))}
            </div>
            <div className="grid gap-6 min-[2200px]:grid-cols-2">
              {grupos.map((g) => (
                <div key={g.titulo} className="flex flex-col gap-3">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {g.titulo}
                  </h3>
                  <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
                    {g.kpis.map((k) => (
                      <KpiCartao
                        key={k.id}
                        kpi={k}
                        rotuloAnterior={rotuloAnterior}
                        entrada={play}
                        marca={marcaDe(k)}
                        extra={
                          k.id === "aguardandoAceite" &&
                          k.valor !== null &&
                          naoFinalizados
                            ? `de ${n(naoFinalizados)} não finalizados`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section
          id="faixa-onde"
          aria-labelledby="titulo-onde"
          className="flex scroll-mt-4 flex-col gap-5"
        >
          <TituloBloco
            id="titulo-onde"
            titulo="Onde está o problema?"
            texto={`${mes} ao lado de ${comparado.rotuloBase ?? "outro mês (escolha em “Comparar com”)"}`}
          />
          <motion.div className="flex flex-col gap-5">
            {cliente && (
              <div className={linha(3)}>
                <GraficoMes
                  dist={cliente}
                  base={base}
                  entrada={entradaAtual}
                  competencia={carga.competencia}
                  sub="por cliente"
                  max={8}
                  animar={play}
                  corrigidoPor={corrigidoPor}
                  className="xl:col-span-2"
                />
                {atraso}
              </div>
            )}
            {cartoesLinha2 > 0 && (
              <div className={linha(cartoesLinha2)}>
                {!cliente && atraso}
                {rankingsAqui.map(graficoRanking)}
              </div>
            )}
            <MontarDepois
              reservado={
                <Carregando
                  forma="cruzamentos"
                  texto="Carregando os cruzamentos…"
                />
              }
            >
              <div className={linha(4)}>
                <ClienteSituacao {...cruz} />
                <OperadorAtraso {...cruz} />
                <AreaSla {...cruz} />
                <ClienteTempo {...cruz} />
              </div>
            </MontarDepois>
          </motion.div>
        </section>

        {/* 3ª faixa: a Evolução, com os mesmos filtros do Painel */}
        <div id="faixa-melhorando" className="scroll-mt-4">
          <MontarDepois
            aoVisivel
            limite={300}
            reservado={
              <Carregando forma="tempo" texto="Carregando a evolução…" />
            }
          >
            <BlocoTempo
              carga={carga}
              historico={historico}
              obterCarga={obterCarga}
              entrada={entrada}
            />
          </MontarDepois>
        </div>

        {avisosRodape.length > 0 && (
          <footer
            aria-label="Avisos"
            className="text-base text-muted-foreground"
          >
            <ul className="flex flex-col gap-1">
              {avisosRodape.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </footer>
        )}
      </motion.div>
    </TooltipProvider>
  )
}
