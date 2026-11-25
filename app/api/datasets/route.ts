import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { datasetUploadQuerySchema } from "@/lib/schemas/datasets"
import { overviewQueryFromUrl } from "@/lib/schemas/overview"
import { filterLinesByPeriod } from "@/services/analytics/analyticsService"
import { buildOverview } from "@/services/analytics/overviewBuilder"
import { IngestionError } from "@/services/ingestion/ingestionError"
import { ingestSalesWorkbook } from "@/services/ingestion/ingestionService"
import { readSalesUpload } from "@/services/ingestion/uploadRequest"
import { createAnalysesRepository } from "@/services/repositories/analysesRepository"
import { createDatasetsRepository } from "@/services/repositories/datasetsRepository"
import type { DatasetConflict } from "@/types/datasets"

function toConflict(input: {
  id: string
  name: string
  periodStart: string
  periodEnd: string
}): DatasetConflict {
  return input
}

export async function GET() {
  try {
    const datasets = await createDatasetsRepository().list()

    return NextResponse.json({ datasets })
  } catch {
    return NextResponse.json(
      { message: "No se pudo listar los datasets" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const query = datasetUploadQuerySchema.parse(
      Object.fromEntries(url.searchParams)
    )

    const file = await readSalesUpload(request)

    const ingestion = await ingestSalesWorkbook({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
    })

    if (query.dryRun !== true) {
      const overviewQuery = overviewQueryFromUrl(url)
      const period =
        query.periodStart && query.periodEnd
          ? { start: query.periodStart, end: query.periodEnd }
          : ingestion.report.detectedRange

      if (!period) {
        return NextResponse.json(
          { message: "No se pudo detectar el periodo del archivo" },
          { status: 422 }
        )
      }

      const datasets = createDatasetsRepository()
      const analyses = createAnalysesRepository()

      const duplicates = await datasets.findByHash(ingestion.fileHash)
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            message: "Este archivo ya fue cargado",
            conflicts: duplicates.map(toConflict),
          },
          { status: 409 }
        )
      }

      // Solo datos listos cuentan en agregados y en la detección de solapes.
      const overlapping = await datasets.findReadyOverlapping(
        period.start,
        period.end
      )
      const previousAnalysisIds = await analyses.listActiveIdsByDatasets(
        overlapping.map((item) => item.id)
      )

      const dataset = await datasets.createProcessing({
        name: ingestion.fileName,
        periodStart: period.start,
        periodEnd: period.end,
        fileHash: ingestion.fileHash,
        fileName: file.name,
        rowCount: ingestion.lines.length,
        lines: ingestion.lines,
      })

      // Orden obligatorio por analyses_one_active_per_month:
      // processing + líneas -> activar -> insertar análisis -> actualizar superseded_by.
      await datasets.activate(
        dataset.id,
        overlapping.map((item) => item.id)
      )

      const snapshotLines = filterLinesByPeriod(ingestion.lines, period)
      const lineIds = new Map(ingestion.lines.map((line, index) => [line, index]))
      const result = buildOverview({
        lines: snapshotLines,
        idOf: (line) => lineIds.get(line) ?? -1,
        report: ingestion.report,
        period,
        query: overviewQuery,
      })
      const analysis = await analyses.createActive({
        datasetId: dataset.id,
        periodStart: period.start,
        periodEnd: period.end,
        name: query.name ?? "Informe de ventas",
        fileName: file.name,
        fileHash: ingestion.fileHash,
        report: ingestion.report,
        result,
        snapshot: {
          kpis: result.kpis,
          clients: result.clients,
          families: result.families,
          products: result.products,
          returnedProducts: result.returnedProducts,
        },
      })

      await analyses.setSupersededBy(previousAnalysisIds, analysis.id)

      return NextResponse.json({
        dataset,
        report: ingestion.report,
        analysisId: analysis.id,
      })
    }

    return NextResponse.json({
      dryRun: true as const,
      fileName: ingestion.fileName,
      fileHash: ingestion.fileHash,
      report: ingestion.report,
      lineCount: ingestion.lines.length,
    })
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
      {
        message:
          cause instanceof Error ? cause.message : "No se pudo guardar el dataset",
      },
      { status: 500 }
    )
  }
}
