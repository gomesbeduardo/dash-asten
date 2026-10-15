import {
  useCallback,
  useDeferredValue,
  useEffect,
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
import { pedirComparacao } from "@/components/chamados/pedidoComparar"
import { NovoEnvioDialog } from "./NovoEnvioDialog"
import { TopBar } from "./TopBar"
import { useBarVisibility } from "./hooks/useBarVisibility"
import { useShortcuts } from "./hooks/useShortcuts"
import { useTelaCheia } from "./hooks/useTelaCheia"
import { duration, esperaTrocaAba, saida, standard } from "./motion/tokens"
import { useEntrada } from "./motion/useEntrada"

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

/**
 * Trava a `entrada` do momento em que a aba montou e a marca como vista logo
 * depois (a próxima visita não anima). Repassa a `entrada` travada à visão.
 */
function Montada({
  entrada,
  onMontar,
  children,
}: {
  entrada: boolean
  onMontar: () => void
  children: (entrada: boolean) => ReactNode
}) {
  // Trava aqui: a chave só é marcada depois da montagem.
  const entradaTravada = useEntrada(entrada)
  useEffect(() => {
    const t = setTimeout(onMontar, 0)
    return () => clearTimeout(t)
  }, [onMontar])
  return <>{children(entradaTravada)}</>
}

const Fragmento = ({ children }: { carga: Carga; children: ReactNode }) => (
  <>{children}</>
)

type ConteudoProps = {
  carga: Carga
  visao: Visao
  chave: string
  entrada: boolean
  onMontar: () => void
  historico: CargaMeta[]
  obterCarga: ApresentacaoProps["obterCarga"]
  irPara: (v: Visao) => void
}

/**
 * Conteúdo da aba. Memoizado: quando só a aba escolhida muda (render urgente), as
 * props ficam as da aba antiga e esta parte pesada não renderiza de novo.
 */
const Conteudo = memo(function Conteudo(p: ConteudoProps) {
  const reduce = useReducedMotion()
  const visoes = visoesDoTipo(p.carga.tipo)
  const Envoltorio = visoes.Envoltorio ?? Fragmento
  const Visao =
    p.visao === "leituras"
      ? visoes.Leituras!
      : p.visao === "comparar"
        ? visoes.Comparar!
        : visoes.Painel
  return (
    <Envoltorio carga={p.carga}>
      <motion.div
        key={p.chave}
        initial={{ opacity: reduce ? 1 : 0.3 }}
        animate={{
          opacity: 1,
          transition: { duration: reduce ? 0 : duration.fast, ease: standard },
        }}
      >
        <Montada entrada={p.entrada} onMontar={p.onMontar}>
          {(e) => (
            <Visao
              carga={p.carga}
              historico={p.historico}
              obterCarga={p.obterCarga}
              entrada={e}
              irPara={p.irPara}
            />
          )}
        </Montada>
      </motion.div>
    </Envoltorio>
  )
})

/** Casca do modo apresentação: barra, visões do tipo e diálogos de histórico/limpeza. */
export function Apresentacao(p: ApresentacaoProps) {
  const { carga, metas } = p
  const reduce = useReducedMotion()
  const [visaoPedida, setVisaoPedida] = useState<Visao>(
    () => lerUltimaAbertura().visao ?? "painel"
  )
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [limparOpen, setLimparOpen] = useState(false)
  const [seletorOpen, setSeletorOpen] = useState(false)
  const [envioOpen, setEnvioOpen] = useState(false)
  const [painelHold, setPainelHold] = useState(false)
  const [dica, setDica] = useState<string | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [vistas, setVistas] = useState<string[]>([])

  // A barra e a aba escolhida respondem na hora; o conteúdo troca depois, num
  // render interrompível. O conteúdo antigo fica na tela até o novo estar pronto
  // (sem esqueleto nem branco quando os dados já estão em cache).
  const visoes = visoesDoTipo(carga.tipo)
  const disponiveis = useMemo<Visao[]>(
    () => [
      "painel",
      ...(visoes.Comparar ? (["comparar"] as const) : []),
      ...(visoes.Leituras ? (["leituras"] as const) : []),
    ],
    [visoes]
  )
  const visao = resolverVisao(visaoPedida, disponiveis)

  // Troca de aba em duas fases: 1) o indicador anima sozinho, com o conteúdo
  // antigo na tela; 2) quando assenta (ou no teto de tempo), o novo monta.
  // Carga nova ou movimento reduzido não esperam. Cliques rápidos: vale o último.
  const [pronta, setPronta] = useState({ cargaId: carga.id, visao })
  const conteudoAtual =
    pronta.cargaId === carga.id && disponiveis.includes(pronta.visao)
  if (!conteudoAtual || reduce) {
    if (pronta.cargaId !== carga.id || pronta.visao !== visao)
      setPronta({ cargaId: carga.id, visao })
  }
  const visaoConteudo = conteudoAtual && !reduce ? pronta.visao : visao
  const assentou = useCallback(
    () =>
      setPronta((p) =>
        p.cargaId === carga.id && p.visao === visao
          ? p
          : { cargaId: carga.id, visao }
      ),
    [carga.id, visao]
  )
  useEffect(() => {
    if (visao === pronta.visao) return
    const t = setTimeout(assentou, esperaTrocaAba)
    return () => clearTimeout(t)
  }, [visao, pronta.visao, assentou])

  const alvo = useMemo(
    () => ({ carga, visao: visaoConteudo }),
    [carga, visaoConteudo]
  )
  const { carga: cargaVista, visao: visaoVista } = useDeferredValue(alvo)

  const overlay =
    historicoOpen || limparOpen || seletorOpen || envioOpen || painelHold
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

  // Só a barra fixada (H) reserva espaço: o conteúdo ganha um respiro igual à
  // altura dela (senão cobre os chips). A gaveta de filtros segura a barra, mas
  // ela fica sobreposta: empurrar o conteúdo aí causava salto de layout (CLS).
  const barraSegura = bar.fixa
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

  const chave = `${cargaVista.id}:${visaoVista}`
  const entrada = !vistas.includes(chave)
  // A aba só vira "vista" quando monta na tela.
  const marcarVista = useCallback(
    () => setVistas((s) => (s.includes(chave) ? s : [...s, chave])),
    [chave]
  )

  const ctx = useMemo(() => ({ slot, setHold: setPainelHold, setDica }), [slot])
  const doTipo = useMemo(
    () => metas.filter((m) => m.tipo === cargaVista.tipo),
    [metas, cargaVista.tipo]
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
          onAssentou={assentou}
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

        <AnimatePresence>
          {p.erro && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: reduce ? 0 : duration.fast,
                  ease: standard,
                },
              }}
              exit={{
                opacity: 0,
                transition: { duration: reduce ? 0 : saida, ease: standard },
              }}
              className="fixed inset-x-[clamp(1.5rem,3vw,6rem)] top-36 z-20 mx-auto flex max-w-[200rem] items-center justify-between gap-4 border-l-4 border-destructive bg-card py-3 pl-4 text-lg shadow-(--shadow-card)"
            >
              <span>
                <span className="font-medium text-destructive">{p.erro}</span> A
                carga atual continua aberta.
              </span>
              <Button variant="ghost" size="lg" onClick={p.onDismissErro}>
                Fechar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <main
          data-barra-segura={barraSegura}
          style={
            barraSegura && alturaBarra > 0
              ? { paddingTop: `calc(${alturaBarra}px + 1rem)` }
              : undefined
          }
          className="mx-auto flex w-full max-w-[200rem] flex-col gap-6 px-[clamp(1.5rem,3vw,6rem)] pt-[max(2rem,env(safe-area-inset-top))] pb-16"
        >
          <Conteudo
            carga={cargaVista}
            visao={visaoVista}
            chave={chave}
            entrada={entrada}
            onMontar={marcarVista}
            historico={doTipo}
            obterCarga={p.obterCarga}
            irPara={pedirVisao}
          />
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
          onCompararVersoes={(atual, anterior) => {
            // "Comparar versões" (D66): abre o mês e leva ao Comparar já com as duas versões.
            pedirComparacao({
              competencia: atual.competencia,
              versoes: [anterior.versao, atual.versao],
            })
            p.onAbrir(atual.id)
            escolherVisao("comparar")
          }}
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
