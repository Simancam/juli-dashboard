import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"

import { IngestionError } from "@/services/ingestion/ingestionError"
import { ingestSalesWorkbook } from "@/services/ingestion/ingestionService"

async function buildWorkbook(
  rows: Array<Array<string | number | null>>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Sheet1")

  for (const row of rows) {
    sheet.addRow(row)
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return Buffer.from(buffer)
}

describe("ingesta: validación de estructura", () => {
  it("rechaza archivos sin la fila de encabezados", async () => {
    const buffer = await buildWorkbook([
      ["Reporte sin columnas reconocibles"],
      ["otra fila", "cualquiera"],
    ])

    await expect(
      ingestSalesWorkbook({ buffer, fileName: "archivo.xlsx" })
    ).rejects.toBeInstanceOf(IngestionError)
  })

  it("enumera las columnas obligatorias faltantes", async () => {
    const buffer = await buildWorkbook([
      ["C.O.", "Nro documento", "Fecha", "Estado"],
      ["001", "FEV-1", "2026-10-21", "Aprobada"],
    ])

    try {
      await ingestSalesWorkbook({ buffer, fileName: "archivo.xlsx" })
      throw new Error("se esperaba IngestionError")
    } catch (cause) {
      expect(cause).toBeInstanceOf(IngestionError)
      const error = cause as IngestionError

      expect(error.status).toBe(422)
      expect(error.details).toContain("Razón social cliente factura")
      expect(error.details).toContain("Valor subtotal local")
    }
  })

  it("ignora filas sin número de documento", async () => {
    const buffer = await buildWorkbook([
      [
        "C.O.",
        "Nro documento",
        "Fecha",
        "Estado",
        "Razón social cliente factura",
        "Bodega",
        "Item",
        "Desc. ítem",
        "U.M. inv.",
        "Cantidad inv.",
        "Márgen promedio",
        "Valor subtotal local",
        "Valor neto",
        "Vendedor",
        "Nombre vendedor movto.",
      ],
      [
        "001",
        "FEF-1",
        "2026-10-21",
        "Aprobada",
        "CLIENTE UNO",
        "BOGOTA",
        "ABRAZ-1",
        "ABRAZADERA 1/2",
        "UND",
        2,
        20,
        100000,
        120000,
        "1000",
        "MONTES CUELLO JULIANA",
      ],
      [null, null, null, "Total", null, null, null, null, null, null, null, 100000],
    ])

    const result = await ingestSalesWorkbook({
      buffer,
      fileName: "archivo.xlsx",
    })

    expect(result.report.rowsRead).toBe(1)
    expect(result.report.validRows).toBe(1)
    expect(result.lines[0]).toMatchObject({
      documentNumber: "FEF-1",
      docType: "FEF",
      date: "2026-10-21",
      costCenter: "001",
      sellerKey: "MONTES CUELLO JULIANA",
      subtotalCents: 10_000_000,
      familyKey: "ABRAZADERAS",
      isProduct: true,
      isReturn: false,
    })
  })
})
