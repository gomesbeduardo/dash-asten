import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Columns3Icon,
} from "lucide-react"

import { formatCell, type CellValue, type Row, type Sheet } from "@/core"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 50

// Vazios vão sempre para o fim; datas, números e textos comparam entre si.
function compareCells(a: CellValue, b: CellValue): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true })
}

/** Visão genérica (D22): qualquer aba vira uma tabela. Células sempre como texto. */
export function GenericTable({ sheet, rows }: { sheet: Sheet; rows: Row[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      sheet.columns.map((col) => ({
        id: col.key,
        header: col.label,
        accessorFn: (row) => row[col.key] ?? null,
        cell: (ctx) => formatCell(ctx.getValue() as CellValue, col.type),
        sortingFn: (a, b, id) =>
          compareCells(
            a.getValue(id) as CellValue,
            b.getValue(id) as CellValue
          ),
        sortUndefined: "last",
        sortDescFirst: false,
        meta: { numeric: col.type === "number" },
      })),
    [sheet.columns]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  })

  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex

  return (
    <section
      aria-label={`Tabela da aba ${sheet.name}`}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-xl font-semibold text-primary tabular-nums">
          {rows.length === 1 ? "1 linha" : `${rows.length} linhas`}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg">
              <Columns3Icon aria-hidden /> Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-96 min-w-56 overflow-y-auto"
          >
            {table.getAllLeafColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                disabled={
                  column.getIsVisible() &&
                  table.getVisibleLeafColumns().length === 1
                }
                onCheckedChange={(v) => column.toggleVisibility(!!v)}
                onSelect={(e) => e.preventDefault()}
              >
                {String(column.columnDef.header)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Table className="text-base">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow
              key={group.id}
              className="border-b-2 border-primary/30 hover:bg-transparent"
            >
              {group.headers.map((header) => {
                const numeric = (
                  header.column.columnDef.meta as { numeric?: boolean }
                ).numeric
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : "none"
                    }
                    className={cn(
                      "h-auto p-0 text-primary",
                      numeric && "text-right"
                    )}
                  >
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "flex w-full items-center gap-1.5 px-3 py-3 font-display text-base font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
                        numeric && "flex-row-reverse"
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {sorted === "asc" ? (
                        <ArrowUpIcon className="size-4" aria-hidden />
                      ) : sorted === "desc" ? (
                        <ArrowDownIcon className="size-4" aria-hidden />
                      ) : (
                        <ArrowUpDownIcon
                          className="size-4 opacity-40"
                          aria-hidden
                        />
                      )}
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                className="py-10 text-center text-muted-foreground"
              >
                Nenhuma linha com os filtros atuais.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const numeric = (
                    cell.column.columnDef.meta as { numeric?: boolean }
                  ).numeric
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-3 py-3 whitespace-normal",
                        numeric && "text-right font-display tabular-nums"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pageCount > 1 && (
        <nav
          aria-label="Paginação"
          className="flex items-center justify-end gap-3"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <span className="tabular-nums">
            Página {pageIndex + 1} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="lg"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próxima
          </Button>
        </nav>
      )}
    </section>
  )
}
