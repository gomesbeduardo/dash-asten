import type { Ref } from "react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
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
      <div className="flex items-center gap-4 px-6 py-2">
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

        <nav aria-label="Visões" className="min-w-0 flex-1">
          <LayoutGroup id="topbar-abas">
            <div role="tablist" className="flex gap-1">
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
                    {active && (
                      <motion.span
                        layoutId="topbar-aba-ativa"
                        data-testid="indicador-aba"
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-0 rounded-md border border-ring/50 bg-brand-soft shadow-sm"
                        transition={reduce ? { duration: 0 } : molaAba}
                      />
                    )}
                    <span className="relative z-10">{ROTULO_VISAO[v]}</span>
                  </button>
                )
              })}
            </div>
          </LayoutGroup>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
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
      </div>
      <div ref={onSlot} />
      <p className="border-t px-6 py-1 text-sm text-muted-foreground">
        {p.dica && `${p.dica} · `}
        {p.fixa ? "H soltar barra" : "H fixar barra"} · T tela cheia
        {p.visoes.length > 1 &&
          " · P painel · L leituras · C comparar · E evolução"}
      </p>
    </motion.header>
  )
}
