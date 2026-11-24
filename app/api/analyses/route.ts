import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { analysisListQuerySchema } from "@/lib/schemas/analyses"
import { createAnalysesRepository } from "@/services/repositories/analysesRepository"

export async function GET(request: Request) {
  try {
    const query = analysisListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams)
    )
    const analyses = await createAnalysesRepository().list(query.status)

    return NextResponse.json({ analyses })
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
          cause instanceof Error
            ? cause.message
            : "No se pudo listar los análisis",
      },
      { status: 500 }
    )
  }
}
