import { NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  analysisParamsSchema,
  updateAnalysisSchema,
} from "@/lib/schemas/analyses"
import { createAnalysesRepository } from "@/services/repositories/analysesRepository"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = analysisParamsSchema.parse(await params)
    const analysis = await createAnalysesRepository().getById(id)

    if (!analysis) {
      return NextResponse.json(
        { message: "No se encontró el análisis" },
        { status: 404 }
      )
    }

    return NextResponse.json({ analysis })
  } catch (cause) {
    if (cause instanceof ZodError) {
      return NextResponse.json(
        { message: "Identificador inválido" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        message:
          cause instanceof Error ? cause.message : "No se pudo cargar el análisis",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = analysisParamsSchema.parse(await params)
    const input = updateAnalysisSchema.parse(await request.json())
    const analysis = await createAnalysesRepository().updateMeta(id, input)

    return NextResponse.json({ analysis })
  } catch (cause) {
    if (cause instanceof ZodError) {
      return NextResponse.json(
        { message: "Datos inválidos", details: cause.issues.map((i) => i.message) },
        { status: 400 }
      )
    }

    if (
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "23505"
    ) {
      return NextResponse.json(
        { message: "Ya existe un informe activo en ese mes" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        message:
          cause instanceof Error ? cause.message : "No se pudo editar el informe",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = analysisParamsSchema.parse(await params)
    await createAnalysesRepository().remove(id)

    return NextResponse.json({ ok: true })
  } catch (cause) {
    if (cause instanceof ZodError) {
      return NextResponse.json(
        { message: "Identificador inválido" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        message:
          cause instanceof Error ? cause.message : "No se pudo eliminar el informe",
      },
      { status: 500 }
    )
  }
}
