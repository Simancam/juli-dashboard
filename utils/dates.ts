import type { DateRange } from "@/types/sales"

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const PERIOD_IN_FILE_PATTERN =
  /(\d{1,2})[_-](\d{1,2})[_-](\d{4})[\s_-]+AL[\s_-]+(\d{1,2})[_-](\d{1,2})[_-](\d{4})/i

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30)

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value)

  if (!match) {
    return false
  }

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  )
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const iso = `${year}-${pad(month)}-${pad(day)}`

  return isIsoDate(iso) ? iso : null
}

export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial)) {
    return null
  }

  const date = new Date(EXCEL_EPOCH_UTC + Math.floor(serial) * 86_400_000)

  return toIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
}

export function parseDateOnly(value: unknown): string | null {
  if (value instanceof Date) {
    return toIsoDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate()
    )
  }

  if (typeof value === "number") {
    return excelSerialToIsoDate(value)
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  if (isIsoDate(trimmed)) {
    return trimmed
  }

  const localMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)

  if (localMatch) {
    const [, day, month, year] = localMatch

    return toIsoDate(Number(year), Number(month), Number(day))
  }

  return null
}

export function parsePeriodFromFileName(fileName: string): DateRange | null {
  const match = PERIOD_IN_FILE_PATTERN.exec(fileName)

  if (!match) {
    return null
  }

  const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = match
  const start = toIsoDate(Number(startYear), Number(startMonth), Number(startDay))
  const end = toIsoDate(Number(endYear), Number(endMonth), Number(endDay))

  if (!start || !end) {
    return null
  }

  return { start, end }
}
