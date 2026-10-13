import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, CheckCircle2, CircleCheckBig, Gauge, PlayCircle } from "lucide-react"
import { AREAS, REFERENCE_DATE, STATUSES, type ProjectRow } from "@/data/mock"
import {
  daysLate,
  defaultProjectFilters,
  filterProjects,
  isLate,
  lateProjects,
  projectChips,
  projectKpis,
  removeProjectChip,
  statusByArea,
} from "@/lib/projects"
import { fmtDate, fmtPct } from "@/lib/format"
import { Toggle } from "@/components/ui/toggle"
import type { ProjectsViewProps } from "../shared/contracts"
import { FilterBar } from "../shared/FilterBar"
import { MultiSelectFilter } from "../shared/MultiSelectFilter"
import { ChartCard } from "../shared/ChartCard"
import { KpiCard } from "../shared/KpiCard"
import { DataTable } from "../shared/DataTable"
import { StatusByAreaChart } from "./StatusByAreaChart"
import { LateProjectsList } from "./LateProjectsList"
import { StatusBadge } from "./status"

const columns: ColumnDef<ProjectRow, unknown>[] = [
  { id: "nome", header: "Nome", accessorKey: "nome" },
  { id: "area", header: "Área", accessorKey: "area" },
  { id: "responsavel", header: "Responsável", accessorKey: "responsavel" },
  { id: "status", header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "inicio", header: "Início", accessorKey: "inicio", cell: ({ row }) => fmtDate(row.original.inicio) },
  { id: "prazo", header: "Prazo", accessorKey: "prazo", cell: ({ row }) => fmtDate(row.original.prazo) },
  {
    id: "conclusao",
    header: "% Conclusão",
    accessorFn: (r) => r.conclusao ?? -1,
    cell: ({ row }) => <span className="num">{fmtPct(row.original.conclusao)}</span>,
  },
  {
    id: "situacao",
    header: "Situação",
    accessorFn: (r) => (isLate(r) ? daysLate(r) : 0),
    cell: ({ row }) => {
      const p = row.original
      if (p.status === "Concluído") return <span className="inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="size-4" />Concluído</span>
      if (isLate(p)) {
        const n = daysLate(p)
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--late)]">
            <AlertTriangle aria-hidden className="size-4" />
            Atrasado {n} {n === 1 ? "dia" : "dias"}
          </span>
        )
      }
      return <span>No prazo</span>
    },
  },
]

export function ProjectsView({ rows, filters, onFiltersChange }: ProjectsViewProps) {
  const filtered = useMemo(() => filterProjects(rows, filters), [rows, filters])
  const kpis = useMemo(() => projectKpis(filtered), [filtered])
  const byArea = useMemo(() => statusByArea(filtered), [filtered])
  const late = useMemo(() => lateProjects(filtered), [filtered])
  const responsaveis = useMemo(
    () => Array.from(new Set(rows.map((r) => r.responsavel))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows]
  )
  const set = (patch: Partial<typeof filters>) => onFiltersChange({ ...filters, ...patch })
  const empty = filtered.length === 0

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        chips={projectChips(filters)}
        onRemoveChip={(id) => onFiltersChange(removeProjectChip(filters, id))}
        onClear={() => onFiltersChange(defaultProjectFilters)}
      >
        <MultiSelectFilter label="Área" options={AREAS} value={filters.areas} onChange={(areas) => set({ areas })} />
        <MultiSelectFilter label="Status" options={STATUSES} value={filters.status} onChange={(status) => set({ status })} />
        <MultiSelectFilter label="Responsável" options={responsaveis} value={filters.responsaveis} onChange={(r) => set({ responsaveis: r })} />
        <Toggle
          variant="outline"
          pressed={filters.soAtrasados}
          onPressedChange={(soAtrasados) => set({ soAtrasados })}
          className="h-9 gap-2 px-3 text-sm"
        >
          <AlertTriangle aria-hidden />
          Só atrasados
        </Toggle>
      </FilterBar>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Em andamento" value={String(kpis.ativos)} hint={`de ${kpis.total} projetos`} icon={<PlayCircle aria-hidden />} />
        <KpiCard label="Atrasados" value={String(kpis.atrasados)} hint="prazo vencido, não concluídos" tone="bad" icon={<AlertTriangle aria-hidden />} />
        <KpiCard label="Conclusão média" value={fmtPct(kpis.mediaConclusao)} hint="% médio dos projetos" icon={<Gauge aria-hidden />} />
        <KpiCard label="Concluídos em 30 dias" value={String(kpis.concluidos30d)} hint="até 13/10/2026" icon={<CircleCheckBig aria-hidden />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartCard
          title="Projetos por status e área"
          subtitle="Nº de projetos · referência 13/10/2026"
          isEmpty={empty}
          dataView={
            <table className="w-full text-sm">
              <caption className="sr-only">Nº de projetos por área e status</caption>
              <thead>
                <tr>
                  <th scope="col" className="p-2 text-left">Área</th>
                  {STATUSES.map((s) => <th key={s} scope="col" className="p-2 text-right">{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {byArea.map((r) => (
                  <tr key={r.area} className="border-t">
                    <th scope="row" className="p-2 text-left font-medium">{r.area}</th>
                    {STATUSES.map((s) => <td key={s} className="num p-2 text-right">{r[s]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <StatusByAreaChart data={byArea} />
        </ChartCard>

        <ChartCard
          title="Projetos atrasados"
          subtitle={`Dias de atraso · referência ${fmtDate(REFERENCE_DATE)}`}
          isEmpty={late.length === 0}
          dataView={
            <p className="text-sm">
              {late.length} projetos atrasados.{" "}
              {late.length > 0 && `O mais crítico é "${late[0].nome}" (${late[0].area}), com ${daysLate(late[0])} dias de atraso e ${fmtPct(late[0].conclusao)} concluído.`}
            </p>
          }
        >
          <LateProjectsList late={late} />
        </ChartCard>
      </div>

      <div id="projetos-tabela">
        <DataTable
          caption="Detalhe dos projetos"
          data={filtered}
          columns={columns}
          initialHidden={["inicio"]}
          pageSize={10}
        />
      </div>
    </div>
  )
}
