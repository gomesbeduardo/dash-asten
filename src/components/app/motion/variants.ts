import type { Variants } from "motion/react"
import { duration, rise, stagger, standard } from "./tokens"

/** Contêiner da entrada única: escalona os filhos em ~110 ms. */
export const entryContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
}

/** Filho da entrada: sobe 10 px + fade. Só transform e opacity. */
export const entryItem: Variants = {
  hidden: { opacity: 0, y: rise },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: standard },
  },
}
