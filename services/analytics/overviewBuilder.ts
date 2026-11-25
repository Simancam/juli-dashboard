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

import {
  calculateKpis,
  rankClients,
  rankFamilies,
  rankProducts,
} from "./analyticsService"
import {
  buildCommissionCalculation,
  filterLinesBySellers,
} from "../commissions/commissionService"

export interface OverviewQuery {
  from?: string
  to?: string
  metric: ProductMetric
  order: ProductOrder
  limit: number
  ownRate?: number
  teamRate?: number
  /** Anticipo en centavos, descontado del total de la comisión. */
  advanceCents?: number
  /** false/undefined = el overview no calcula comisión (flujo Análisis). */
  includeCommission?: boolean
  /** Filtro general para KPIs, clientes y productos. */
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
  // La tabla solo sirve para revisar ventas y preparar reasignaciones: marcar
  // líneas nunca reemplaza el filtro de vendedores que define la base.
  // Las líneas reasignadas entran a la base de forma explícita.
  const commission = buildCommissionCalculation(
    lines.map((line) => ({ id: idOf(line), line })),
    {
      sellers: query.sellers,
      reassignedLines: query.reassignedLines,
      profile,
      advanceCents: query.advanceCents,
    }
  )

  if (query.sellers) {
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
    result: commission.result,
    warnings: commission.warnings,
    reassignments: commission.reassignments,
  }
}

/** Única fuente de verdad del overview: la usan la ingesta de archivo y la DB. */
export function buildOverview(input: BuildOverviewInput): OverviewResponse {
  const { lines, idOf, report, period, query } = input
  const sellers = [...new Set(lines.map((line) => line.sellerKey))].sort()
  const periodIds = new Set(lines.map(idOf))
  // El filtro de vendedores es general: afecta KPIs, clientes y productos.
  // La tabla conserva todas las líneas para permitir la selección manual
  // (y la reasignación de cuentas de otros vendedores a Juliana).
  const scopedLines = filterLinesBySellers(lines, query.sellers)

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

  const products = rankProducts(scopedLines, {
    metric: query.metric,
    order: query.order,
    limit: query.limit,
  })

  const commission = query.includeCommission
    ? buildCommission(lines, idOf, query, periodIds, sellers)
    : undefined

  return {
    report,
    period,
    sellers,
    table,
    kpis: calculateKpis(scopedLines),
    clients: rankClients(scopedLines),
    families: rankFamilies(scopedLines),
    products: products.products,
    returnedProducts: products.returnedProducts,
    ...(commission ? { commission } : {}),
  }
}
