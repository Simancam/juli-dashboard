import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { monthRange, previousMonthRange, resolvePanelPeriod } from "@/lib/panel-period"
import { resolveSellerKeys } from "@/lib/panel-sellers"
import { panelQuerySchema } from "@/lib/schemas/panel"
import { createPanelRepository } from "@/services/repositories/panelRepository"
import type { PanelResponse } from "@/types/panel"

const RANKING_LIMIT = 100

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const query = panelQuerySchema.parse({
      ...Object.fromEntries(searchParams),
      ...(searchParams.has("seller")
        ? { seller: searchParams.getAll("seller") }
        : {}),
    })
    const repository = createPanelRepository()
    const coverage = await repository.coverage()
    const { from, to } = resolvePanelPeriod(query, coverage)
    const comparisonPeriod = previousMonthRange(to)
    // El gráfico mensual muestra siempre toda la cobertura, sin seguir al filtro.
    const chartPeriod = {
      from: coverage.firstDate ?? from,
      to: coverage.lastDate ?? to,
    }
    const sellers = await repository.sellers(chartPeriod.from, chartPeriod.to)
    const sellerKeys = resolveSellerKeys(query.seller, sellers)
    const chartSelection = query.chartMonth
      ? monthRange(query.chartMonth)
      : chartPeriod

    const [summary, monthly, rankings, previousSummary, chart] = await Promise.all([
      repository.summary(from, to, sellerKeys),
      repository.monthly(chartPeriod.from, chartPeriod.to, sellerKeys),
      repository.rankings(from, to, RANKING_LIMIT, sellerKeys),
      repository.summary(comparisonPeriod.from, comparisonPeriod.to, sellerKeys),
      repository.chartPoints(
        chartSelection.from,
        chartSelection.to,
        query.chartMonth ? "day" : "month",
        sellerKeys
      ),
    ])

    const response: PanelResponse = {
      year: Number(from.slice(0, 4)),
      sellerKeys,
      sellers,
      period: { start: from, end: to },
      summary,
      comparison: previousSummary.lastDate
        ? {
            period: {
              start: comparisonPeriod.from,
              end: comparisonPeriod.to,
            },
            summary: previousSummary,
          }
        : null,
      monthly,
      chart,
      chartMonth: query.chartMonth,
      coverage,
      rankings,
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

    return NextResponse.json(
      {
        message:
          cause instanceof Error ? cause.message : "No se pudo cargar el panel",
      },
      { status: 500 }
    )
  }
}
