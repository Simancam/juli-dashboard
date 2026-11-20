import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ingestSalesWorkbook } from "@/services/ingestion/ingestionService"

const SALES_FILE = join(
  process.cwd(),
  "docs",
  "Informe ventasJM 21_10_2026 AL 18_11_2026.xlsx"
)

const hasSalesFile = existsSync(SALES_FILE)

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0)

describe.skipIf(!hasSalesFile)("ingesta del informe de ventas real", () => {
  const load = async () =>
    ingestSalesWorkbook({
      buffer: readFileSync(SALES_FILE),
      fileName: "Informe ventasJM 21_10_2026 AL 18_11_2026.xlsx",
    })

  it("produce las líneas y totales de referencia del brief", async () => {
    const result = await load()
    const { report, lines } = result

    expect(report.rowsRead).toBe(255)
    expect(report.validRows).toBe(254)
    expect(report.invalidRows).toBe(0)
    expect(report.excludedByStatus).toBe(1)
    expect(report.excludedByStatusDetail).toEqual({ "EN ELABORACION": 1 })
    expect(lines).toHaveLength(254)

    // Cifras del brief en pesos, almacenadas en centavos.
    expect(sum(lines.map((line) => line.subtotalCents))).toBe(270_261_237_500)

    const returns = lines.filter((line) => line.docType === "NCE")
    expect(sum(returns.map((line) => line.subtotalCents))).toBe(-30_900_822_800)

    const gross = lines.filter((line) => line.docType !== "NCE")
    expect(sum(gross.map((line) => line.subtotalCents))).toBe(301_162_060_300)

    expect(new Set(lines.map((line) => line.documentNumber)).size).toBe(133)
    expect(new Set(lines.map((line) => line.clientKey)).size).toBe(50)
  })

  it("detecta periodo real y periodo sugerido del nombre", async () => {
    const { report } = await load()

    expect(report.detectedRange).toEqual({
      start: "2026-10-21",
      end: "2026-11-18",
    })
    expect(report.suggestedPeriod).toEqual({
      start: "2026-10-21",
      end: "2026-11-18",
    })
    expect(report.suggestedName).toBe(
      "Informe ventasJM 21_10_2026 AL 18_11_2026.xlsx"
    )
  })

  it("conserva duplicados exactos y los reporta", async () => {
    const { report, lines } = await load()

    expect(report.exactDuplicates).toBe(4)
    expect(lines).toHaveLength(254)
  })

  it("señala vendedores con varias cédulas y márgenes atípicos", async () => {
    const { report } = await load()

    expect(report.sellersWithMultipleIds).toEqual([
      {
        sellerKey: "VERGARA BARRIENTOS MARJORIE CECILIA",
        sellerIds: ["1042454589", "1129573789"],
      },
    ])
    expect(report.atypicalMargins).toEqual({
      fullMargin: 45,
      negativeMargin: 17,
    })
  })

  it("normaliza vendedores, C.O. y devoluciones", async () => {
    const { lines } = await load()

    expect(
      lines.some((line) => line.sellerKey === "RINCON  ANDREINA")
    ).toBe(false)
    expect(
      lines.find((line) => line.sellerKey === "RINCON ANDREINA")?.sellerKey
    ).toBe("RINCON ANDREINA")

    expect(lines.every((line) => line.costCenter.length >= 3)).toBe(true)
    expect(lines.some((line) => line.costCenter === "001")).toBe(true)

    const nce = lines.filter((line) => line.docType === "NCE")
    expect(nce.every((line) => line.isReturn)).toBe(true)
    expect(nce.every((line) => line.isProduct)).toBe(true)

    const service = lines.find(
      (line) => line.familyKey === "SERV" || line.familyKey === "PROYECTOS"
    )
    expect(service?.isProduct).toBe(false)
  })

  it("calcula un hash estable con el mismo buffer", async () => {
    const first = await load()
    const second = await load()

    expect(first.fileHash).toMatch(/^[a-f0-9]{64}$/)
    expect(second.fileHash).toBe(first.fileHash)
  })
})
