import type { Kpis, RankedEntry } from "./analytics"
import type { CommissionResult, Reassignment } from "./commissions"
import type { QualityReport } from "./datasets"
import type { DateRange } from "./sales"

export type ProductMetric = "value" | "quantity"
export type ProductOrder = "asc" | "desc"

/** Subset de columnas del Excel, suficiente para revisar y elegir líneas. */
export interface SalesTableRow {
  /** Índice de la línea en el archivo; estable entre recálculos. */
  id: number
  date: string
  documentNumber: string
  sellerKey: string
  clientKey: string
  productLabel: string
  unit: string
  quantity: number
  subtotalCents: number
  isReturn: boolean
}

export interface OverviewFilters {
  from?: string
  to?: string
  metric: ProductMetric
  order: ProductOrder
  limit: number
  advanceCents: number
  includeNonProducts: boolean
  /** Undefined = todos los vendedores; array vacío = ninguno. */
  sellers?: string[]
  /** Undefined = sin selección manual; array vacío = ninguna línea. */
  selectedLines?: number[]
  /** Líneas reasignadas al vendedor del perfil. */
  reassignedLines?: number[]
}

export interface OverviewCommission {
  sellerKey: string
  ownRate: number
  teamRate: number
  result: CommissionResult
  /** Constancia de las reasignaciones aplicadas en este cálculo. */
  reassignments: Reassignment[]
  warnings: string[]
}

export interface OverviewResponse {
  report: QualityReport
  period: DateRange
  /** Vendedores con líneas en el periodo, ordenados. */
  sellers: string[]
  /** Líneas del periodo con las columnas clave del Excel. */
  table: SalesTableRow[]
  kpis: Kpis
  products: RankedEntry[]
  returnedProducts: RankedEntry[]
  commission: OverviewCommission
}
