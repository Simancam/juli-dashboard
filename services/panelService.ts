import type { PanelResponse } from "@/types/panel"

export interface PanelParams {
  year?: number
  from?: string
  to?: string
  seller?: string[]
  chartMonth?: string
}

export async function getPanel(params: PanelParams = {}): Promise<PanelResponse> {
  const query = new URLSearchParams()

  if (params.year !== undefined) query.set("year", String(params.year))
  if (params.from) query.set("from", params.from)
  if (params.to) query.set("to", params.to)
  params.seller?.forEach((seller) => query.append("seller", seller))
  if (params.chartMonth) query.set("chartMonth", params.chartMonth)

  const response = await fetch(`/api/panel?${query.toString()}`, {
    cache: "no-store",
  })
  const data = (await response.json().catch(() => null)) as
    | (PanelResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo cargar el panel")
  }

  return data
}
