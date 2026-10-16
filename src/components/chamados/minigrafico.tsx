/** Minigráfico de tendência (6 meses): linha fina cinza e o ponto do mês atual na cor da série. */
const L = 160
const A = 32

export function Minigrafico({
  valores,
  cor,
  rotulos,
}: {
  valores: (number | null)[]
  cor: string
  /** Rótulos dos meses, para a descrição em palavras. */
  rotulos?: string[]
}) {
  const nums = valores.filter((v): v is number => v !== null)
  if (nums.length === 0) return null
  const max = Math.max(...nums)
  const min = Math.min(...nums)
  const x = (i: number) => 5 + (i / Math.max(1, valores.length - 1)) * (L - 10)
  const y = (v: number) => 5 + (1 - (v - min) / (max - min || 1)) * (A - 10)
  const trechos: [number, number][][] = []
  let atual: [number, number][] = []
  valores.forEach((v, i) => {
    if (v === null) {
      if (atual.length) trechos.push(atual)
      atual = []
    } else atual.push([x(i), y(v)])
  })
  if (atual.length) trechos.push(atual)
  const ultimo = valores.length - 1
  const vUltimo = valores[ultimo]
  const descricao = `Últimos meses: ${valores
    .map(
      (v, i) =>
        `${rotulos?.[i] ?? `mês ${i + 1}`} ${v === null ? "sem posição" : String(v).replace(".", ",")}`
    )
    .join(", ")}`
  return (
    <svg
      role="img"
      aria-label={descricao}
      viewBox={`0 0 ${L} ${A}`}
      preserveAspectRatio="xMinYMid meet"
      className="h-[2rem] w-[10rem] overflow-visible"
    >
      {trechos
        .filter((t) => t.length > 1)
        .map((t, k) => (
          <polyline
            key={k}
            points={t.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      {vUltimo !== null && (
        <circle cx={x(ultimo)} cy={y(vUltimo)} r={3.6} fill={cor} />
      )}
    </svg>
  )
}
