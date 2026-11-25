"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardData } from "@/hooks/useDashboardData"
import { formatInteger, formatMoney, formatPercent } from "@/utils/format"

export function ProductsRanking() {
  const { overview, filters } = useDashboardData()

  if (!overview) {
    return null
  }

  const byQuantity = filters.metric === "quantity"

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>
            Incluye servicios y otros no producto · ranking por{" "}
            {byQuantity
              ? "cantidad, separado por unidad de medida"
              : "venta neta"}{" "}
            · {filters.order === "desc" ? "mayores primero" : "menores primero"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="border-y bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">Unidad</th>
                <th className="px-3 py-2 text-right font-medium">Venta neta</th>
                <th className="px-3 py-2 text-right font-medium">Particip.</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {overview.products.map((product, index) => (
                <tr key={product.key} className="border-b last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="max-w-64 truncate px-3 py-2" title={product.label}>
                    {product.label}
                  </td>
                  <td className="px-3 py-2">{product.unit || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(product.netSalesCents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPercent(product.share)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatInteger(product.quantity ?? 0)}
                  </td>
                </tr>
              ))}
              {overview.products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    No hay productos para los filtros elegidos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos con neto ≤ 0</CardTitle>
          <CardDescription>
            Devueltos por completo o con saldo negativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {overview.returnedProducts.map((product) => (
            <div key={product.key} className="flex justify-between gap-3 border-b pb-1 last:border-0">
              <span className="truncate" title={product.label}>
                {product.label}
              </span>
              <span className="shrink-0 tabular-nums text-destructive">
                {formatMoney(product.netSalesCents)}
              </span>
            </div>
          ))}
          {overview.returnedProducts.length === 0 ? (
            <p className="text-muted-foreground">Ninguno en el periodo.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
