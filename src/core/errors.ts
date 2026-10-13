export type WorkbookErrorCode = "not-xlsx" | "empty"

export class WorkbookError extends Error {
  code: WorkbookErrorCode
  constructor(code: WorkbookErrorCode, message: string) {
    super(message)
    this.name = "WorkbookError"
    this.code = code
  }
}
