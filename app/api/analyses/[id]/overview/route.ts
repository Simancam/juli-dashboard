import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { analysisParamsSchema } from "@/lib/schemas/analyses"
import { overviewQueryFromUrl } from "@/lib/schemas/overview"
import { filterLinesByPeriod } from "@/services/analytics/analyticsService"
import { buildOverview } from "@/services/analytics/overviewBuilder"
import { createAnalysesRepository } from "@/services/repositories/analysesRepository"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = analysisParamsSchema.parse(await params)
    const query = overviewQueryFromUrl(new URL(request.url))
    const repository = createAnalysesRepository()
    const analysis = await repository.getById(id)

    if (!analysis) {
      return NextResponse.json(
        { message: "No se encontró el análisis" },
        { status: 404 }
      )
    }

    if (!analysis.datasetId) {
      return NextResponse.json(
        {
          message:
            "El análisis fue reemplazado; conserva solo el resumen. Abre la versión activa para recalcular.",
        },
        { status: 410 }
      )
    }

    const period =
      query.from && query.to
        ? { start: query.from, end: query.to }
        : { start: analysis.periodStart, end: analysis.periodEnd }

    const storedLines = await repository.getLines(analysis.datasetId)
    const lines = filterLinesByPeriod(storedLines, period)

    return NextResponse.json(
      buildOverview({
        lines,
        idOf: (line) =>
          "lineNo" in line && typeof line.lineNo === "number" ? line.lineNo : -1,
        report: analysis.report,
        period,
        query,
      })
    )
  } catch (cause) {
    if (cause instanceof ZodError) {
      return NextResponse.json(
        { message: "Parámetros inválidos" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        message:
          cause instanceof Error ? cause.message : "No se pudo analizar el dataset",
      },
      { status: 500 }
    )
  }
}
