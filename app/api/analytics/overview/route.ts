import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCommissionProfile } from "@/lib/config/commission-profiles"
import { overviewQuerySchema } from "@/lib/schemas/overview"
import {
  calculateKpis,
  filterLinesByPeriod,
  rankProducts,
} from "@/services/analytics/analyticsService"
import {
  applyReassignments,
  calculateCommission,
  filterLinesBySellers,
} from "@/services/commissions/commissionService"
import { IngestionError } from "@/services/ingestion/ingestionError"
import { ingestSalesWorkbook } from "@/services/ingestion/ingestionService"
import { readSalesUpload } from "@/services/ingestion/uploadRequest"
import type { OverviewResponse, SalesTableRow } from "@/types/overview"

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    const hasSellerFilter = url.searchParams.has("sellers")
    const hasSelectionFilter = url.searchParams.has("selectedLines")
    const hasReassignFilter = url.searchParams.has("reassignedLines")
    delete params.sellers
    delete params.selectedLines
    delete params.reassignedLines

    const query = overviewQuerySchema.parse({
      ...params,
      ...(hasSellerFilter
        ? { sellers: url.searchParams.getAll("sellers").filter(Boolean) }
        : {}),
      ...(hasSelectionFilter
        ? {
            selectedLines: url.searchParams
              .getAll("selectedLines")
              .filter(Boolean),
          }
        : {}),
      ...(hasReassignFilter
        ? {
            reassignedLines: url.searchParams
              .getAll("reassignedLines")
              .filter(Boolean),
          }
        : {}),
    })
    const file = await readSalesUpload(request)

    const ingestion = await ingestSalesWorkbook({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
    })

    const period =
      query.from && query.to
        ? { start: query.from, end: query.to }
        : ingestion.report.detectedRange

    if (!period) {
      return NextResponse.json(
        { message: "No se pudo detectar el periodo del archivo" },
        { status: 422 }
      )
    }

    const lines = filterLinesByPeriod(ingestion.lines, period)
    const lineIds = new Map(ingestion.lines.map((line, index) => [line, index]))
    const idOf = (line: (typeof lines)[number]) => lineIds.get(line) ?? -1
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

    const profile = getCommissionProfile()
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

    const commission = calculateCommission(
      commissionLines,
      profile,
      query.advance
    )

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
      const outOfPeriod = query.reassignedLines.filter(
        (id) => !periodIds.has(id)
      )
      if (outOfPeriod.length > 0) {
        commission.warnings.push(
          `${outOfPeriod.length} línea(s) reasignada(s) fuera del periodo`
        )
      }
    }

    const products = rankProducts(lines, {
      metric: query.metric,
      order: query.order,
      limit: query.limit,
      includeNonProducts: query.includeNonProducts,
    })

    const response: OverviewResponse = {
      report: ingestion.report,
      period,
      sellers,
      table,
      kpis: calculateKpis(lines),
      products: products.products,
      returnedProducts: products.returnedProducts,
      commission: {
        sellerKey: profile.sellerKey,
        ownRate: profile.ownRate,
        teamRate: profile.teamRate,
        ...commission,
        reassignments,
      },
    }

    return NextResponse.json(response)
  } catch (cause) {
    if (cause instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Parámetros inválidos",
          details: cause.issues.map((issue) => issue.message),
        },
        { status: 400 }
      )
    }

    if (cause instanceof IngestionError) {
      return NextResponse.json(
        { message: cause.message, details: cause.details },
        { status: cause.status }
      )
    }

    return NextResponse.json(
      { message: "No se pudo analizar el archivo" },
      { status: 500 }
    )
  }
}
