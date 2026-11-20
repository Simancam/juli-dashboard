"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardData } from "@/hooks/useDashboardData"
import type { Kpis } from "@/types/analytics"
import {
  formatInteger,
  formatMargin,
  formatMoney,
  formatPercent,
} from "@/utils/format"

interface KpiDefinition {
  label: string
  hint: string
  value: (kpis: Kpis) => string
}

const KPIS: KpiDefinition[] = [
  {
    label: "Venta neta",
    hint: "Incluye NCE",
    value: (kpis) => formatMoney(kpis.netSalesCents),
  },
  {
    label: "Venta bruta",
    hint: "Sin devoluciones",
    value: (kpis) => formatMoney(kpis.grossSalesCents),
  },
  {
    label: "Devoluciones",
    hint: "NCE del periodo",
    value: (kpis) => formatMoney(kpis.returnsCents),
  },
  {
    label: "Tasa de devolución",
    hint: "NCE / venta bruta",
    value: (kpis) => formatPercent(kpis.returnRate),
  },
  {
    label: "Documentos",
    hint: "Facturas distintas",
    value: (kpis) => formatInteger(kpis.documents),
  },
  {
    label: "Clientes",
    hint: "Con venta neta",
    value: (kpis) => formatInteger(kpis.clients),
  },
  {
    label: "Ticket promedio",
    hint: "Neta / factura",
    value: (kpis) => formatMoney(kpis.avgTicketCents),
  },
  {
    label: "Margen ponderado",
    hint: "Sobre líneas positivas",
    value: (kpis) => formatMargin(kpis.weightedMargin),
  },
]

export function KpiCards() {
  const { overview } = useDashboardData()

  if (!overview) {
    return null
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {KPIS.map((kpi) => (
        <Card key={kpi.label} size="sm">
          <CardHeader>
            <CardTitle>{kpi.label}</CardTitle>
            <CardDescription>{kpi.hint}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="truncate text-base font-medium" title={kpi.value(overview.kpis)}>
              {kpi.value(overview.kpis)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
