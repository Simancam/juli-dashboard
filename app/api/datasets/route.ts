import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { datasetUploadQuerySchema } from "@/lib/schemas/datasets"
import { ingestSalesWorkbook } from "@/services/ingestion/ingestionService"
import { IngestionError } from "@/services/ingestion/ingestionError"
import { readSalesUpload } from "@/services/ingestion/uploadRequest"

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const query = datasetUploadQuerySchema.parse(
      Object.fromEntries(url.searchParams)
    )

    const file = await readSalesUpload(request)

    const result = await ingestSalesWorkbook({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
    })

    if (query.dryRun !== true) {
      return NextResponse.json(
        {
          message:
            "La persistencia de datasets se habilita en la fase 3. Usa `dryRun=true`.",
        },
        { status: 501 }
      )
    }

    return NextResponse.json({
      dryRun: true as const,
      fileName: result.fileName,
      fileHash: result.fileHash,
      report: result.report,
      conflicts: [],
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
      { message: "No se pudo procesar el archivo" },
      { status: 500 }
    )
  }
}
