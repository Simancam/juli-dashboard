import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import type {
  DataCoverage,
  PanelChartPoint,
  PanelMonthlyPoint,
  PanelRankings,
  PanelSellerOption,
  PanelSummary,
} from "@/types/panel"
import type { Database } from "@/types/database.types"

import {
  mapChartPointRow,
  mapCoverageRow,
  mapMonthlyRow,
  mapPanelSummary,
  mapRankingRow,
} from "./mappers"

type Client = SupabaseClient<Database>

export interface PanelRepository {
  summary(from: string, to: string, sellerKeys: string[] | null): Promise<PanelSummary>
  monthly(
    from: string,
    to: string,
    sellerKeys: string[] | null
  ): Promise<PanelMonthlyPoint[]>
  chartPoints(
    from: string,
    to: string,
    granularity: "month" | "day",
    sellerKeys: string[] | null
  ): Promise<PanelChartPoint[]>
  coverage(): Promise<DataCoverage>
  rankings(
    from: string,
    to: string,
    limit: number,
    sellerKeys: string[] | null
  ): Promise<PanelRankings>
  /** Opciones del selector: siempre sin filtrar por vendedor. */
  sellers(from: string, to: string): Promise<PanelSellerOption[]>
}

function emptySummary(): PanelSummary {
  return {
    netSalesCents: 0,
    grossSalesCents: 0,
    returnsCents: 0,
    returnRate: 0,
    documents: 0,
    clients: 0,
    avgTicketCents: 0,
    weightedMargin: 0,
    lastDate: null,
    previousNetSalesCents: 0,
    previousLastDate: null,
  }
}

function sellerArg(sellerKeys: string[] | null): string[] | undefined {
  return sellerKeys ?? undefined
}

export function createPanelRepository(
  client: Client = getSupabaseAdmin()
): PanelRepository {
  async function ranking(
    name: "top_sellers" | "top_clients" | "sales_by_family" | "sales_by_warehouse",
    from: string,
    to: string,
    limit: number,
    sellerKeys: string[] | null
  ) {
    const { data, error } = await client.rpc(name, {
      p_from: from,
      p_to: to,
      p_limit: limit,
      p_seller_keys: sellerArg(sellerKeys),
    })

    if (error) throw new Error(error.message)

    return (data ?? []).map(mapRankingRow)
  }

  return {
    async summary(from, to, sellerKeys) {
      const { data, error } = await client.rpc("panel_summary", {
        p_from: from,
        p_to: to,
        p_seller_keys: sellerArg(sellerKeys),
      })

      if (error) throw new Error(error.message)

      return data?.[0] ? mapPanelSummary(data[0]) : emptySummary()
    },

    async monthly(from, to, sellerKeys) {
      const { data, error } = await client.rpc("sales_by_month", {
        p_from: from,
        p_to: to,
        p_seller_keys: sellerArg(sellerKeys),
      })

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapMonthlyRow)
    },

    async chartPoints(from, to, granularity, sellerKeys) {
      const { data, error } = await client.rpc("panel_chart_points", {
        p_from: from,
        p_to: to,
        p_granularity: granularity,
        p_seller_keys: sellerArg(sellerKeys),
      })

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapChartPointRow)
    },

    async coverage() {
      const { data, error } = await client.rpc("data_coverage", {})

      if (error) throw new Error(error.message)

      const row = data?.[0]

      return row
        ? mapCoverageRow(row)
        : {
            firstDate: null,
            lastDate: null,
            monthsWithData: 0,
            missingMonths: [],
            lastUploadAt: null,
            datasetsReady: 0,
          }
    },

    async sellers(from, to) {
      const { data, error } = await client.rpc("top_sellers", {
        p_from: from,
        p_to: to,
        p_limit: 200,
      })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => {
        const entry = mapRankingRow(row)
        return { key: entry.key, label: entry.label || entry.key }
      })
    },

    async rankings(from, to, limit, sellerKeys) {
      const { data, error } = await client.rpc("top_products", {
        p_from: from,
        p_to: to,
        p_metric: "value",
        p_order: "desc",
        p_limit: limit,
        p_include_non_products: false,
        p_seller_keys: sellerArg(sellerKeys),
      })

      if (error) throw new Error(error.message)

      const [sellers, clients, families, warehouses] = await Promise.all([
        ranking("top_sellers", from, to, limit, sellerKeys),
        ranking("top_clients", from, to, limit, sellerKeys),
        ranking("sales_by_family", from, to, limit, sellerKeys),
        ranking("sales_by_warehouse", from, to, limit, sellerKeys),
      ])

      return {
        products: (data ?? []).map(mapRankingRow),
        sellers,
        clients,
        families,
        warehouses,
      }
    },
  }
}
