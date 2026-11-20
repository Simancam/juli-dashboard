import { describe, expect, it } from "vitest"

import { getCommissionProfile } from "@/lib/config/commission-profiles"
import {
  applyReassignments,
  calculateCommission,
  filterLinesBySellers,
} from "@/services/commissions/commissionService"
import { makeSaleLineDraft } from "@/tests/fixtures/sales"

const profile = getCommissionProfile()

describe("commissionService", () => {
  it("aplica 2% a sus ventas y 1% a los demas vendedores", () => {
    const lines = [
      makeSaleLineDraft({
        sellerKey: profile.sellerKey,
        sellerName: profile.sellerKey,
        subtotalCents: 5_793_076_900,
      }),
      makeSaleLineDraft({
        documentNumber: "FEV-2",
        sellerKey: "CABARCAS CASTILLO LUIS JOSE",
        sellerName: "CABARCAS CASTILLO LUIS JOSE",
        subtotalCents: 264_468_160_600,
      }),
    ]

    const { result, warnings } = calculateCommission(lines, profile)

    expect(result.ownCents).toBe(5_793_076_900)
    expect(result.teamCents).toBe(264_468_160_600)
    expect(result.ownCommissionCents).toBe(115_861_538)
    expect(result.teamCommissionCents).toBe(2_644_681_606)
    expect(result.totalCommissionCents).toBe(2_760_543_144)
    expect(result.netToPayCents).toBe(2_760_543_144)
    expect(warnings).toEqual([])
  })

  it("respeta el ejemplo: 50M propios + 1M del equipo", () => {
    const lines = [
      makeSaleLineDraft({
        sellerKey: profile.sellerKey,
        sellerName: profile.sellerKey,
        subtotalCents: 5_000_000_000,
      }),
      makeSaleLineDraft({
        documentNumber: "FEV-2",
        sellerKey: "OTRO VENDEDOR",
        sellerName: "OTRO VENDEDOR",
        subtotalCents: 100_000_000,
      }),
    ]

    const { result } = calculateCommission(lines, profile)

    expect(result.ownCents).toBe(5_000_000_000)
    expect(result.teamCents).toBe(100_000_000)
    expect(result.ownCommissionCents).toBe(100_000_000)
    expect(result.teamCommissionCents).toBe(1_000_000)
    expect(result.totalCommissionCents).toBe(101_000_000)
  })

  it("filtra por vendedores antes de calcular la comision", () => {
    const lines = [
      makeSaleLineDraft({
        sellerKey: profile.sellerKey,
        sellerName: profile.sellerKey,
        subtotalCents: 5_000_000_000,
      }),
      makeSaleLineDraft({
        documentNumber: "FEV-2",
        sellerKey: "VENDEDOR A",
        sellerName: "VENDEDOR A",
        subtotalCents: 100_000_000,
      }),
      makeSaleLineDraft({
        documentNumber: "FEV-3",
        sellerKey: "VENDEDOR B",
        sellerName: "VENDEDOR B",
        subtotalCents: 200_000_000,
      }),
    ]

    expect(filterLinesBySellers(lines)).toHaveLength(3)
    expect(filterLinesBySellers(lines, ["VENDEDOR A"])).toHaveLength(1)
    expect(filterLinesBySellers(lines, [])).toHaveLength(0)

    const { result } = calculateCommission(
      filterLinesBySellers(lines, [profile.sellerKey, "VENDEDOR B"]),
      profile
    )

    expect(result.ownCents).toBe(5_000_000_000)
    expect(result.teamCents).toBe(200_000_000)
    expect(result.totalCommissionCents).toBe(102_000_000)
  })

  it("mueve una línea reasignada del 1% al 2% sin mutar el original", () => {
    const original = makeSaleLineDraft({
      documentNumber: "FEV-REASIGNADA",
      sellerKey: "CABARCAS CASTILLO LUIS JOSE",
      sellerName: "CABARCAS CASTILLO LUIS JOSE",
      subtotalCents: 10_000_000,
    })
    const entries = [{ id: 7, line: original }]

    const before = calculateCommission([original], profile).result
    expect(before.teamCents).toBe(10_000_000)
    expect(before.teamCommissionCents).toBe(100_000)
    expect(before.ownCents).toBe(0)

    const { lines, reassignments } = applyReassignments(
      entries,
      [7],
      profile.sellerKey
    )
    const after = calculateCommission(lines, profile).result

    expect(after.ownCents).toBe(10_000_000)
    expect(after.teamCents).toBe(0)
    expect(after.ownCommissionCents).toBe(200_000)
    expect(after.teamCommissionCents).toBe(0)

    // La original no se toca y la copia queda a nombre del perfil.
    expect(original.sellerKey).toBe("CABARCAS CASTILLO LUIS JOSE")
    expect(lines[0]).not.toBe(original)
    expect(lines[0].sellerKey).toBe(profile.sellerKey)

    expect(reassignments).toEqual([
      {
        id: 7,
        originalSellerKey: "CABARCAS CASTILLO LUIS JOSE",
        assignedTo: profile.sellerKey,
        subtotalCents: 10_000_000,
      },
    ])
  })

  it("ignora reasignaciones de líneas ausentes y sin ids", () => {
    const line = makeSaleLineDraft({
      sellerKey: "VENDEDOR A",
      sellerName: "VENDEDOR A",
      subtotalCents: 10_000_000,
    })
    const entries = [{ id: 1, line }]

    expect(applyReassignments(entries, [99], profile.sellerKey).reassignments).toEqual(
      []
    )
    expect(applyReassignments(entries, undefined, profile.sellerKey).lines).toEqual([
      line,
    ])
  })

  it("resta el anticipo y avisa si falta la vendedora", () => {
    const lines = [
      makeSaleLineDraft({
        sellerKey: "OTRO VENDEDOR",
        sellerName: "OTRO VENDEDOR",
        subtotalCents: 10_000_000,
      }),
    ]

    const { result, warnings } = calculateCommission(lines, profile, 100_000)

    expect(result.ownCommissionCents).toBe(0)
    expect(result.teamCommissionCents).toBe(100_000)
    expect(result.advanceCents).toBe(100_000)
    expect(result.netToPayCents).toBe(0)
    expect(warnings).toHaveLength(1)
  })
})
