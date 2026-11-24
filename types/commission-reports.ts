import type { CommissionResult, Reassignment } from "./commissions"

/** Entradas de la simulación: id = número de línea del dataset guardado. */
export interface CommissionReportInputs {
  sellers?: string[]
  selectedLines?: number[]
  reassignedLines?: number[]
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
