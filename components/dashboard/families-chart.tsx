"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useDashboardData } from "@/hooks/useDashboardData"
import type { RankedEntry } from "@/types/analytics"
import {
  formatApproxMoney,
  formatInteger,
  formatMoney,
} from "@/utils/format"

const CHART_LIMIT = 8

const chartConfig = {
  value: {
    label: "Venta neta",
    color: "#3b82f6",
  },
} satisfies ChartConfig

interface FamiliesChartCardProps {
  families: RankedEntry[]
}

/** Ventas netas por familia de producto o servicio, con gráfico de barras de shadcn. */
export function FamiliesChartCard({ families }: FamiliesChartCardProps) {
  const top = families.slice(0, CHART_LIMIT)
  const rest = families.slice(CHART_LIMIT)
  const data = rest.length
    ? [
        ...top.map((family) => ({
          name: family.label,
          value: family.netSalesCents,
        })),
        {
          name: `Otros (${formatInteger(rest.length)})`,
          value: rest.reduce((total, family) => total + family.netSalesCents, 0),
        },
      ]
    : top.map((family) => ({
        name: family.label,
        value: family.netSalesCents,
      }))

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tipos de venta</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-[260px] flex-1 flex-col">
        {data.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
            No hay familias con venta para los filtros elegidos.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto min-h-[260px] w-full flex-1"
          >
            <BarChart data={data} layout="vertical" margin={{ right: 12 }}>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={100}
                tick={{ fontSize: 10 }}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => formatApproxMoney(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => {
                      const label =
                        typeof item?.payload?.name === "string"
                          ? item.payload.name
                          : "Venta neta"

                      return (
                        <div className="flex w-full items-center justify-between gap-6">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatMoney(Number(value))}
                          </span>
                        </div>
                      )
                    }}
                  />
                }
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function FamiliesChart() {
  const { overview } = useDashboardData()

  if (!overview) {
    return null
  }

  return <FamiliesChartCard families={overview.families ?? []} />
}
