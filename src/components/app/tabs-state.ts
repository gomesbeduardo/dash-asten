// Lógica pura de abas visíveis/ocultas (D7). `hidden` guarda ids de abas ocultas.

export const visibleIds = (all: string[], hidden: string[]): string[] =>
  all.filter((id) => !hidden.includes(id))

/** Oculta uma aba, exceto se for a última visível. */
export function hideSheet(
  all: string[],
  hidden: string[],
  id: string
): string[] {
  if (hidden.includes(id)) return hidden
  const remaining = visibleIds(all, [...hidden, id])
  return remaining.length === 0 ? hidden : [...hidden, id]
}

export const showSheet = (hidden: string[], id: string): string[] =>
  hidden.filter((h) => h !== id)

/** Se a aba ativa está oculta, cai na primeira visível. */
export function resolveActive(
  all: string[],
  hidden: string[],
  active: string
): string {
  const visible = visibleIds(all, hidden)
  return visible.includes(active) ? active : (visible[0] ?? active)
}

/** Próxima/anterior entre as visíveis, de forma circular. */
export function stepSheet(
  visible: string[],
  active: string,
  dir: 1 | -1
): string {
  if (visible.length === 0) return active
  const i = visible.indexOf(active)
  if (i === -1) return visible[0]
  return visible[(i + dir + visible.length) % visible.length]
}
