import { NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  commissionReportCreateSchema,
  commissionReportListQuerySchema,
} from "@/lib/schemas/commission-reports"
import { calculateCommissionReport } from "@/services/commissionReportsCalculation"
import { createAnalysesRepository } from "@/services/repositories/analysesRepository"
import { createCommissionReportsRepository } from "@/services/repositories/commissionReportsRepository"

export async function GET(request: Request) {
  try {
    const query = commissionReportListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams)
    )
    const reports = await createCommissionReportsRepository().list(query.analysisId)

    return NextResponse.json({ reports })
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
          cause instanceof Error ? cause.message : "No se pudo listar los reportes",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = commissionReportCreateSchema.parse(await request.json())
    const analyses = createAnalysesRepository()
    const analysis = await analyses.getById(body.analysisId)

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
            "El análisis fue reemplazado y ya no tiene líneas disponibles",
        },
        { status: 410 }
      )
    }

    const storedLines = await analyses.getLines(analysis.datasetId)
    const calculated = calculateCommissionReport({
      periodStart: analysis.periodStart,
      periodEnd: analysis.periodEnd,
      lines: storedLines,
      sellerKey: body.sellerKey,
      ownRate: body.ownRate,
      teamRate: body.teamRate,
      advanceCents: body.advanceCents,
      sellers: body.sellers,
      reassignedLines: body.reassignedLines,
    })

    const reports = createCommissionReportsRepository()
    const report = await reports.create({
      analysisId: analysis.id,
      version: await reports.nextVersion(analysis.id),
      ...calculated,
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (cause) {
    if (cause instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Datos inválidos",
          details: cause.issues.map((issue) => issue.message),
        },
        { status: 400 }
      )
    }

    if (cause instanceof SyntaxError) {
      return NextResponse.json({ message: "JSON inválido" }, { status: 400 })
    }

    return NextResponse.json(
      {
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudo guardar el reporte",
      },
      { status: 500 }
    )
  }
}
