import type { DocType } from "./sales"

export type Granularity = "day" | "week" | "month"
export type CompareMode = "prev"
export type RankingOrder = "asc" | "desc"
export type RankingMetric = "value" | "quantity"
export type BreakdownDimension = "warehouse" | "docType"

export interface AnalyticsFilters {
  /** YYYY-MM-DD */
  from: string
  /** YYYY-MM-DD */
  to: string
  sellers?: string[]
  clients?: string[]
  families?: string[]
  items?: string[]
  warehouses?: string[]
  docTypes?: DocType[]
}

export interface ResponseMeta {
  from: string
  to: string
  datasetsUsed: string[]
  excludedRows: number
}

export interface Kpis {
  /** Ventas netas en centavos. */
  netSalesCents: number
  grossSalesCents: number
  returnsCents: number
  returnRate: number
  documents: number
  clients: number
  avgTicketCents: number
  weightedMargin: number
}

export interface KpisResponse {
  data: Kpis
  previous?: Kpis
  meta: ResponseMeta
}

export interface TimeSeriesPoint {
  /** YYYY-MM-DD para day/week; YYYY-MM para month. */
  period: string
  netSalesCents: number
  grossSalesCents: number
  returnsCents: number
}

export interface TimeSeriesResponse {
  data: TimeSeriesPoint[]
  granularity: Granularity
  previous?: TimeSeriesPoint[]
  meta: ResponseMeta
}

export interface RankedEntry {
  key: string
  label: string
  netSalesCents: number
  share: number
  documents: number
  returnsCents: number
  margin: number
  /** Solo en rankings de clientes (Pareto). */
  cumulativeShare?: number
  /** Solo en rankings de productos por cantidad. */
  quantity?: number
  unit?: string
}

export interface RankingsResponse {
  data: RankedEntry[]
  order: RankingOrder
  metric: RankingMetric
  meta: ResponseMeta
}

export interface BreakdownEntry {
  key: string
  label: string
  netSalesCents: number
  share: number
  documents: number
}

export interface BreakdownResponse {
  data: BreakdownEntry[]
  dimension: BreakdownDimension
  /** Porcentaje del total que concentran las primeras N entradas. */
  topConcentration: number
  meta: ResponseMeta
}
