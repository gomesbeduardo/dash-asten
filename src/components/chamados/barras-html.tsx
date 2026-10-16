/** Barras de cruzamento (empilhadas ou simples) em HTML/CSS: acompanham a tipografia fluida e o Mes Ref. ao lado do mês escolhido. */
import { cn } from "@/lib/utils"
import { GRADE_HTML, gradienteBarra, SOMBRA_BARRA } from "./barra-estilo"

export type Segmento = {
  id: string
  rotulo: string
  valor: number
  cor: string
  /** Cor clara: o valor escrito dentro usa texto escuro. */
  claro?: boolean
}
/** Uma barra: segmentos empilhados e o texto do valor na ponta. `segmentos` vazio = sem valor ("—"). */
export type Celula = { segmentos: Segmento[]; texto: string }
/** Uma linha de uma categoria: um mês, com uma célula por coluna. */
export type LinhaMes = { mes: string; destaque: boolean; celulas: Celula[] }
export type GrupoBarras = { rotulo: string; linhas: LinhaMes[] }
export type ColunaBarras = {
  titulo?: string
  /** Valor que enche a trilha (a mesma escala em todas as linhas da coluna). */
  maximo: number
}

/** Legenda neutra: marcador de cor e nome, sem cara de botão. */
export function LegendaCores({
  itens,
}: {
  itens: { id: string; rotulo: string; cor: string }[]
}) {
  if (itens.length === 0) return null
  return (
    <ul
      aria-label="Legenda das cores"
      className="flex flex-wrap gap-x-5 gap-y-1"
    >
      {itens.map((i) => (
        <li
          key={i.id}
          className="flex items-center gap-2 text-base text-muted-foreground"
        >
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-sm"
            style={{ backgroundColor: i.cor }}
          />
          {i.rotulo}
        </li>
      ))}
    </ul>
  )
}

function Barra({ celula, maximo }: { celula: Celula; maximo: number }) {
  const total = celula.segmentos.reduce((s, x) => s + x.valor, 0)
  // 20% de folga na trilha para o texto da ponta
  const pct = maximo > 0 ? (total / (maximo * 1.2)) * 100 : 0
  return (
    <div
      className="flex min-w-0 items-center gap-2"
      style={{ background: GRADE_HTML }}
    >
      {celula.segmentos.length > 0 && total > 0 ? (
        <div
          className="flex h-[1.4rem] min-w-0.5 gap-0.5 overflow-hidden rounded-r-[4px]"
          style={{ width: `${pct}%`, boxShadow: SOMBRA_BARRA }}
        >
          {celula.segmentos
            .filter((s) => s.valor > 0)
            .map((s) => {
              const cabe = maximo > 0 && s.valor / (maximo * 1.2) >= 0.05
              return (
                <div
                  key={s.id}
                  title={`${s.rotulo}: ${s.valor}`}
                  className={cn(
                    "num flex items-center justify-center text-base font-semibold",
                    s.claro ? "text-foreground" : "text-primary-foreground"
                  )}
                  style={{
                    flexGrow: s.valor,
                    flexBasis: 0,
                    // pilha: segmentos de cor lisa; barra de um segmento só leva o gradiente
                    background:
                      celula.segmentos.filter((x) => x.valor > 0).length > 1
                        ? s.cor
                        : gradienteBarra(s.cor),
                  }}
                >
                  {cabe && <span aria-hidden>{s.valor}</span>}
                </div>
              )
            })}
        </div>
      ) : null}
      <span className="num shrink-0 text-base font-semibold text-foreground">
        {celula.texto}
      </span>
    </div>
  )
}

export function BarrasHtml({
  grupos,
  colunas,
  descricao,
}: {
  grupos: GrupoBarras[]
  colunas: ColunaBarras[]
  /** Texto do `aria-label` do gráfico (os dados em palavras). */
  descricao: string
}) {
  const comMes = grupos.some((g) => g.linhas.length > 1 || g.linhas[0]?.mes)
  const grade = `${comMes ? "4rem " : ""}${colunas.map(() => "minmax(0,1fr)").join(" ")}`
  const cabecalho = colunas.some((c) => c.titulo)
  return (
    <div
      role="img"
      aria-label={descricao}
      className="flex min-h-0 flex-1 flex-col justify-between"
    >
      {cabecalho && (
        <div className="flex gap-3 pb-1" aria-hidden>
          <span className="w-[clamp(7rem,26%,12rem)] shrink-0" />
          <div
            className="grid min-w-0 flex-1 gap-3 text-base font-medium text-muted-foreground"
            style={{ gridTemplateColumns: grade }}
          >
            {comMes && <span />}
            {colunas.map((c, i) => (
              <span key={i}>{c.titulo}</span>
            ))}
          </div>
        </div>
      )}
      {grupos.map((g) => (
        <div key={g.rotulo} className="flex flex-1 items-center gap-3 py-3">
          <span
            className="w-[clamp(7rem,26%,12rem)] shrink-0 truncate text-lg font-medium text-foreground"
            title={g.rotulo}
          >
            {g.rotulo}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2" aria-hidden>
            {g.linhas.map((l) => (
              <div
                key={l.mes}
                className="grid items-center gap-3"
                style={{ gridTemplateColumns: grade }}
              >
                {comMes && (
                  <span
                    className={cn(
                      "num text-base",
                      l.destaque
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {l.mes}
                  </span>
                )}
                {l.celulas.map((c, i) => (
                  <Barra key={i} celula={c} maximo={colunas[i].maximo} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
