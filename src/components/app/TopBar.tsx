import type { Ref } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  FolderOpenIcon,
  HistoryIcon,
  LogOutIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import logo from "@/assets/asten-logo-fundo-claro.png"
import type { CargaMeta } from "@/cargas"
import type { GrupoCompetencia, Visao } from "@/app/navegacao"
import { loginEmUso } from "@/app/login-em-uso"
import { useSessao } from "@/app/sessao/SessaoContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CompetenciaSelector } from "./CompetenciaSelector"
import { duration, standard } from "./motion/tokens"

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
            onAbrir={p.onAbrir}
            onOpenChange={p.onSelectorOpenChange}
          />
        </div>

        <nav aria-label="Visões" className="min-w-0 flex-1">
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
                    "shrink-0 border-b-4 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring",
                    active
                      ? "border-brand font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {ROTULO_VISAO[v]}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="default"
            size="lg"
            onClick={p.onNovaCarga}
          >
            <FolderOpenIcon aria-hidden /> Nova carga
          </Button>
          <Button variant="outline" size="lg" onClick={p.onHistorico}>
            <HistoryIcon aria-hidden /> Histórico
          </Button>
          <Button variant="ghost" size="lg" onClick={p.onClear}>
            {p.podeApagar ? (
              <Trash2Icon aria-hidden />
            ) : (
              <XIcon aria-hidden />
            )}{" "}
            {p.podeApagar ? "Limpar" : "Fechar carga"}
          </Button>
          {loginEmUso() && (
            <Button variant="ghost" size="lg" onClick={() => void sair()}>
              <LogOutIcon aria-hidden /> Sair
            </Button>
          )}
        </div>
      </div>
      <div ref={onSlot} />
      <p className="border-t px-6 py-1 text-sm text-muted-foreground">
        {p.dica && `${p.dica} · `}{p.fixa ? "H soltar barra" : "H fixar barra"}
        {p.visoes.length > 1 && " · P painel · L leituras · C comparar · E evolução"}
      </p>
    </motion.header>
  )
}
