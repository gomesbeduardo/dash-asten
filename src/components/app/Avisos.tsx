import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { duration, standard } from "@/components/app/motion/tokens"

export type AvisoItem = {
  id: string
  /** Classes extras do item (ex.: layout com botão de fechar). */
  className?: string
  conteudo: ReactNode
}

const BASE =
  "rounded-md border bg-card px-4 py-2 text-base shadow-md"

/** Pilha fixa no canto inferior esquerdo: avisos simultâneos ficam um sobre o outro sem sobrepor. */
export function Avisos({ itens }: { itens: AvisoItem[] }) {
  return (
    <div
      data-testid="pilha-avisos"
      className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {itens.map((i) => (
          <motion.p
            key={i.id}
            role="status"
            className={cn("pointer-events-auto", BASE, i.className)}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: duration.fast, ease: standard },
            }}
            exit={{ opacity: 0, transition: { duration: 0.1, ease: standard } }}
          >
            {i.conteudo}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  )
}
