import { roundRateToCents } from "@/utils/money"
import type {
  CommissionProfile,
  CommissionResult,
  Reassignment,
} from "@/types/commissions"
import type { SaleLineDraft } from "@/types/sales"

/** Filtra las líneas por vendedores. `undefined` significa todos. */
export function filterLinesBySellers<T extends SaleLineDraft>(
  lines: T[],
  sellerKeys?: string[]
): T[] {
  if (!sellerKeys) {
    return lines
  }

  const keys = new Set(sellerKeys)

  return lines.filter((line) => keys.has(line.sellerKey))
}

/**
 * Reasigna líneas al vendedor del perfil sin mutar las originales: devuelve
 * copias con el vendedor efectivo cambiado y la constancia de cada cambio.
 */
export function applyReassignments(
  entries: Array<{ id: number; line: SaleLineDraft }>,
  reassignedIds: number[] | undefined,
  targetSellerKey: string
): { lines: SaleLineDraft[]; reassignments: Reassignment[] } {
  const ids = new Set(reassignedIds ?? [])
  const reassignments: Reassignment[] = []

  const lines = entries.map(({ id, line }) => {
    if (!ids.has(id)) {
      return line
    }

    reassignments.push({
      id,
      originalSellerKey: line.sellerKey,
      assignedTo: targetSellerKey,
      subtotalCents: line.subtotalCents,
    })

    return {
      ...line,
      sellerKey: targetSellerKey,
      sellerName: targetSellerKey,
    }
  })

  return { lines, reassignments }
}

/**
 * Comisión = ownRate sobre las ventas de la vendedora del perfil
 *          + teamRate sobre las ventas de todos los demás vendedores.
 * Las bases son la suma directa de `Valor subtotal local` (sin IVA ni
 * `Valor neto`); las NCE ya vienen en negativo y por eso descuentan.
 * Ejemplo: si ella vende 50M y el equipo 1M, cobra 2% de 50M + 1% de 1M.
 */
export function calculateCommission(
  lines: SaleLineDraft[],
  profile: CommissionProfile,
  advanceCents = 0
): { result: CommissionResult; warnings: string[] } {
  const warnings: string[] = []

  let ownSalesCents = 0
  let teamCents = 0
  let sellerFound = false

  for (const line of lines) {
    if (line.sellerKey === profile.sellerKey) {
      ownSalesCents += line.subtotalCents
      sellerFound = true
    } else {
      teamCents += line.subtotalCents
    }
  }

  if (lines.length === 0) {
    warnings.push("No hay líneas en la selección actual")
  }

  if (!sellerFound) {
    warnings.push(
      `La vendedora ${profile.sellerKey} no aparece en las líneas analizadas`
    )
  }

  const ownCommissionCents = roundRateToCents(
    ownSalesCents,
    profile.ownRate
  )
  const teamCommissionCents = roundRateToCents(teamCents, profile.teamRate)
  const totalCommissionCents = ownCommissionCents + teamCommissionCents

  return {
    result: {
      ownCents: ownSalesCents,
      teamCents,
      ownCommissionCents,
      teamCommissionCents,
      totalCommissionCents,
      advanceCents,
      netToPayCents: totalCommissionCents - advanceCents,
    },
    warnings,
  }
}
