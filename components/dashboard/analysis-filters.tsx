"use client"

import * as React from "react"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useDashboardData } from "@/hooks/useDashboardData"
import { parseAmountToCents } from "@/utils/money"
import type { ProductMetric, ProductOrder } from "@/types/overview"

const selectClass =
  "h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"

export function AnalysisFilters() {
  const { overview, filters, isLoading, applyFilters } = useDashboardData()
  const [from, setFrom] = React.useState(overview?.period.start ?? "")
  const [to, setTo] = React.useState(overview?.period.end ?? "")
  const [advance, setAdvance] = React.useState(
    String(Math.round(filters.advanceCents / 100))
  )
  const [metric, setMetric] = React.useState<ProductMetric>(filters.metric)
  const [order, setOrder] = React.useState<ProductOrder>(filters.order)
  const [limit, setLimit] = React.useState(filters.limit)
  const [includeNonProducts, setIncludeNonProducts] = React.useState(
    filters.includeNonProducts
  )

  if (!overview) {
    return null
  }

  const handleApply = async () => {
    await applyFilters({
      from,
      to,
      metric,
      order,
      limit,
      includeNonProducts,
      advanceCents: parseAmountToCents(advance) ?? 0,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Ajustar análisis</CardTitle>
        <CardDescription>
          Periodo y anticipo afectan los resultados. La comisión usa todos los
          vendedores del archivo dentro del periodo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-xs">
          <span className="font-medium">Desde</span>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium">Hasta</span>
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium">Anticipo (COP)</span>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={advance}
            onChange={(event) => setAdvance(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium">Ranking por</span>
          <select
            className={selectClass}
            value={metric}
            onChange={(event) => setMetric(event.target.value as ProductMetric)}
          >
            <option value="value">Valor</option>
            <option value="quantity">Cantidad</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium">Orden</span>
          <select
            className={selectClass}
            value={order}
            onChange={(event) => setOrder(event.target.value as ProductOrder)}
          >
            <option value="desc">Mayores primero</option>
            <option value="asc">Menores primero</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium">Límite</span>
          <Input
            type="number"
            min="1"
            max="50"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value) || 1)}
          />
        </label>
        <label className="flex items-end gap-2 pb-1 text-xs">
          <input
            type="checkbox"
            checked={includeNonProducts}
            onChange={(event) => setIncludeNonProducts(event.target.checked)}
          />
          Incluir servicios y otros no producto
        </label>
        <div className="flex items-end">
          <Button onClick={handleApply} disabled={isLoading}>
            {isLoading ? <LoaderCircleIcon className="animate-spin" /> : null}
            Aplicar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
