import { useEffect, useRef, useState } from "react"
import { animate, useReducedMotion } from "motion/react"

import type { ValueFormat } from "@/core"
import { countUp } from "./tokens"
import { emphasized } from "./tokens"
import { formatValue } from "./format"

/**
 * Número que conta do valor anterior ao novo (~1 s, emphasized). O texto final é
 * sempre o valor formatado; leitores de tela recebem só ele, no aria-label.
 * Com movimento reduzido, `display` ou valor nulo, renderiza direto o final.
 */
export function AnimatedNumber({
  value,
  format,
  display,
  fromZero = false,
  className,
}: {
  value: number | null
  format: ValueFormat
  display?: string
  fromZero?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const live = !reduce && value !== null && display === undefined
  const start = fromZero && live ? 0 : (value ?? 0)
  const current = useRef(start)
  const [shown, setShown] = useState(start)

  useEffect(() => {
    if (!live || value === null) return
    if (current.current === value) return
    const controls = animate(current.current, value, {
      duration: countUp,
      ease: emphasized,
      onUpdate: (v) => {
        current.current = v
        setShown(v)
      },
      onComplete: () => {
        current.current = value
        setShown(value)
      },
    })
    return () => controls.stop()
  }, [value, live])

  const final = display ?? formatValue(value, format)
  const text = live ? formatValue(shown, format) : final

  return (
    <span role="img" aria-label={final} aria-live="off" className={className}>
      {text}
    </span>
  )
}
