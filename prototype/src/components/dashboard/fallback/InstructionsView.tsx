import type { ColumnDef } from "@tanstack/react-table"
import { Info } from "lucide-react"
import { INSTRUCTION_ROWS } from "@/data/mock"
import { DataTable } from "../shared/DataTable"

type Row = (typeof INSTRUCTION_ROWS)[number]

const columns: ColumnDef<Row, string>[] = [
  { accessorKey: "passo", header: "Passo" },
  { accessorKey: "orientacao", header: "Orientação" },
  { accessorKey: "responsavel", header: "Responsável" },
]

export function InstructionsView() {
  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex items-start gap-3 rounded-xl border bg-card p-4 text-base">
        <Info className="mt-0.5 size-5 shrink-0 text-brand-ink" aria-hidden />
        <div>
          <p className="font-semibold">Esta aba não tem layout definido</p>
          <p className="text-muted-foreground">Mostramos o conteúdo como tabela, sem gráficos nem indicadores.</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <DataTable caption="Conteúdo da aba Instruções" data={[...INSTRUCTION_ROWS]} columns={columns} />
      </div>
    </div>
  )
}
