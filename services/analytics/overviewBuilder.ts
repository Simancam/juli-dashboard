import { getCommissionProfile } from "@/lib/config/commission-profiles"
import type { QualityReport } from "@/types/datasets"
import type {
  OverviewCommission,
  OverviewResponse,
  ProductMetric,
  ProductOrder,
  SalesTableRow,
} from "@/types/overview"
import type { DateRange, SaleLineDraft } from "@/types/sales"

import { calculateKpis, rankProducts } from "./analyticsService"
import {
  applyReassignments,
  calculateCommission,
  filterLinesBySellers,
} from "../commissions/commissionService"

export interface OverviewQuery {
  from?: string
  to?: string
  metric: ProductMetric
  order: ProductOrder
  limit: number
  advance: number
  ownRate?: number
  teamRate?: number
  includeNonProducts: boolean
  sellers?: string[]
  selectedLines?: number[]
  reassignedLines?: number[]
}

export interface BuildOverviewInput {
  lines: SaleLineDraft[]
  /** ID estable (número de línea) para selección y reasignación. */
  idOf: (line: SaleLineDraft) => number
  report: QualityReport
  period: DateRange
  query: OverviewQuery
}

function buildCommission(
  lines: SaleLineDraft[],
  idOf: (line: SaleLineDraft) => number,
  query: OverviewQuery,
  periodIds: Set<number>,
  sellers: string[]
): OverviewCommission {
  const defaultProfile = getCommissionProfile()
  const profile = {
    ...defaultProfile,
    ownRate: query.ownRate ?? defaultProfile.ownRate,
    teamRate: query.teamRate ?? defaultProfile.teamRate,
  }
  const selected = query.selectedLines
  const selectedSet = new Set(selected ?? [])
  const baseLines =
    selected !== undefined
      ? lines.filter((line) => selectedSet.has(idOf(line)))
      : filterLinesBySellers(lines, query.sellers)

  const { lines: commissionLines, reassignments } = applyReassignments(
    baseLines.map((line) => ({ id: idOf(line), line })),
    query.reassignedLines,
    profile.sellerKey
  )

  const commission = calculateCommission(commissionLines, profile, query.advance)

  const baseIds = new Set(baseLines.map(idOf))
  const ignoredReassignments = (query.reassignedLines ?? []).filter(
    (id) => !baseIds.has(id)
  )
  if (ignoredReassignments.length > 0) {
    commission.warnings.push(
      `${ignoredReassignments.length} línea(s) reasignada(s) quedaron fuera de la selección y no se aplicaron`
    )
  }

  if (selected !== undefined) {
    const outOfPeriod = selected.filter((id) => !periodIds.has(id))
    if (outOfPeriod.length > 0) {
      commission.warnings.push(
        `${outOfPeriod.length} línea(s) seleccionada(s) fuera del periodo`
      )
    }
  } else if (query.sellers) {
    for (const sellerKey of query.sellers) {
      if (!sellers.includes(sellerKey)) {
        commission.warnings.push(
          `El vendedor ${sellerKey} no tiene líneas en el periodo`
        )
      }
    }
  }

  if (query.reassignedLines) {
    const outOfPeriod = query.reassignedLines.filter((id) => !periodIds.has(id))
    if (outOfPeriod.length > 0) {
      commission.warnings.push(
        `${outOfPeriod.length} línea(s) reasignada(s) fuera del periodo`
      )
    }
  }

  return {
    sellerKey: profile.sellerKey,
    ownRate: profile.ownRate,
    teamRate: profile.teamRate,
    ...commission,
    reassignments,
  }
}

/** Única fuente de verdad del overview: la usan la ingesta de archivo y la DB. */
export function buildOverview(input: BuildOverviewInput): OverviewResponse {
  const { lines, idOf, report, period, query } = input
  const sellers = [...new Set(lines.map((line) => line.sellerKey))].sort()
  const periodIds = new Set(lines.map(idOf))

  const table: SalesTableRow[] = lines.map((line) => ({
    id: idOf(line),
    date: line.date,
    documentNumber: line.documentNumber,
    sellerKey: line.sellerKey,
    clientKey: line.clientKey,
    productLabel: line.itemDescription || line.item,
    unit: line.unit,
    quantity: line.quantity,
    subtotalCents: line.subtotalCents,
    isReturn: line.isReturn,
  }))

  const products = rankProducts(lines, {
    metric: query.metric,
    order: query.order,
    limit: query.limit,
    includeNonProducts: query.includeNonProducts,
  })

  return {
    report,
    period,
    sellers,
    table,
    kpis: calculateKpis(lines),
    products: products.products,
    returnedProducts: products.returnedProducts,
    commission: buildCommission(lines, idOf, query, periodIds, sellers),
  }
}
