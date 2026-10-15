import type { Competencia } from "./types"

/**
 * Extrator puro de mês/data em texto livre (nome de aba, de arquivo, título,
 * célula). Ignora acento e maiúscula e aceita separadores `- _ . /`, espaço,
 * "de" ou nada. Reconhece nome do mês pt-BR e inglês (completo e abreviado),
 * número + ano e datas completas. Números soltos (v2, 123456, 1307) não contam.
 */

const NOMES: [string, number][] = [
  ["janeiro", 1],
  ["january", 1],
  ["jan", 1],
  ["fevereiro", 2],
  ["february", 2],
  ["fev", 2],
  ["feb", 2],
  ["marco", 3],
  ["march", 3],
  ["mar", 3],
  ["abril", 4],
  ["april", 4],
  ["abr", 4],
  ["apr", 4],
  ["maio", 5],
  ["may", 5],
  ["mai", 5],
  ["junho", 6],
  ["june", 6],
  ["jun", 6],
  ["julho", 7],
  ["july", 7],
  ["jul", 7],
  ["agosto", 8],
  ["august", 8],
  ["ago", 8],
  ["aug", 8],
  ["setembro", 9],
  ["september", 9],
  ["sept", 9],
  ["sep", 9],
  ["set", 9],
  ["outubro", 10],
  ["october", 10],
  ["out", 10],
  ["oct", 10],
  ["novembro", 11],
  ["november", 11],
  ["nov", 11],
  ["dezembro", 12],
  ["december", 12],
  ["dez", 12],
  ["dec", 12],
]
const MES_POR_NOME = new Map(NOMES)
const RE_NOME = new RegExp(
  `(?<![a-z])(${NOMES.map(([n]) => n).join("|")})(?![a-z])`,
  "g"
)
const SEP = "[\\s\\-_./,]"

type Achado = { ano?: number; mes: number; dia?: number }

const pad = (n: number) => String(n).padStart(2, "0")
const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const mesValido = (m: number) => m >= 1 && m <= 12

/** Ano de 2 dígitos plausível (2020 até o ano que vem), ou null. */
function ano2(yy: string, hoje: Date): number | null {
  const a = 2000 + Number(yy)
  return a >= 2020 && a <= hoje.getUTCFullYear() + 1 ? a : null
}

function numerico(s: string, hoje: Date): Achado | null {
  // AAAA-MM-DD
  let m = s.match(/(?<!\d)(20\d{2})[-_./](\d{1,2})[-_./](\d{1,2})(?!\d)/)
  if (m && mesValido(Number(m[2])))
    return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) }
  // AAAAMMDD
  m = s.match(/(?<!\d)(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/)
  if (m) return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) }
  // AAAA-MM, AAAA_MM, AAAA MM, AAAAMM, AAAA/M
  m = s.match(
    /(?<!\d)(20\d{2})(?:[-_./ ](0?[1-9]|1[0-2])|(0[1-9]|1[0-2]))(?!\d)/
  )
  if (m) return { ano: Number(m[1]), mes: Number(m[2] ?? m[3]) }
  // DD/MM/AAAA, DD-MM-AA, MM/DD/AAAA (dd/mm por padrão; 2º número > 12 vira mm/dd)
  const re = /(?<!\d)(\d{1,2})[-_./](\d{1,2})[-_./](\d{4}|\d{2})(?!\d)/g
  for (const x of s.matchAll(re)) {
    const a = Number(x[1])
    const b = Number(x[2])
    const ano =
      x[3].length === 4
        ? x[3].startsWith("20")
          ? Number(x[3])
          : null
        : 2000 + Number(x[3]) <= hoje.getUTCFullYear() + 1
          ? 2000 + Number(x[3])
          : null
    if (ano === null) continue
    let dia = a
    let mes = b
    if (a > 12) {
      dia = a
      mes = b
    } else if (b > 12) {
      dia = b
      mes = a
    }
    if (mesValido(mes) && dia >= 1 && dia <= 31) return { ano, mes, dia }
  }
  // MM-AAAA, M/AAAA
  m = s.match(/(?<!\d)(0?[1-9]|1[0-2])[-_./ ](20\d{2})(?!\d)/)
  if (m) return { ano: Number(m[2]), mes: Number(m[1]) }
  // MM.AA (ano de 2 dígitos só com separador)
  m = s.match(/(?<!\d)(0?[1-9]|1[0-2])[-_./](\d{2})(?!\d)/)
  if (m) {
    const ano = ano2(m[2], hoje)
    if (ano) return { ano, mes: Number(m[1]) }
  }
  return null
}

