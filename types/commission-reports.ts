import type { CommissionResult, Reassignment } from "./commissions"
import type { SalesTableRow } from "./overview"

/** Cada línea que formó la base de la comisión guardada. */
export interface CommissionLine extends SalesTableRow {
  /** Vendedor efectivo tras reasignaciones; `sellerKey` conserva el original. */
  effectiveSellerKey: string
  /** Tasa aplicada a la línea en el cálculo guardado. */
  rate: number
  /** Comisión de la línea redondeada a centavos. */
  commissionCents: number
}

/** Entradas de la simulación: id = número de línea del dataset guardado. */
export interface CommissionReportInputs {
  sellers?: string[]
  /** Solo presente en reportes antiguos: marcar líneas nunca define la base. */
  selectedLines?: number[]
  reassignedLines?: number[]
  /** Detalle completo de las líneas usadas en el cálculo guardado. */
  commissionLines?: CommissionLine[]
}

export interface SavedCommissionReport {
  id: string
  analysisId: string
  version: number
  sellerKey: string
  ownRate: number
  teamRate: number
  advanceCents: number
  inputs: CommissionReportInputs
  result: CommissionResult
  reassignments: Reassignment[]
  warnings: string[]
  createdBy: string
  createdAt: string
}

export interface CommissionReportListResponse {
  reports: SavedCommissionReport[]
}

export interface CommissionReportResponse {
  report: SavedCommissionReport
}
