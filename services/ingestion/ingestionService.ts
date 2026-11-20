import { createHash } from "node:crypto"

import ExcelJS from "exceljs"

import {
  REQUIRED_SALES_COLUMNS,
  SALES_COLUMN_ALIASES,
  SALES_COLUMN_LABELS,
  type SalesColumnKey,
} from "@/lib/config/sales-columns"
import { resolveFamily } from "@/services/families/familyService"
import { IngestionError } from "@/services/ingestion/ingestionError"
import { parseDateOnly, parsePeriodFromFileName } from "@/utils/dates"
import { parseAmountToCents, parseNumberValue } from "@/utils/money"
import {
  normalizeClientKey,
  normalizeHeader,
  normalizeName,
  normalizeText,
  parseDocType,
} from "@/utils/normalizers"
import type {
  IngestionResult,
  MarginMismatch,
  QualityReport,
  RowError,
} from "@/types/datasets"
import type { SaleLineDraft } from "@/types/sales"

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_DATA_ROWS = 50_000

const FEE_NET_MISMATCH_RATIO = 0.05
const MAX_REPORT_ITEMS = 100

interface ParsedColumns {
  columns: Partial<Record<SalesColumnKey, number>>
  missing: string[]
}

function unwrapCellValue(value: unknown): unknown {
  if (value === null || value === undefined || value instanceof Date) {
    return value
  }

  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>

    if ("result" in candidate) {
      return candidate.result
    }

    if ("text" in candidate) {
      return candidate.text
    }

    if (Array.isArray(candidate.richText)) {
      return candidate.richText
        .map((part) =>
          typeof part === "object" && part !== null && "text" in part
            ? String((part as { text: unknown }).text)
            : ""
        )
        .join("")
    }
  }

  return value
}

function toText(value: unknown): string {
  const unwrapped = unwrapCellValue(value)

  if (unwrapped === null || unwrapped === undefined) {
    return ""
  }

  if (unwrapped instanceof Date) {
    return unwrapped.toISOString().slice(0, 10)
  }

  return String(unwrapped).trim()
}

function toIdentifier(value: unknown, minimumLength = 0): string {
  const text = toText(value)

  return text ? text.padStart(minimumLength, "0") : ""
}

function resolveSalesColumns(headers: string[]): ParsedColumns {
  const byHeader = new Map<string, number>()

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)

    if (normalized && !byHeader.has(normalized)) {
      byHeader.set(normalized, index)
    }
  })

  const columns: Partial<Record<SalesColumnKey, number>> = {}

  for (const [key, aliases] of Object.entries(SALES_COLUMN_ALIASES) as Array<
    [SalesColumnKey, readonly string[]]
  >) {
    for (const alias of aliases) {
      const index = byHeader.get(alias)

      if (index !== undefined) {
        columns[key] = index
        break
      }
    }
  }

  const missing = REQUIRED_SALES_COLUMNS.filter(
    (key) => columns[key] === undefined
  ).map((key) => SALES_COLUMN_LABELS[key])

  return { columns, missing }
}

function readCell(
  row: ExcelJS.Row,
  columns: Partial<Record<SalesColumnKey, number>>,
  key: SalesColumnKey
): unknown {
  const index = columns[key]

  return index === undefined ? null : row.getCell(index + 1).value
}

function findHeaderRow(sheet: ExcelJS.Worksheet): {
  rowNumber: number
  columns: Partial<Record<SalesColumnKey, number>>
} {
  const limit = Math.min(sheet.rowCount, 20)

  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const headers: string[] = []

    for (let column = 1; column <= sheet.columnCount; column += 1) {
      headers.push(toText(sheet.getRow(rowNumber).getCell(column).value))
    }

    const parsed = resolveSalesColumns(headers)

    if (parsed.columns.documentNumber !== undefined) {
      if (parsed.missing.length > 0) {
        throw new IngestionError(
          "Faltan columnas obligatorias en el archivo",
          422,
          parsed.missing
        )
      }

      return { rowNumber, columns: parsed.columns }
    }
  }

  throw new IngestionError(
    "No se encontró la fila de encabezados del informe de ventas",
    422
  )
}

