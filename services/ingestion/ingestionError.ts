export class IngestionError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(message: string, status = 400, details: string[] = []) {
    super(message)
    this.name = "IngestionError"
    this.status = status
    this.details = details
  }
}
