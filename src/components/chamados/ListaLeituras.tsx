import { useRef, useState } from "react"
import { FilterIcon } from "lucide-react"

import type { Leitura, MetricasChamados } from "@/chamados"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { LeituraCartao } from "./cartoes"
import { useFiltrosChamados } from "./filtros"
import { BarrasRanking, COR } from "./graficos"
import {
  evidenciaDaLeitura,
  filtroDaLeitura,
  numerosDaLeitura,
  regraDaLeitura,
  selosDaLeitura,
  temOutros,
  type SeloTipo,
} from "./logica"
import { LegendaSimbolos, Selos } from "./selos"

const SEV_ROTULO = { critico: "Crítico", atencao: "Atenção", destaque: "Destaque" }

/**
 * Cartões clicáveis das leituras + o modal de detalhe (regra, números, evidência, ação).
 * Compartilhado pelas visões Leituras e Comparar: o clique, o teclado e o foco são os mesmos.
 */
export function ListaLeituras({
  leituras,
  metricas,
  anteriorPropria,
  grande = false,
  className,
}: {
  leituras: Leitura[]
  /** Métricas da competência das leituras (a mais recente), para os números e a evidência. */
  metricas: MetricasChamados
  anteriorPropria: boolean
  grande?: boolean
  className?: string
}) {
  const { definir } = useFiltrosChamados()
  const [aberta, setAberta] = useState<Leitura["id"] | null>(null)
  const ultimaAberta = useRef<Leitura["id"] | null>(null)
  const abrir = (id: Leitura["id"]) => {
    ultimaAberta.current = id
    setAberta(id)
  }
  const leitura = leituras.find((l) => l.id === aberta) ?? null
  const evidencia = leitura ? evidenciaDaLeitura(leitura, metricas) : null
  const filtro = leitura ? filtroDaLeitura(leitura) : null
  const selosGrafico: SeloTipo[] = leitura
    ? [
        ...(leitura.id === "gargaloCliente" ? (["exportacao"] as const) : []),
        ...(evidencia && temOutros(evidencia.itens) ? (["outros"] as const) : []),
      ]
    : []

  return (
    <>
      <ul className={cn("grid grid-cols-1 xl:grid-cols-2", grande ? "gap-5" : "gap-4", className)}>
        {leituras.map((l) => (
          <LeituraCartao
            key={l.id}
            leitura={l}
            grande={grande}
            selos={selosDaLeitura(l, anteriorPropria)}
            onAbrir={(x) => abrir(x.id)}
          />
        ))}
      </ul>

      <Dialog open={!!leitura} onOpenChange={(o) => !o && setAberta(null)}>
        {leitura && (
          <DialogContent
            className="max-h-[92svh] overflow-y-auto sm:max-w-3xl"
            onCloseAutoFocus={(e) => {
              // sem DialogTrigger, o Radix não sabe para onde voltar: devolve o foco ao cartão que abriu
              e.preventDefault()
              document
                .querySelector<HTMLElement>(
                  `[data-leitura="${ultimaAberta.current}"] button`
                )
                ?.focus()
            }}
          >
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
                <div className="flex items-start gap-2">
                  {selosGrafico.length > 0 && (
                    <span className="flex h-7 shrink-0 items-center">
                      <Selos tipos={selosGrafico} />
                    </span>
                  )}
                  <h3 className="text-xl leading-7 text-primary">{evidencia.titulo}</h3>
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
    </>
  )
}
