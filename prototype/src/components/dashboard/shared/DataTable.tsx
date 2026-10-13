// STUB — implementado pela fatia "shell + shared".
import type { DataTableProps } from "./contracts"

export function DataTable<T>({ caption, data }: DataTableProps<T>) {
  return (
    <p>
      {caption} ({data.length})
    </p>
  )
}
