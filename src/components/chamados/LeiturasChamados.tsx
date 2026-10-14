import { useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { FilterIcon } from "lucide-react"

import { formatarCompetencia } from "@/cargas"
import type { Leitura } from "@/chamados"
import { entryContainer } from "@/components/app/motion/variants"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { LeituraCartao } from "./cartoes"
import { ChipsFiltrosChamados, useFiltrosChamados } from "./filtros"
import { BarrasRanking, COR } from "./graficos"
import { Carregando } from "./Carregando"
import { useMesDeChamados } from "./hooks"
import {
  evidenciaDaLeitura,
  filtroDaLeitura,
  numerosDaLeitura,
  recorteTexto,
  regraDaLeitura,
  selosDaLeitura,
  temOutros,
  type SeloTipo,
} from "./logica"
import { LegendaSimbolos, Selos } from "./selos"

const SEV_ROTULO = { critico: "Crítico", atencao: "Atenção", destaque: "Destaque" }

/** Visão "Leituras": cartões grandes; o clique abre um modal de detalhe, sem navegar nem rolar. */
export function LeiturasChamados({
  carga,
  historico,
  obterCarga,
  entrada,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const { sheet, filtros, metricas, leituras, anterior } = useMesDeChamados(
    carga,
    historico,
    obterCarga
  )
  const { definir } = useFiltrosChamados()
  const [aberta, setAberta] = useState<Leitura["id"] | null>(null)

  const recorte = recorteTexto(filtros)
  const titulo = `Leituras · ${formatarCompetencia(carga.competencia, "longo")}${recorte ? ` · ${recorte}` : ""}`
  const cabecalho = (
    <header className="flex flex-col gap-1">
      <h1 className="text-6xl leading-none text-primary">{titulo}</h1>
      <ChipsFiltrosChamados />
    </header>
  )
  if (!sheet)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <p role="alert" className="text-xl text-destructive">
          Não encontrei uma aba de chamados nesta planilha.
        </p>
      </div>
    )
  if (!metricas || anterior === undefined)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <Carregando texto="Carregando as leituras…" />
      </div>
    )

  const play = entrada && !reduce
  const anteriorPropria = anterior?.propria ?? false
  const leitura = leituras.find((l) => l.id === aberta) ?? null
  const evidencia = leitura ? evidenciaDaLeitura(leitura, metricas) : null
  const filtro = leitura ? filtroDaLeitura(leitura) : null
  const selosGrafico: SeloTipo[] = leitura
    ? [
        ...(leitura.id === "gargaloCliente" ? (["exportacao"] as const) : []),
        ...(evidencia && temOutros(evidencia.itens) ? (["outros"] as const) : []),
      ]
    : []

  const tiposNaTela: SeloTipo[] = leituras.flatMap((l) => selosDaLeitura(l, anteriorPropria))

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-6"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        animate="show"
      >
        {cabecalho}
        <p className="text-lg text-muted-foreground">
          Leituras automáticas do mês, com regras de limite fixo: não projetam o
          futuro. Clique numa para ver a regra, os números e a evidência.
        </p>
        <LegendaSimbolos tipos={tiposNaTela} />
        {leituras.length > 0 ? (
          <ul className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {leituras.map((l) => (
              <LeituraCartao
                key={l.id}
                leitura={l}
                grande
                selos={selosDaLeitura(l, anteriorPropria)}
                onAbrir={(x) => setAberta(x.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xl text-muted-foreground">
            Nenhuma leitura automática para este mês: os limites de alerta não
            foram atingidos{recorte ? " neste recorte" : ""}.
          </p>
        )}
      </motion.div>

      <Dialog open={!!leitura} onOpenChange={(o) => !o && setAberta(null)}>
        {leitura && (
          <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <p className="text-lg font-semibold text-muted-foreground">
                {SEV_ROTULO[leitura.severidade]}
              </p>
              <DialogTitle className="text-3xl leading-snug text-primary">
                {leitura.titulo}
              </DialogTitle>
              <DialogDescription className="text-xl text-foreground">
                {leitura.texto}
              </DialogDescription>
            </DialogHeader>

            <section aria-label="Regra que disparou" className="flex flex-col gap-1">
              <h3 className="text-xl text-primary">Regra que disparou</h3>
              <p className="text-lg">{regraDaLeitura(leitura.id)}</p>
            </section>

            <section aria-label="Números que sustentam" className="flex flex-col gap-2">
              <h3 className="text-xl text-primary">Números que sustentam</h3>
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-lg">
                {numerosDaLeitura(leitura, metricas).map((x) => (
                  <div key={x.rotulo} className="contents">
                    <dt className="text-muted-foreground">{x.rotulo}</dt>
                    <dd className="num text-right font-display font-semibold text-primary">
                      {x.valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {evidencia && (
              <section aria-label="Evidência" className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl text-primary">{evidencia.titulo}</h3>
                  <Selos tipos={selosGrafico} />
                </div>
                <LegendaSimbolos tipos={selosGrafico} />
                <BarrasRanking
                  itens={evidencia.itens}
                  corDoItem={(i) =>
                    evidencia.destaque.includes(i.rotulo)
                      ? leitura.severidade === "critico" || i.rotulo.startsWith(">")
                        ? COR.atraso
                        : COR.laranja
                      : COR.cinza
                  }
                  animar={false}
                />
                <p className="text-base text-muted-foreground">
                  Em destaque: {evidencia.destaque.join(", ") || "—"}.
                </p>
              </section>
            )}

            {leitura.acao && (
              <section aria-label="Ação sugerida" className="flex flex-col gap-1">
                <h3 className="text-xl text-primary">Ação sugerida</h3>
                <p className="text-lg">{leitura.acao}</p>
              </section>
            )}

            <DialogFooter>
              {filtro && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    definir(filtro.campo, filtro.valores)
                    setAberta(null)
                  }}
                >
                  <FilterIcon aria-hidden /> Filtrar por isto
                </Button>
              )}
              <Button size="lg" onClick={() => setAberta(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </TooltipProvider>
  )
}
