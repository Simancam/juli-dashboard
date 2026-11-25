import { getCommissionProfile } from "@/lib/config/commission-profiles"
import { filterLinesByPeriod } from "@/services/analytics/analyticsService"
import {
  buildCommissionCalculation,
  toSavedCommissionLines,
} from "@/services/commissions/commissionService"
import type { CommissionReportInputs } from "@/types/commission-reports"
import type { CommissionResult, Reassignment } from "@/types/commissions"
import type { SaleLineDraft } from "@/types/sales"

type StoredLine = SaleLineDraft & { lineNo: number }

export interface CalculateCommissionReportInput {
  periodStart: string
  periodEnd: string
  lines: StoredLine[]
  sellerKey?: string
  ownRate?: number
  teamRate?: number
  advanceCents?: number
  /** Undefined = todos los vendedores; array vacío = ninguno. */
  sellers?: string[]
  reassignedLines?: number[]
}

export interface CalculatedCommissionReport {
  sellerKey: string
  ownRate: number
  teamRate: number
  advanceCents: number
  inputs: CommissionReportInputs & { reassignments: Reassignment[] }
  result: CommissionResult
  warnings: string[]
}

/**
 * Cálculo canónico para guardar y editar. Recibe solo entradas y devuelve el
 * snapshot completo: resultado, reasignaciones y todas las líneas de la base.
 */
export function calculateCommissionReport(
  input: CalculateCommissionReportInput
): CalculatedCommissionReport {
  const profile = getCommissionProfile(input.sellerKey)
  const effectiveProfile = {
    ...profile,
    ownRate: input.ownRate ?? profile.ownRate,
    teamRate: input.teamRate ?? profile.teamRate,
  }
  const lines = filterLinesByPeriod(input.lines, {
    start: input.periodStart,
    end: input.periodEnd,
  })
  const calculated = buildCommissionCalculation(
    lines.map((line) => ({ id: line.lineNo, line })),
    {
      sellers: input.sellers,
      reassignedLines: input.reassignedLines,
      profile: effectiveProfile,
      advanceCents: input.advanceCents ?? 0,
    }
  )

  const periodIds = new Set(lines.map((line) => line.lineNo))
  const outOfPeriod = (input.reassignedLines ?? []).filter(
    (id) => !periodIds.has(id)
  )
  if (outOfPeriod.length > 0) {
    calculated.warnings.push(
      `${outOfPeriod.length} línea(s) reasignada(s) fuera del periodo`
    )
  }

  const originalSellerKeys = new Map(
    lines.map((line) => [line.lineNo, line.sellerKey])
  )

  return {
    sellerKey: effectiveProfile.sellerKey,
    ownRate: effectiveProfile.ownRate,
    teamRate: effectiveProfile.teamRate,
    advanceCents: input.advanceCents ?? 0,
    inputs: {
      ...(input.sellers !== undefined ? { sellers: input.sellers } : {}),
      ...(input.reassignedLines !== undefined
        ? { reassignedLines: input.reassignedLines }
        : {}),
      reassignments: calculated.reassignments,
      commissionLines: toSavedCommissionLines(
        calculated.entries,
        effectiveProfile,
        originalSellerKeys
      ),
    },
    result: calculated.result,
    warnings: calculated.warnings,
  }
}