function porNome(s: string, hoje: Date): Achado | null {
  let semAno: Achado | null = null
  for (const m of s.matchAll(RE_NOME)) {
    const mes = MES_POR_NOME.get(m[1])!
    const i = m.index!
    const antes = s.slice(0, i)
    const depois = s.slice(i + m[1].length)
    const dia = () => {
      const d = antes.match(new RegExp(`(?<!\\d)(\\d{1,2})${SEP}*(?:de\\s+)?$`))
      return d ? Number(d[1]) : undefined
    }
    // set 30, 2026 / set-30-2026
    const a = depois.match(
      new RegExp(
        `^${SEP}*(?:de\\s+)?(\\d{1,2})(?:st|nd|rd|th)?${SEP}+(?:de\\s+)?(20\\d{2})(?!\\d)`
      )
    )
    if (a) return { ano: Number(a[2]), mes, dia: Number(a[1]) }
    // set 2026 / set-2026 / set2026 / 30set2026
    const b = depois.match(new RegExp(`^${SEP}*(?:de\\s+)?(20\\d{2})(?!\\d)`))
    if (b) return { ano: Number(b[1]), mes, dia: dia() }
    // 2026 set / 2026-set
    const c = antes.match(new RegExp(`(?<!\\d)(20\\d{2})${SEP}*(?:de\\s+)?$`))
    if (c) return { ano: Number(c[1]), mes }
    // set26 / set/26 / set 26
    const d = depois.match(new RegExp(`^${SEP}*(?:de\\s+)?(\\d{2})(?!\\d)`))
    const dAno = d ? ano2(d[1], hoje) : null
    if (dAno) return { ano: dAno, mes }
    // 26-set (só com - _ . /, para não confundir com o dia em "26 set")
    const e = antes.match(/(?<!\d)(\d{2})[-_./]$/)
    const eAno = e ? ano2(e[1], hoje) : null
    if (eAno) return { ano: eAno, mes }
    semAno ??= { mes, dia: dia() }
  }
  return semAno
}

function analisar(texto: string, hoje: Date): Achado | null {
  const s = normalizar(texto)
  return numerico(s, hoje) ?? porNome(s, hoje)
}

/** Como `mesEmTexto`, mas informa se o ano veio do próprio texto (`temAno`) ou foi presumido pelo relógio. */
export function mesEmTextoComAno(
  texto: string,
  hoje: Date
): { competencia: Competencia; temAno: boolean } | null {
  const r = analisar(texto, hoje)
  if (!r) return null
  const ano =
    r.ano ??
    (r.mes <= hoje.getUTCMonth() + 1
      ? hoje.getUTCFullYear()
      : hoje.getUTCFullYear() - 1)
  return { competencia: `${ano}-${pad(r.mes)}`, temAno: r.ano !== undefined }
}

/** Competência "AAAA-MM" citada no texto, ou null. Sem ano, vale o ano mais recente em que o mês já passou. */
export function mesEmTexto(texto: string, hoje: Date): Competencia | null {
  return mesEmTextoComAno(texto, hoje)?.competencia ?? null
}

/** Data completa (dia, mês e ano) no texto, em UTC, ou null. */
export function dataEmTexto(texto: string, hoje: Date): Date | null {
  const r = analisar(texto, hoje)
  if (!r || r.ano === undefined || r.dia === undefined) return null
  const d = new Date(Date.UTC(r.ano, r.mes - 1, r.dia))
  return d.getUTCMonth() === r.mes - 1 && d.getUTCDate() === r.dia ? d : null
}
