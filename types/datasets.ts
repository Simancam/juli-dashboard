import type { DateRange, SaleLineDraft } from "./sales"

export interface Dataset {
  id: string
  name: string
  periodStart: string
  periodEnd: string
  fileHash: string
  rowCount: number
  uploadedAt: string
}

export interface DatasetConflict {
  id: string
  name: string
  periodStart: string
  periodEnd: string
}

export interface SellerIdentityIssue {
  sellerKey: string
  sellerIds: string[]
}

export interface MarginMismatch {
  documentNumber: string
  docType: string
  subtotalCents: number
  netCents: number
}

export interface AtypicalMargins {
  fullMargin: number
  negativeMargin: number
}

export interface RowError {
  row: number
  message: string
}

export interface QualityReport {
  rowsRead: number
  validRows: number
  invalidRows: number
  rowErrors: RowError[]
  excludedByStatus: number
  excludedByStatusDetail: Record<string, number>
  exactDuplicates: number
  sellersWithMultipleIds: SellerIdentityIssue[]
  feeNetMismatches: MarginMismatch[]
  atypicalMargins: AtypicalMargins
  unmappedItems: string[]
  warnings: string[]
  detectedRange: DateRange | null
  suggestedPeriod: DateRange | null
  suggestedName: string | null
}

export interface IngestionResult {
  fileHash: string
  fileName: string
  lines: SaleLineDraft[]
  report: QualityReport
}


export interface DatasetPreview {
  report: QualityReport
  fileHash: string
  conflicts: DatasetConflict[]
}

export interface DatasetUploadResponse {
  dataset: Dataset
  report: QualityReport
  /** Análisis activo creado al persistir el dataset. */
  analysisId?: string
}

export interface DatasetListResponse {
  datasets: Dataset[]
}

export interface DatasetConflictResponse {
  message: string
  conflicts: DatasetConflict[]
}
