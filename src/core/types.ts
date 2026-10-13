export type ColumnType = "text" | "number" | "date" | "empty"
export type CellValue = string | number | Date | null
export type Row = Record<string, CellValue>
export type Column = { key: string; label: string; type: ColumnType; filterable: boolean; distinctCount: number }
export type Sheet = { id: string; name: string; index: number; columns: Column[]; rows: Row[] }
export type Workbook = { fileName: string; importedAt: Date; sheets: Sheet[] }
export type ColumnFilter = { kind: "values"; values: string[] } | { kind: "dateRange"; from: string | null; to: string | null } // datas ISO YYYY-MM-DD
export type SheetFilters = Record<string, ColumnFilter> // chave = Column.key
