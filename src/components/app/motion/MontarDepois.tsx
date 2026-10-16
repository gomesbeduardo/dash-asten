import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import type { ReactNode } from "react"

// Fila única: os blocos adiados montam um por vez, cada um só depois de o anterior
// ter sido pintado (senão vários montariam no mesmo quadro e a tarefa longa voltaria).
const fila: (() => void)[] = []
let ocupada = false
const proxima = () => {
  const montar = fila.shift()
  if (montar) montar()
  else ocupada = false
}
/** Espera o quadro pintar e roda a próxima montagem numa tarefa nova. */
const agendarProxima = () =>
  requestAnimationFrame(() => {
    window.setTimeout(proxima, 0)
  })
/** Só para testes: zera a fila entre um teste e outro. */
export const reiniciarFilaMontagem = () => {
  fila.length = 0
  ocupada = false
}
const entrar = (montar: () => void) => {
  fila.push(montar)
  if (ocupada) return
  ocupada = true
  agendarProxima()
}

/**
 * Monta os filhos só depois do 1º quadro: mostra `reservado` (esqueleto com a
 * altura aproximada, sem pulo de layout) e troca numa tarefa seguinte, num
 * render interrompível. Com `aoVisivel`, espera chegar perto da tela (ou o
 * `limite` em ms, para nada ficar sem montar). Depois de montado, não deixa
 * nenhum elemento próprio: o layout é o dos filhos.
 */
export function MontarDepois({
  reservado,
  children,
  aoVisivel = false,
  limite = 1500,
}: {
  reservado: ReactNode
  children: ReactNode
  aoVisivel?: boolean
  limite?: number
}) {
  const [pronto, setPronto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const naFila = useRef(false)
  const prontoRef = useRef(false)
  useLayoutEffect(() => {
    prontoRef.current = pronto
  }, [pronto])
  useEffect(() => {
    if (pronto) return
    let lim = 0
    let io: IntersectionObserver | undefined
    let estado: "espera" | "fila" | "andando" = "espera"
    const montar = () => {
      estado = "andando"
      startTransition(() => setPronto(true))
    }
    const entrarNaFila = () => {
      io?.disconnect()
      clearTimeout(lim)
      if (estado !== "espera") return
      estado = "fila"
      naFila.current = true
      entrar(montar)
    }
    if (
      aoVisivel &&
      ref.current &&
      typeof IntersectionObserver !== "undefined"
    ) {
      io = new IntersectionObserver(
        (es) => {
          if (es.some((e) => e.isIntersecting)) entrarNaFila()
        },
        { rootMargin: "400px" }
      )
      io.observe(ref.current)
      lim = window.setTimeout(entrarNaFila, limite)
    } else entrarNaFila()
    return () => {
      io?.disconnect()
      clearTimeout(lim)
      if (estado === "fila") fila.splice(fila.indexOf(montar), 1)
      // saiu no meio da vez: libera a fila para o próximo
      else if (estado === "andando" && !prontoRef.current) agendarProxima()
    }
  }, [pronto, aoVisivel, limite])
  // Pintado: libera o próximo da fila.
  useEffect(() => {
    if (!pronto || !naFila.current) return
    naFila.current = false
    agendarProxima()
  }, [pronto])
  if (pronto) return <>{children}</>
  return <div ref={ref}>{reservado}</div>
}
