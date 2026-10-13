import { REFERENCE_DATE, STATUSES, AREAS, type ProjectRow, type Status } from "@/data/mock"
import type { Chip } from "@/lib/indicators"

export type ProjectFilters = {
  areas: string[]
  status: string[]
  responsaveis: string[]
  soAtrasados: boolean
}

export const defaultProjectFilters: ProjectFilters = {
  areas: [],
  status: [],
  responsaveis: [],
  soAtrasados: false,
}

export const isLate = (p: ProjectRow): boolean => p.status !== "Concluído" && p.prazo < REFERENCE_DATE

export function daysLate(p: ProjectRow): number {
  const a = Date.parse(REFERENCE_DATE + "T00:00:00Z")
  const b = Date.parse(p.prazo + "T00:00:00Z")
  return Math.round((a - b) / 86400000)
}

export function filterProjects(rows: ProjectRow[], f: ProjectFilters): ProjectRow[] {
  return rows.filter(
    (p) =>
      (f.areas.length === 0 || f.areas.includes(p.area)) &&
      (f.status.length === 0 || f.status.includes(p.status)) &&
      (f.responsaveis.length === 0 || f.responsaveis.includes(p.responsavel)) &&
      (!f.soAtrasados || isLate(p))
  )
}

export function projectChips(f: ProjectFilters): Chip[] {
  const chips: Chip[] = []
  f.areas.forEach((a) => chips.push({ id: `area:${a}`, group: "Área", label: a }))
  f.status.forEach((a) => chips.push({ id: `status:${a}`, group: "Status", label: a }))
  f.responsaveis.forEach((a) => chips.push({ id: `resp:${a}`, group: "Responsável", label: a }))
  if (f.soAtrasados) chips.push({ id: "late", group: "Prazo", label: "Só atrasados" })
  return chips
}

export function removeProjectChip(f: ProjectFilters, id: string): ProjectFilters {
  if (id === "late") return { ...f, soAtrasados: false }
  const [kind, ...rest] = id.split(":")
  const v = rest.join(":")
  if (kind === "area") return { ...f, areas: f.areas.filter((x) => x !== v) }
  if (kind === "status") return { ...f, status: f.status.filter((x) => x !== v) }
  return { ...f, responsaveis: f.responsaveis.filter((x) => x !== v) }
}

export type ProjectKpis = {
  total: number
  ativos: number
  atrasados: number
  mediaConclusao: number | null
  concluidos30d: number
}

export function projectKpis(rows: ProjectRow[]): ProjectKpis {
  const limit = new Date(REFERENCE_DATE + "T00:00:00Z")
  limit.setUTCDate(limit.getUTCDate() - 30)
  const lim = limit.toISOString().slice(0, 10)
  const vals = rows.flatMap((p) => (p.conclusao === null ? [] : [p.conclusao]))
  return {
    total: rows.length,
    ativos: rows.filter((p) => p.status === "Em andamento").length,
    atrasados: rows.filter(isLate).length,
    mediaConclusao: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    concluidos30d: rows.filter((p) => p.status === "Concluído" && p.concluidoEm !== null && p.concluidoEm >= lim).length,
  }
}

export type StatusByArea = { area: string } & Record<Status, number>

export function statusByArea(rows: ProjectRow[]): StatusByArea[] {
  return AREAS.filter((a) => rows.some((p) => p.area === a)).map((area) => {
    const base = { area } as StatusByArea
    STATUSES.forEach((s) => (base[s] = rows.filter((p) => p.area === area && p.status === s).length))
    return base
  })
}

export function lateProjects(rows: ProjectRow[]): ProjectRow[] {
  return rows.filter(isLate).sort((a, b) => daysLate(b) - daysLate(a))
}
