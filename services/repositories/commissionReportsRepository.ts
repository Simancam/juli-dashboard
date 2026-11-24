import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import type {
  CommissionReportInputs,
  SavedCommissionReport,
} from "@/types/commission-reports"
import type {
  CommissionResult,
  Reassignment,
} from "@/types/commissions"
import type { Database } from "@/types/database.types"

import { asJson, mapCommissionReportRow } from "./mappers"

type Client = SupabaseClient<Database>

export interface CreateCommissionReportInput {
  analysisId: string
  version: number
  sellerKey: string
  ownRate: number
  teamRate: number
  advanceCents: number
  inputs: CommissionReportInputs & { reassignments: Reassignment[] }
  result: CommissionResult
  warnings: string[]
}

export interface CommissionReportsRepository {
  list(analysisId?: string): Promise<SavedCommissionReport[]>
  nextVersion(analysisId: string): Promise<number>
  create(input: CreateCommissionReportInput): Promise<SavedCommissionReport>
}

export function createCommissionReportsRepository(
  client: Client = getSupabaseAdmin()
): CommissionReportsRepository {
  return {
    async list(analysisId) {
      let query = client.from("commission_reports").select("*")

      if (analysisId) {
        query = query.eq("analysis_id", analysisId)
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("version", { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapCommissionReportRow)
    },

    async nextVersion(analysisId) {
      const { data, error } = await client
        .from("commission_reports")
        .select("version")
        .eq("analysis_id", analysisId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw new Error(error.message)

      return (data?.version ?? 0) + 1
    },

    async create(input) {
      const { data, error } = await client
        .from("commission_reports")
        .insert({
          analysis_id: input.analysisId,
          version: input.version,
          seller_key: input.sellerKey,
          own_rate: input.ownRate,
          team_rate: input.teamRate,
          advance_cents: input.advanceCents,
          inputs: asJson(input.inputs),
          result: asJson(input.result),
          warnings: asJson(input.warnings),
          created_by: "admin",
        })
        .select("*")
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? "No se pudo guardar el reporte")
      }

      return mapCommissionReportRow(data)
    },
  }
}
