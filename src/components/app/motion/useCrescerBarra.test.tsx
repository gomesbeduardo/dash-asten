import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let reduzido = false
vi.mock("motion/react", async (orig) => ({
  ...(await orig<typeof import("motion/react")>()),
  useReducedMotion: () => reduzido,
}))

import { useCrescerBarra } from "./useCrescerBarra"

function Barra({ animar, atraso }: { animar: boolean; atraso: number }) {
  const ref = useCrescerBarra<HTMLSpanElement>(animar, atraso)
  return <span data-testid="b" ref={ref} />
}

let animate: ReturnType<typeof vi.fn>
let cancel: ReturnType<typeof vi.fn>
beforeEach(() => {
  reduzido = false
  cancel = vi.fn()
  animate = vi.fn(() => ({ cancel }))
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  })
})
afterEach(() => {
  // @ts-expect-error remove o stub do jsdom
  delete HTMLElement.prototype.animate
})

describe("useCrescerBarra", () => {
  it("anima uma vez na montagem", () => {
    render(<Barra animar atraso={0} />)
    expect(animate).toHaveBeenCalledTimes(1)
  })

  it("re-renderizar com outro atraso não cancela nem refaz a entrada de um elemento já montado", () => {
    const { rerender } = render(<Barra animar atraso={0} />)
    rerender(<Barra animar atraso={0.24} />)
    rerender(<Barra animar atraso={0.4} />)
    expect(animate).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()
  })

  it("sem animar, ou com movimento reduzido, a barra não anima", () => {
    render(<Barra animar={false} atraso={0} />)
    reduzido = true
    render(<Barra animar atraso={0} />)
    expect(animate).not.toHaveBeenCalled()
  })
})
