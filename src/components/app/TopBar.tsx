import { useLayoutEffect, useRef, useState } from "react"
import type { Ref } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  FolderOpenIcon,
  HistoryIcon,
  LogOutIcon,
  MaximizeIcon,
  MinimizeIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import logo from "@/assets/asten-logo-fundo-claro.png"
import type { CargaMeta } from "@/cargas"
import type { GrupoCompetencia, GrupoTipo, Visao } from "@/app/navegacao"
import { loginEmUso } from "@/app/login-em-uso"
import { useSessao } from "@/app/sessao/SessaoContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CompetenciaSelector } from "./CompetenciaSelector"
import { duration, molaAba, standard } from "./motion/tokens"

const ROTULO_VISAO: Record<Visao, string> = {
  painel: "Painel",
  leituras: "Leituras",
  comparar: "Comparar",
  evolucao: "Evolução",
}

export type TopBarProps = {
  visible: boolean
  tipoNome: string
  atual: CargaMeta
  grupos: GrupoCompetencia[]
  /** Cargas ativas dos outros tipos, para o seletor mostrar em seções rotuladas. */
  outrosTipos?: GrupoTipo[]
  visoes: Visao[]
  visao: Visao
  /** O indicador da aba terminou de animar: o conteúdo novo pode montar. */
  onAssentou?: () => void
  /** Recebe a faixa onde o painel do tipo desenha seus controles. */
  onSlot: (el: HTMLElement | null) => void
  onAbrir: (id: string) => void
  onVisao: (v: Visao) => void
  /** Abre o modal de envio da nova carga. */
  onNovaCarga: () => void
  onHistorico: () => void
  /** true: o botão apaga o histórico local (Limpar); false: só fecha a carga. */
  podeApagar: boolean
  onClear: () => void
  onSelectorOpenChange: (open: boolean) => void
  dica: string | null
  /** Mede a barra para a região de detecção do mouse. */
  barRef?: Ref<HTMLElement>
  /** Barra fixada pela tecla H. */
  fixa?: boolean
  /** Alterna a tela cheia; ausente quando o navegador não suporta. */
  onTelaCheia?: () => void
  telaCheiaAtiva?: boolean
}

/**
 * Abas com um indicador único que só anda na horizontal: x e largura vêm de offsetLeft/offsetWidth
 * da aba ativa, relativos à lista. Com layoutId o motion mede em coordenadas de tela e, numa barra
 * fixa, soma a rolagem da página: a troca de aba que encurta a página fazia o indicador voar na vertical.
 */
function ListaDeAbas(p: {
  visoes: Visao[]
  visao: Visao
  onVisao: (v: Visao) => void
  onAssentou?: () => void
}) {
  const reduce = useReducedMotion()
  const lista = useRef<HTMLDivElement>(null)
  // A primeira medida e as remedidas (fonte, janela) entram sem animar; só a troca de aba usa a mola.
  const [caixa, setCaixa] = useState({ x: 0, width: 0, animar: false })
  const jaMediu = useRef(false)

  const medir = (animar: boolean) => {
    const ativa = lista.current?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]'
    )
    if (!ativa) return
    const { offsetLeft: x, offsetWidth: width } = ativa
    setCaixa((c) => (c.x === x && c.width === width ? c : { x, width, animar }))
  }

  useLayoutEffect(() => {
    medir(jaMediu.current)
    jaMediu.current = true
  }, [p.visao, p.visoes])

  useLayoutEffect(() => {
    const el = lista.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => medir(false))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={lista} role="tablist" className="relative flex gap-1">
      <motion.span
        data-testid="indicador-aba"
        aria-hidden
        initial={false}
        animate={{ x: caixa.x, width: caixa.width }}
        className="pointer-events-none absolute inset-y-0 left-0 z-0 rounded-md border border-ring/50 bg-brand-soft shadow-sm"
        transition={reduce || !caixa.animar ? { duration: 0 } : molaAba}
        onAnimationComplete={p.onAssentou}
      />
      {p.visoes.map((v) => {
        const active = v === p.visao
        return (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => p.onVisao(v)}
            className={cn(
              "relative shrink-0 rounded-md px-4 py-2 text-base transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none",
              active
                ? "font-semibold text-brand-ink"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="relative z-10">{ROTULO_VISAO[v]}</span>
          </button>
        )
      })}
    </div>
  )
}

export function TopBar({ onSlot, barRef, ...p }: TopBarProps) {
  const reduce = useReducedMotion()
  const { sair } = useSessao()

  return (
    <motion.header
      ref={barRef}
      data-visible={p.visible}
      initial={false}
      animate={{ opacity: p.visible ? 1 : 0, y: p.visible ? 0 : "-100%" }}
      transition={{
        duration: reduce ? 0 : p.visible ? duration.base : duration.fast,
        ease: standard,
      }}
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b bg-card pt-[env(safe-area-inset-top)] shadow-(--shadow-card)",
        !p.visible && "pointer-events-none"
      )}
    >
      {/* Mesma grade do <main>: largura máxima e padding lateral iguais. */}
      <div className="mx-auto flex w-full max-w-[200rem] flex-wrap items-center gap-x-4 gap-y-1 px-[clamp(1.5rem,3vw,6rem)] py-2">
        <img src={logo} alt="Asten" className="h-8 w-auto shrink-0" />

        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border px-3 py-1 text-base font-medium text-primary">
            {p.tipoNome}
          </span>
          <CompetenciaSelector
            atual={p.atual}
            grupos={p.grupos}
            outrosTipos={p.outrosTipos}
            onAbrir={p.onAbrir}
            onOpenChange={p.onSelectorOpenChange}
          />
        </div>

        <nav aria-label="Visões" className="min-w-fit flex-auto">
          <ListaDeAbas
            visoes={p.visoes}
            visao={p.visao}
            onVisao={p.onVisao}
            onAssentou={p.onAssentou}
          />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="default" size="lg" onClick={p.onNovaCarga}>
            <FolderOpenIcon aria-hidden /> Nova carga
          </Button>
          <Button variant="outline" size="lg" onClick={p.onHistorico}>
            <HistoryIcon aria-hidden /> Histórico
          </Button>
          <Button variant="ghost" size="lg" onClick={p.onClear}>
            {p.podeApagar ? <Trash2Icon aria-hidden /> : <XIcon aria-hidden />}{" "}
            {p.podeApagar ? "Limpar" : "Fechar carga"}
          </Button>
          {p.onTelaCheia && (
            <Button variant="ghost" size="lg" onClick={p.onTelaCheia}>
              {p.telaCheiaAtiva ? (
                <MinimizeIcon aria-hidden />
              ) : (
                <MaximizeIcon aria-hidden />
              )}{" "}
              {p.telaCheiaAtiva ? "Sair da tela cheia" : "Tela cheia"}
            </Button>
          )}
          {loginEmUso() && (
            <Button variant="ghost" size="lg" onClick={() => void sair()}>
              <LogOutIcon aria-hidden /> Sair
            </Button>
          )}
        </div>
        {/* Filtros do painel: item da própria faixa, sem padding nem borda. */}
        <div ref={onSlot} className="contents" />
      </div>
      <div className="border-t">
        <p className="mx-auto w-full max-w-[200rem] px-[clamp(1.5rem,3vw,6rem)] py-1 text-base text-muted-foreground">
          {p.dica && `${p.dica} · `}
          {p.fixa ? "H soltar barra" : "H fixar barra"} · T tela cheia
          {p.visoes.length > 1 && " · P painel · C comparar · L leituras"}
        </p>
      </div>
    </motion.header>
  )
}
