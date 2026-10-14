import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { tiposRegistrados, type Carga, type CargaMeta } from "@/cargas"
import { competenciasDoTipo, resolverVisao, type Visao } from "@/app/navegacao"
import { visoesDoTipo } from "@/panels/tipos"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BarraContext } from "./BarraContext"
import { HistoricoSheet } from "./HistoricoSheet"
import { TopBar } from "./TopBar"
import { useBarVisibility } from "./hooks/useBarVisibility"
import { useShortcuts } from "./hooks/useShortcuts"
import { crossfade } from "./motion/tokens"

export type ApresentacaoProps = {
  carga: Carga
  metas: CargaMeta[]
  obterCarga: (id: string) => Promise<Carga | null>
  onAbrir: (id: string) => void
  onExcluir: (meta: CargaMeta) => void
  onNovaCarga: (file: File) => void
  onApagarTudo: () => void
  erro: string | null
  onDismissErro: () => void
}

/** Casca do modo apresentação: barra, visões do tipo e diálogos de histórico/limpeza. */
export function Apresentacao(p: ApresentacaoProps) {
  const { carga, metas } = p
  const reduce = useReducedMotion()
  const [visaoPedida, setVisaoPedida] = useState<Visao>("painel")
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [limparOpen, setLimparOpen] = useState(false)
  const [seletorOpen, setSeletorOpen] = useState(false)
  const [painelHold, setPainelHold] = useState(false)
  const [dica, setDica] = useState<string | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [vistas, setVistas] = useState<string[]>([])

  const visoes = visoesDoTipo(carga.tipo)
  const disponiveis = useMemo<Visao[]>(
    () => [
      "painel",
      ...(visoes.Comparar ? (["comparar"] as const) : []),
      ...(visoes.Evolucao ? (["evolucao"] as const) : []),
    ],
    [visoes]
  )
  const visao = resolverVisao(visaoPedida, disponiveis)
  const Visao =
    visao === "comparar"
      ? visoes.Comparar!
      : visao === "evolucao"
        ? visoes.Evolucao!
        : visoes.Painel

  const overlay = historicoOpen || limparOpen || seletorOpen || painelHold
  const bar = useBarVisibility({ hold: overlay })

  const pedirVisao = useCallback(
    (v: Visao) => {
      if (!overlay && disponiveis.includes(v)) setVisaoPedida(v)
    },
    [disponiveis, overlay]
  )
  useShortcuts({ onToggleBar: bar.toggle, onVisao: pedirVisao })

  const chave = `${carga.id}:${visao}`
  const entrada = !vistas.includes(chave)
  useEffect(() => {
    const t = setTimeout(
      () => setVistas((s) => (s.includes(chave) ? s : [...s, chave])),
      0
    )
    return () => clearTimeout(t)
  }, [chave])

  const ctx = useMemo(() => ({ slot, setHold: setPainelHold, setDica }), [slot])
  const doTipo = useMemo(
    () => metas.filter((m) => m.tipo === carga.tipo),
    [metas, carga.tipo]
  )
  const atualMeta = metas.find((m) => m.id === carga.id) ?? carga
  const tipoNome =
    tiposRegistrados().find((t) => t.id === carga.tipo)?.nome ?? carga.tipo

  return (
    <BarraContext.Provider value={ctx}>
      <div className="min-h-svh">
        <TopBar
          visible={bar.visible}
          tipoNome={tipoNome}
          atual={atualMeta}
          grupos={competenciasDoTipo(metas, carga.tipo)}
          visoes={disponiveis}
          visao={visao}
          onSlot={setSlot}
          dica={dica}
          onAbrir={p.onAbrir}
          onVisao={setVisaoPedida}
          onPickFile={p.onNovaCarga}
          onHistorico={() => setHistoricoOpen(true)}
          onClear={() => setLimparOpen(true)}
          onSelectorOpenChange={setSeletorOpen}
        />

        <main className="mx-auto flex w-full max-w-[1760px] flex-col gap-6 px-10 pt-40 pb-16">
          {p.erro && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 border-l-4 border-destructive bg-card py-3 pl-4 text-lg"
            >
              <span>
                <span className="font-medium text-destructive">{p.erro}</span> A
                carga atual continua aberta.
              </span>
              <Button variant="ghost" size="lg" onClick={p.onDismissErro}>
                Fechar
              </Button>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={chave}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : crossfade, ease: "linear" }}
            >
              <Visao
                carga={carga}
                historico={doTipo}
                obterCarga={p.obterCarga}
                entrada={entrada}
              />
            </motion.div>
          </AnimatePresence>
        </main>

        <HistoricoSheet
          open={historicoOpen}
          onOpenChange={setHistoricoOpen}
          metas={metas}
          atualId={carga.id}
          onAbrir={p.onAbrir}
          onExcluir={p.onExcluir}
        />

        <Dialog open={limparOpen} onOpenChange={setLimparOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary">
                Limpar este navegador?
              </DialogTitle>
              <DialogDescription className="text-base">
                Apaga todas as cargas guardadas aqui (todos os tipos e
                competências) e volta ao início. Os arquivos originais não são
                alterados.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="lg">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  setLimparOpen(false)
                  p.onApagarTudo()
                }}
              >
                Apagar o histórico deste navegador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BarraContext.Provider>
  )
}
