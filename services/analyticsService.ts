import type { OverviewFilters, OverviewResponse } from "@/types/overview"

function buildQuery(filters: OverviewFilters): string {
  const params = new URLSearchParams({
    metric: filters.metric,
    order: filters.order,
    limit: String(filters.limit),
    advance: String(filters.advanceCents),
    includeNonProducts: String(filters.includeNonProducts),
  })

  if (filters.from && filters.to) {
    params.set("from", filters.from)
    params.set("to", filters.to)
  }

  if (filters.sellers !== undefined) {
    if (filters.sellers.length === 0) {
      params.set("sellers", "")
    } else {
      for (const seller of filters.sellers) {
        params.append("sellers", seller)
      }
    }
  }

  if (filters.selectedLines !== undefined) {
    if (filters.selectedLines.length === 0) {
      params.set("selectedLines", "")
    } else {
      for (const id of filters.selectedLines) {
        params.append("selectedLines", String(id))
      }
    }
  }

  if (filters.reassignedLines !== undefined) {
    if (filters.reassignedLines.length === 0) {
      params.set("reassignedLines", "")
    } else {
      for (const id of filters.reassignedLines) {
        params.append("reassignedLines", String(id))
      }
    }
  }

  return params.toString()
}

async function getOverview(
  file: File,
  filters: OverviewFilters
): Promise<OverviewResponse> {
  const body = new FormData()
  body.append("file", file)

  const response = await fetch(
    `/api/analytics/overview?${buildQuery(filters)}`,
    { method: "POST", body }
  )

  const data = (await response.json().catch(() => null)) as
    | (OverviewResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo analizar el archivo")
  }

  return data
}

export const analyticsService = { getOverview }
