import type { Kpis, RankedEntry } from "./analytics"
import type { DateRange } from "./sales"

/** KPIs del periodo solicitado. */
export interface PanelSummary extends Kpis {
  lastDate: string | null
  previousNetSalesCents: number
  previousLastDate: string | null
}

export interface PanelMonthlyPoint {
  /** YYYY-MM */
  month: string
  netSalesCents: number
  grossSalesCents: number
  returnsCents: number
  documents: number
}

/** Punto de la gráfica configurable: bucket = YYYY-MM (mes) o YYYY-MM-DD (día). */
export interface PanelChartPoint {
  bucket: string
  netSalesCents: number
  grossSalesCents: number
  returnsCents: number
  documents: number
  clients: number
  products: number
  families: number
  sellers: number
  warehouses: number
  quantity: number
}

export interface DataCoverage {
  firstDate: string | null
  lastDate: string | null
  monthsWithData: number
  missingMonths: string[]
  lastUploadAt: string | null
  datasetsReady: number
}

export interface PanelSellerOption {
  key: string
  label: string
}

export interface PanelRankings {
  products: RankedEntry[]
  sellers: RankedEntry[]
  clients: RankedEntry[]
  families: RankedEntry[]
  warehouses: RankedEntry[]
}

export interface PanelResponse {
  year: number
  /** null cuando se eligió "Todos los vendedores". */
  sellerKeys: string[] | null
  /** Opciones del selector, sin filtrar por vendedor. */
  sellers: PanelSellerOption[]
  period: DateRange
  summary: PanelSummary
  /** Mes calendario anterior al final del periodo, sin datos cuando no hay base. */
  comparison: { period: DateRange; summary: PanelSummary } | null
  monthly: PanelMonthlyPoint[]
  /** Puntos de la gráfica; diarios cuando se pide un mes, mensuales si no. */
  chart: PanelChartPoint[]
  /** Mes pedido para la gráfica, para saber si los puntos ya son los actuales. */
  chartMonth?: string
  coverage: DataCoverage
  rankings: PanelRankings
}
