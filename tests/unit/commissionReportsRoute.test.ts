import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  GET,
  PATCH,
  DELETE,
} from "@/app/api/commission-reports/[id]/route"
import { POST as POST_COLLECTION } from "@/app/api/commission-reports/route"
import { getCommissionProfile } from "@/lib/config/commission-profiles"
import type {
  CreateCommissionReportInput,
  UpdateCommissionReportInput,
} from "@/services/repositories/commissionReportsRepository"
import { makeSaleLineDraft } from "@/tests/fixtures/sales"
import type { SavedCommissionReport } from "@/types/commission-reports"

const profile = getCommissionProfile()
const analysisId = "11111111-1111-4111-8111-111111111111"
const reportId = "22222222-2222-4222-8222-222222222222"
const missingId = "33333333-3333-4333-8333-333333333333"

const currentReport: SavedCommissionReport = {
  id: reportId,
  analysisId,
  version: 2,
  sellerKey: profile.sellerKey,
  ownRate: profile.ownRate,
  teamRate: profile.teamRate,
  advanceCents: 0,
  inputs: { sellers: [profile.sellerKey], reassignedLines: [] },
  result: {} as SavedCommissionReport["result"],
  reassignments: [],
  warnings: [],
  createdBy: "admin",
  createdAt: "2025-10-31T00:00:00.000Z",
}

let saved: CreateCommissionReportInput | null = null
let updated: UpdateCommissionReportInput | null = null
let removedId: string | null = null

vi.mock("@/services/repositories/analysesRepository", () => ({
  createAnalysesRepository: () => ({
    getById: async () => ({
      id: analysisId,
      datasetId: "dataset-1",
      periodStart: "2025-10-01",
      periodEnd: "2025-10-31",
    }),
    getLines: async () => [
      {
        ...makeSaleLineDraft({
          sellerKey: profile.sellerKey,
          subtotalCents: 1_000_000,
        }),
        lineNo: 1,
      },
      {
        ...makeSaleLineDraft({
          documentNumber: "FEV-2",
          sellerKey: "VENDEDOR A",
          subtotalCents: 2_000_000,
        }),
        lineNo: 2,
      },
      {
        ...makeSaleLineDraft({
          documentNumber: "FEV-3",
          sellerKey: "VENDEDOR B",
          subtotalCents: 3_000_000,
        }),
        lineNo: 3,
      },
    ],
  }),
}))

vi.mock("@/services/repositories/commissionReportsRepository", () => ({
  createCommissionReportsRepository: () => ({
    list: async () => [currentReport],
    getById: async (id: string) => (id === reportId ? currentReport : null),
    nextVersion: async () => 3,
    create: async (input: CreateCommissionReportInput) => {
      saved = input
      return { id: reportId, ...input }
    },
    update: async (id: string, input: UpdateCommissionReportInput) => {
      updated = input
      return { ...currentReport, ...input, id }
    },
    remove: async (id: string) => {
      removedId = id
    },
  }),
}))

describe("POST /api/commission-reports", () => {
  beforeEach(() => {
    saved = null
  })

  it("guarda la base completa aunque se marquen líneas para reasignar", async () => {
    const response = await POST_COLLECTION(
      new Request("http://localhost/api/commission-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          analysisId,
          sellers: [profile.sellerKey, "VENDEDOR A"],
          // Marcar líneas en la tabla no debe reducir la base guardada.
          selectedLines: [3],
          reassignedLines: [3],
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(saved).not.toBeNull()

    const inputs = saved!.inputs
    expect(inputs.selectedLines).toBeUndefined()
    expect(inputs.commissionLines?.map((line) => line.id)).toEqual([1, 2, 3])
    expect(inputs.commissionLines?.[2]).toMatchObject({
      sellerKey: "VENDEDOR B",
      effectiveSellerKey: profile.sellerKey,
      commissionCents: 60_000,
    })
    expect(saved!.result).toMatchObject({
      ownCents: 4_000_000,
      teamCents: 2_000_000,
      totalCommissionCents: 100_000,
    })
  })
})

describe("/api/commission-reports/[id]", () => {
  beforeEach(() => {
    updated = null
    removedId = null
  })

  it("recalcula al editar y permite pedir todos los vendedores", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/commission-reports/${reportId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          allSellers: true,
          advanceCents: 50_000,
          reassignedLines: [3],
        }),
      }),
      { params: Promise.resolve({ id: reportId }) }
    )

    expect(response.status).toBe(200)
    expect(updated).not.toBeNull()
    expect(updated!.advanceCents).toBe(50_000)
    expect(updated!.inputs.sellers).toBeUndefined()
    expect(updated!.inputs.reassignedLines).toEqual([3])
    expect(updated!.inputs.commissionLines?.map((line) => line.id)).toEqual([
      1, 2, 3,
    ])

    const body = (await response.json()) as { report: SavedCommissionReport }
    expect(body.report.id).toBe(reportId)
    expect(body.report.analysisId).toBe(analysisId)
    expect(body.report.version).toBe(2)
  })

  it("borra el reporte indicado", async () => {
    const response = await DELETE(
      new Request(`http://localhost/api/commission-reports/${reportId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: reportId }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(removedId).toBe(reportId)
  })

  it("devuelve 404 si el reporte no existe", async () => {
    const response = await GET(
      new Request(`http://localhost/api/commission-reports/${missingId}`),
      { params: Promise.resolve({ id: missingId }) }
    )

    expect(response.status).toBe(404)
  })
})
