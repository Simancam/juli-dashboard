import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCommissionProfile } from "@/lib/config/commission-profiles"
import {
  commissionReportCreateSchema,
  commissionReportListQuerySchema,
} from "@/lib/schemas/commission-reports"
import { filterLinesByPeriod } from "@/services/analytics/analyticsService"
import {
  applyReassignments,
  calculateCommission,
  filterLinesBySellers,
} from "@/services/commissions/commissionService"
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

    const profile = getCommissionProfile(body.sellerKey)
    const effectiveProfile = {
      ...profile,
      ownRate: body.ownRate ?? profile.ownRate,
      teamRate: body.teamRate ?? profile.teamRate,
    }

    const storedLines = await analyses.getLines(analysis.datasetId)
    const lines = filterLinesByPeriod(storedLines, {
      start: analysis.periodStart,
      end: analysis.periodEnd,
    })
    const selected = body.selectedLines
    const selectedSet = new Set(selected ?? [])
    const baseLines =
      selected !== undefined
        ? lines.filter((line) => selectedSet.has(line.lineNo))
        : filterLinesBySellers(lines, body.sellers)
    const baseIds = new Set(baseLines.map((line) => line.lineNo))
    const ignoredReassignments = (body.reassignedLines ?? []).filter(
      (id) => !baseIds.has(id)
    )

    const { lines: commissionLines, reassignments } = applyReassignments(
      baseLines.map((line) => ({ id: line.lineNo, line })),
      body.reassignedLines,
      effectiveProfile.sellerKey
    )

    const calculated = calculateCommission(
      commissionLines,
      effectiveProfile,
      body.advanceCents
    )
    const warnings = [...calculated.warnings]

    if (ignoredReassignments.length > 0) {
      warnings.push(
        `${ignoredReassignments.length} línea(s) reasignada(s) quedaron fuera de la selección y no se aplicaron`
      )
    }
    const inputs = {
      ...(body.sellers !== undefined ? { sellers: body.sellers } : {}),
      ...(selected !== undefined ? { selectedLines: selected } : {}),
      ...(body.reassignedLines !== undefined
        ? { reassignedLines: body.reassignedLines }
        : {}),
      reassignments,
    }

    const reports = createCommissionReportsRepository()
    const report = await reports.create({
      analysisId: analysis.id,
      version: await reports.nextVersion(analysis.id),
      sellerKey: effectiveProfile.sellerKey,
      ownRate: effectiveProfile.ownRate,
      teamRate: effectiveProfile.teamRate,
      advanceCents: body.advanceCents,
      inputs,
      result: calculated.result,
      warnings,
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