function buildQualityReport(
  lines: SaleLineDraft[],
  input: {
    rowsRead: number
    invalidRows: number
    rowErrors: RowError[]
    excludedByStatusDetail: Record<string, number>
    fileName: string
  }
): QualityReport {
  const excludedByStatus = Object.values(
    input.excludedByStatusDetail
  ).reduce((total, count) => total + count, 0)

  const duplicateSignatures = new Map<string, number>()

  for (const line of lines) {
    const signature = [
      line.documentNumber,
      line.item,
      line.quantity,
      line.subtotalCents,
      line.sellerId,
    ].join("|")

    duplicateSignatures.set(signature, (duplicateSignatures.get(signature) ?? 0) + 1)
  }

  const exactDuplicates = [...duplicateSignatures.values()].reduce(
    (total, count) => total + Math.max(0, count - 1),
    0
  )

  const sellerIds = new Map<string, Set<string>>()

  for (const line of lines) {
    const ids = sellerIds.get(line.sellerKey) ?? new Set<string>()
    ids.add(line.sellerId)
    sellerIds.set(line.sellerKey, ids)
  }

  const sellersWithMultipleIds = [...sellerIds.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([sellerKey, ids]) => ({ sellerKey, sellerIds: [...ids].sort() }))

  const feeNetMismatches: MarginMismatch[] = lines
    .filter((line) => line.docType === "FEE" || line.docType === "NCE")
    .filter(
      (line) =>
        Math.abs(line.netCents - line.subtotalCents) >
        Math.max(
          Math.abs(line.subtotalCents) * FEE_NET_MISMATCH_RATIO,
          10_000
        )
    )
    .slice(0, MAX_REPORT_ITEMS)
    .map((line) => ({
      documentNumber: line.documentNumber,
      docType: line.docType,
      subtotalCents: line.subtotalCents,
      netCents: line.netCents,
    }))

  const unmappedItems = [
    ...new Set(
      lines
        .filter((line) => line.familyKey === "OTROS")
        .map((line) => `${line.item} | ${line.itemDescription}`)
    ),
  ].slice(0, MAX_REPORT_ITEMS)

  const dates = lines.map((line) => line.date).sort()
  const detectedRange =
    dates.length > 0
      ? { start: dates[0], end: dates[dates.length - 1] }
      : null
  const suggestedPeriod = parsePeriodFromFileName(input.fileName)

  const warnings: string[] = []

  if (excludedByStatus > 0) {
    warnings.push(
      `${excludedByStatus} línea(s) excluida(s) por estado distinto de Aprobada`
    )
  }

  if (input.invalidRows > 0) {
    warnings.push(`${input.invalidRows} línea(s) con errores de datos`)
  }

  if (sellersWithMultipleIds.length > 0) {
    warnings.push(
      `${sellersWithMultipleIds.length} vendedor(es) con más de una cédula`
    )
  }

  if (unmappedItems.length > 0) {
    warnings.push(
      `${unmappedItems.length} ítem(s) sin familia mapeada (familia OTROS)`
    )
  }

  if (feeNetMismatches.length > 0) {
    warnings.push(
      `${feeNetMismatches.length} línea(s) FEE/NCE con diferencia relevante entre subtotal y neto`
    )
  }

  if (
    detectedRange &&
    suggestedPeriod &&
    (detectedRange.start !== suggestedPeriod.start ||
      detectedRange.end !== suggestedPeriod.end)
  ) {
    warnings.push(
      `El periodo del nombre del archivo (${suggestedPeriod.start} a ${suggestedPeriod.end}) no coincide con el rango real de fechas (${detectedRange.start} a ${detectedRange.end})`
    )
  }

  return {
    rowsRead: input.rowsRead,
    validRows: lines.length,
    invalidRows: input.invalidRows,
    rowErrors: input.rowErrors,
    excludedByStatus,
    excludedByStatusDetail: input.excludedByStatusDetail,
    exactDuplicates,
    sellersWithMultipleIds,
    feeNetMismatches,
    atypicalMargins: {
      fullMargin: lines.filter((line) => line.margin === 100).length,
      negativeMargin: lines.filter((line) => line.margin < 0).length,
    },
    unmappedItems,
    warnings,
    detectedRange,
    suggestedPeriod,
    suggestedName: input.fileName,
  }
}

