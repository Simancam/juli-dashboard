import { NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  commissionReportParamsSchema,
  commissionReportUpdateSchema,
} from "@/lib/schemas/commission-reports"
import { calculateCommissionReport } from "@/services/commissionReportsCalculation"
import { createAnalysesRepository } from "@/services/repositories/analysesRepository"
import { createCommissionReportsRepository } from "@/services/repositories/commissionReportsRepository"

type RouteContext = { params: Promise<{ id: string }> }

function invalidData(cause: unknown, fallback: string) {
  if (cause instanceof ZodError) {
    return NextResponse.json(
      { message: "Datos inválidos", details: cause.issues.map((i) => i.message) },
      { status: 400 }
    )
  }

  if (cause instanceof SyntaxError) {
    return NextResponse.json({ message: "JSON inválido" }, { status: 400 })
  }

  return NextResponse.json(
    {
      message: cause instanceof Error ? cause.message : fallback,
    },
    { status: 500 }
  )
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = commissionReportParamsSchema.parse(await params)
    const report = await createCommissionReportsRepository().getById(id)

    if (!report) {
      return NextResponse.json(
        { message: "No se encontró el reporte" },
        { status: 404 }
      )
    }

    return NextResponse.json({ report })
  } catch (cause) {
    return invalidData(cause, "No se pudo cargar el reporte")
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = commissionReportParamsSchema.parse(await params)
    const body = commissionReportUpdateSchema.parse(await request.json())
    const reports = createCommissionReportsRepository()
    const current = await reports.getById(id)

    if (!current) {
      return NextResponse.json(
        { message: "No se encontró el reporte" },
        { status: 404 }
      )
    }

    const analyses = createAnalysesRepository()
    const analysis = await analyses.getById(current.analysisId)

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
            "El análisis fue reemplazado y ya no tiene líneas para recalcular",
        },
        { status: 410 }
      )
    }

    // Los campos ausentes conservan el valor guardado. `allSellers` permite
    // pedir explícitamente "todos" aunque el reporte estuviera filtrado.
    const storedLines = await analyses.getLines(analysis.datasetId)
    const calculated = calculateCommissionReport({
      periodStart: analysis.periodStart,
      periodEnd: analysis.periodEnd,
      lines: storedLines,
      sellerKey: body.sellerKey ?? current.sellerKey,
      ownRate: body.ownRate ?? current.ownRate,
      teamRate: body.teamRate ?? current.teamRate,
      advanceCents: body.advanceCents ?? current.advanceCents,
      sellers: body.allSellers
        ? undefined
        : (body.sellers ?? current.inputs.sellers),
      reassignedLines:
        body.reassignedLines ?? current.inputs.reassignedLines ?? [],
    })

    const report = await reports.update(id, calculated)

    return NextResponse.json({ report })
  } catch (cause) {
    return invalidData(cause, "No se pudo editar el reporte")
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = commissionReportParamsSchema.parse(await params)
    await createCommissionReportsRepository().remove(id)

    return NextResponse.json({ ok: true })
  } catch (cause) {
    return invalidData(cause, "No se pudo eliminar el reporte")
  }
}
