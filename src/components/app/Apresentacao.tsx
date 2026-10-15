import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import {
  tiposRegistrados,
  type AlteracaoDeCarga,
  type Carga,
  type CargaMeta,
} from "@/cargas"
import {
  agruparHistorico,
  competenciasDoTipo,
  resolverVisao,
  type Visao,
} from "@/app/navegacao"
import { guardarUltimaAbertura, lerUltimaAbertura } from "@/app/ultima-abertura"
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
import { NovoEnvioDialog } from "./NovoEnvioDialog"
import { TopBar } from "./TopBar"
import { useBarVisibility } from "./hooks/useBarVisibility"
import { useShortcuts } from "./hooks/useShortcuts"
import { useTelaCheia } from "./hooks/useTelaCheia"
import { crossfade } from "./motion/tokens"

export type ApresentacaoProps = {
  carga: Carga
  /** Cargas ativas (as arquivadas ficam de fora do seletor e das visões). */
  metas: CargaMeta[]
  /** Todas as cargas, inclusive arquivadas: só o Histórico e a conta de versões usam. */
  metasTodas: CargaMeta[]
  onAlterar: (id: string, alteracao: AlteracaoDeCarga) => Promise<void>
  obterCarga: (id: string) => Promise<Carga | null>
  onAbrir: (id: string) => void
  onNovaCarga: (files: File[], ignorados: string[]) => void
  /** Ausente no banco compartilhado: não há como apagar tudo. */
  onApagarTudo?: () => void
  onFecharCarga: () => void
  erro: string | null
  onDismissErro: () => void
}

const Fragmento = ({ children }: { carga: Carga; children: ReactNode }) => (
  <>{children}</>
)

/** Casca do modo apresentação: barra, visões do tipo e diálogos de histórico/limpeza. */
export function Apresentacao(p: ApresentacaoProps) {
  const { carga, metas } = p
  const reduce = useReducedMotion()
  const [visaoPedida, setVisaoPedida] = useState<Visao>(() => lerUltimaAbertura().visao ?? "painel")
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [limparOpen, setLimparOpen] = useState(false)
  const [seletorOpen, setSeletorOpen] = useState(false)
  const [envioOpen, setEnvioOpen] = useState(false)
  const [painelHold, setPainelHold] = useState(false)
  const [dica, setDica] = useState<string | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [vistas, setVistas] = useState<string[]>([])

  const visoes = visoesDoTipo(carga.tipo)
  const disponiveis = useMemo<Visao[]>(
    () => [
      "painel",
      ...(visoes.Evolucao ? (["evolucao"] as const) : []),
      ...(visoes.Comparar ? (["comparar"] as const) : []),
      ...(visoes.Leituras ? (["leituras"] as const) : []),
    ],
    [visoes]
  )
  const Envoltorio = visoes.Envoltorio ?? Fragmento
  const visao = resolverVisao(visaoPedida, disponiveis)
  const Visao =
    visao === "leituras"
      ? visoes.Leituras!
      : visao === "comparar"
      ? visoes.Comparar!
      : visao === "evolucao"
        ? visoes.Evolucao!
        : visoes.Painel

  const overlay = historicoOpen || limparOpen || seletorOpen || envioOpen || painelHold
  const barRef = useRef<HTMLElement>(null)
  const bar = useBarVisibility({ hold: overlay, barRef })

  // Arrastar um arquivo sobre a janela abre o modal de envio (sem outro diálogo aberto).
  useEffect(() => {
    const aoArrastar = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return
      if (document.querySelector('[role="dialog"]')) return
      setEnvioOpen(true)
    }
    window.addEventListener("dragenter", aoArrastar)
    return () => window.removeEventListener("dragenter", aoArrastar)
  }, [])

  // Só a escolha da pessoa vira lembrança (não a visão que sobrou por falta de opção).
  const escolherVisao = useCallback((v: Visao) => {
    setVisaoPedida(v)
    guardarUltimaAbertura({ visao: v })
  }, [])
  const pedirVisao = useCallback(
    (v: Visao) => {
      if (!overlay && disponiveis.includes(v)) escolherVisao(v)
    },
    [disponiveis, overlay, escolherVisao]
  )
  const telaCheia = useTelaCheia()
  useShortcuts({
    onToggleBar: bar.toggle,
    onVisao: pedirVisao,
    onTelaCheia: telaCheia.suportado ? telaCheia.alternar : undefined,
  })

  // Barra fixada (H) ou segurada pela gaveta de filtros: não flutua sobre o
  // conteúdo, que ganha um respiro igual à altura dela (senão cobre os chips).
  const barraSegura = bar.fixa || painelHold
  const [alturaBarra, setAlturaBarra] = useState(0)
  useLayoutEffect(() => {
    const barra = barRef.current
    if (!barraSegura || !barra) return
    const medir = () => setAlturaBarra(barra.offsetHeight)
    medir()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(medir)
    ro.observe(barra)
    return () => ro.disconnect()
  }, [barraSegura])

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
          fixa={bar.fixa}
          barRef={barRef}
          tipoNome={tipoNome}
          atual={atualMeta}
          grupos={competenciasDoTipo(metas, carga.tipo)}
          outrosTipos={agruparHistorico(metas).filter(
            (g) => g.tipo !== carga.tipo
          )}
          visoes={disponiveis}
          visao={visao}
          onSlot={setSlot}
          dica={dica}
          onAbrir={p.onAbrir}
          onVisao={escolherVisao}
          onNovaCarga={() => setEnvioOpen(true)}
          onHistorico={() => setHistoricoOpen(true)}
          podeApagar={!!p.onApagarTudo}
          onClear={() =>
            p.onApagarTudo ? setLimparOpen(true) : p.onFecharCarga()
          }
          onSelectorOpenChange={setSeletorOpen}
          onTelaCheia={telaCheia.suportado ? telaCheia.alternar : undefined}
          telaCheiaAtiva={telaCheia.ativa}
        />

        <main
          data-barra-segura={barraSegura}
          style={
            barraSegura && alturaBarra > 0
              ? { paddingTop: `calc(${alturaBarra}px + 1rem)` }
              : undefined
          }
          className="mx-auto flex w-full max-w-[200rem] flex-col gap-6 px-[clamp(1.5rem,3vw,6rem)] pt-[max(2rem,env(safe-area-inset-top))] pb-16 transition-[padding-top] duration-200 motion-reduce:transition-none"
        >
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

          <Envoltorio carga={carga}>
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
                irPara={pedirVisao}
              />
            </motion.div>
          </AnimatePresence>
          </Envoltorio>
        </main>

        <NovoEnvioDialog
          open={envioOpen}
          onOpenChange={setEnvioOpen}
          onFiles={p.onNovaCarga}
        />

        <HistoricoSheet
          open={historicoOpen}
          onOpenChange={setHistoricoOpen}
          metas={p.metasTodas}
          atualId={carga.id}
          onAbrir={p.onAbrir}
          onAlterar={p.onAlterar}
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
                  p.onApagarTudo?.()
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