export async function ingestSalesWorkbook(input: {
  buffer: Buffer
  fileName: string
}): Promise<IngestionResult> {
  if (input.buffer.byteLength > MAX_FILE_BYTES) {
    throw new IngestionError("El archivo supera el límite de 10 MB", 413)
  }

  const workbook = new ExcelJS.Workbook()

  try {
    // ExcelJS declara su propio `Buffer extends ArrayBuffer`; el Buffer de Node
    // no es estructuralmente compatible, así que se ajusta solo el tipo.
    await workbook.xlsx.load(input.buffer as unknown as ArrayBuffer)
  } catch {
    throw new IngestionError("No se pudo leer el archivo XLSX", 422)
  }

  const sheet = workbook.worksheets[0]

  if (!sheet) {
    throw new IngestionError("El archivo no contiene hojas", 422)
  }

  if (sheet.rowCount - 1 > MAX_DATA_ROWS) {
    throw new IngestionError(
      `El archivo supera el límite de ${MAX_DATA_ROWS} filas`,
      413
    )
  }

  const { rowNumber: headerRow, columns } = findHeaderRow(sheet)

  const lines: SaleLineDraft[] = []
  const rowErrors: RowError[] = []
  const excludedByStatusDetail: Record<string, number> = {}
  let rowsRead = 0
  let invalidRows = 0

  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const documentNumber = toText(
      readCell(row, columns, "documentNumber")
    ).toUpperCase()

    if (!documentNumber) {
      continue
    }

    rowsRead += 1

    const status = normalizeText(toText(readCell(row, columns, "status")))

    if (status !== "APROBADA") {
      const key = status || "SIN ESTADO"
      excludedByStatusDetail[key] = (excludedByStatusDetail[key] ?? 0) + 1
      continue
    }

    const errors: string[] = []
    const date = parseDateOnly(readCell(row, columns, "date"))
    const docType = parseDocType(documentNumber)
    const sellerNameRaw = toText(readCell(row, columns, "sellerName"))
    const clientNameRaw = toText(readCell(row, columns, "clientName"))
    const item = toText(readCell(row, columns, "item"))
    const itemDescription = toText(
      readCell(row, columns, "itemDescription")
    )
    const unit = normalizeText(toText(readCell(row, columns, "unit")))
    const warehouse = normalizeText(toText(readCell(row, columns, "warehouse")))
    const quantity = parseNumberValue(readCell(row, columns, "quantity"))
    const margin = parseNumberValue(readCell(row, columns, "margin"))
    const subtotalCents = parseAmountToCents(
      readCell(row, columns, "subtotalCents")
    )
    const netCents = parseAmountToCents(readCell(row, columns, "netCents"))

    if (!date) errors.push("fecha inválida")
    if (!docType) errors.push("tipo de documento inválido")
    if (!sellerNameRaw) errors.push("vendedor vacío")
    if (!clientNameRaw) errors.push("cliente vacío")
    if (!item) errors.push("ítem vacío")
    if (!unit) errors.push("unidad de medida vacía")
    if (quantity === null) errors.push("cantidad inválida")
    if (margin === null) errors.push("margen inválido")
    if (subtotalCents === null) errors.push("subtotal inválido")
    if (netCents === null) errors.push("valor neto inválido")

    if (
      errors.length > 0 ||
      !date ||
      !docType ||
      quantity === null ||
      margin === null ||
      subtotalCents === null ||
      netCents === null
    ) {
      invalidRows += 1
      rowErrors.push({
        row: rowNumber,
        message: errors.length > 0 ? errors.join(", ") : "datos incompletos",
      })
      continue
    }

    const sellerKey = normalizeName(sellerNameRaw)
    const family = resolveFamily(itemDescription)

    lines.push({
      documentNumber,
      docType,
      date,
      status: "Aprobada",
      costCenter: toIdentifier(readCell(row, columns, "costCenter"), 3),
      sellerName: sellerKey,
      sellerId: toIdentifier(readCell(row, columns, "sellerId")),
      sellerKey,
      clientName: normalizeName(clientNameRaw),
      clientKey: normalizeClientKey(clientNameRaw),
      item,
      itemDescription,
      unit,
      quantity,
      subtotalCents,
      netCents,
      margin,
      warehouse,
      familyKey: family.familyKey,
      isProduct: family.isProduct,
      isReturn: docType === "NCE",
    })
  }

  return {
    fileHash: createHash("sha256").update(input.buffer).digest("hex"),
    fileName: input.fileName,
    lines,
    report: buildQualityReport(lines, {
      rowsRead,
      invalidRows,
      rowErrors,
      excludedByStatusDetail,
      fileName: input.fileName,
    }),
  }
}
