import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { overviewQueryFromUrl } from "@/lib/schemas/overview"
import { filterLinesByPeriod } from "@/services/analytics/analyticsService"
import { buildOverview } from "@/services/analytics/overviewBuilder"
import { IngestionError } from "@/services/ingestion/ingestionError"
import { ingestSalesWorkbook } from "@/services/ingestion/ingestionService"
import { readSalesUpload } from "@/services/ingestion/uploadRequest"

export async function POST(request: Request) {
  try {
    const query = overviewQueryFromUrl(new URL(request.url))
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

    return NextResponse.json(
      buildOverview({
        lines,
        idOf: (line) => lineIds.get(line) ?? -1,
        report: ingestion.report,
        period,
        query,
      })
    )
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
