"use client"

import * as React from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SavedAnalysis } from "@/types/analyses"
import type { RankedEntry } from "@/types/analytics"
import type { OverviewResponse } from "@/types/overview"
import {
  formatDate,
  formatInteger,
  formatMargin,
  formatMoney,
  formatPercent,
} from "@/utils/format"

interface SavedAnalysisViewProps {
  analysis: SavedAnalysis
  overview: OverviewResponse
}

function Kpi({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0.5">
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function Ranking({ title, entries }: { title: string; entries: RankedEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {entries.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-y bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Venta neta</th>
                <th className="px-3 py-2 text-right font-medium">Participación</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.key} className="border-b last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                  <td className="max-w-64 truncate px-3 py-2" title={entry.label}>
                    {entry.label}
                    {entry.unit ? (
                      <span className="ml-1 text-muted-foreground">({entry.unit})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(entry.netSalesCents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPercent(entry.share)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {entry.quantity === undefined
                      ? "—"
                      : formatInteger(entry.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

export function SavedAnalysisView({ analysis, overview }: SavedAnalysisViewProps) {
  const { kpis, commission } = overview

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {analysis.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe del {formatDate(analysis.periodStart)} al{" "}
            {formatDate(analysis.periodEnd)} · {analysis.periodStart.slice(0, 4)} ·{" "}
            {analysis.fileName} · guardado el{" "}
            {formatDate(analysis.createdAt.slice(0, 10))}
          </p>
        </div>
        <Link className={buttonVariants({ variant: "ghost" })} href="/dashboard/analizar">
          Volver a Informes
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Esta es la consulta que se guardó en su momento. Las cifras no se vuelven
        a calcular al abrirla.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Venta neta" hint="Incluye NCE" value={formatMoney(kpis.netSalesCents)} />
        <Kpi label="Venta bruta" hint="Sin devoluciones" value={formatMoney(kpis.grossSalesCents)} />
        <Kpi label="Devoluciones" hint="NCE del periodo" value={formatMoney(kpis.returnsCents)} />
        <Kpi label="Tasa de devolución" hint="NCE / venta bruta" value={formatPercent(kpis.returnRate)} />
        <Kpi label="Comprobantes" hint="Facturas y NCE" value={formatInteger(kpis.documents)} />
        <Kpi label="Clientes" hint="Con venta neta" value={formatInteger(kpis.clients)} />
        <Kpi label="Ticket promedio" hint="Neta / factura" value={formatMoney(kpis.avgTicketCents)} />
        <Kpi label="Margen" hint="Ponderado" value={formatMargin(kpis.weightedMargin)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comisión guardada</CardTitle>
          <CardDescription>
            {commission.sellerKey} · {formatPercent(commission.ownRate)} propio +{" "}
            {formatPercent(commission.teamRate)} de equipo · anticipo{" "}
            {formatMoney(commission.result.advanceCents)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Venta propia</p>
            <p className="tabular-nums">{formatMoney(commission.result.ownCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Comisión propia</p>
            <p className="tabular-nums">{formatMoney(commission.result.ownCommissionCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Venta equipo</p>
            <p className="tabular-nums">{formatMoney(commission.result.teamCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Comisión equipo</p>
            <p className="tabular-nums">{formatMoney(commission.result.teamCommissionCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total comisión</p>
            <p className="font-medium tabular-nums">
              {formatMoney(commission.result.totalCommissionCents)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {commission.result.netToPayCents < 0 ? "Saldo a favor" : "Neto a pagar"}
            </p>
            <p className="font-medium tabular-nums">
              {formatMoney(Math.abs(commission.result.netToPayCents))}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranking title="Productos" entries={overview.products} />
        <Ranking title="Productos devueltos" entries={overview.returnedProducts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Líneas del informe</CardTitle>
          <CardDescription>
            {formatInteger(overview.table.length)} líneas en el periodo guardado.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-96 overflow-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-y bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Vendedor</th>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {overview.table.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2 tabular-nums">{formatDate(row.date)}</td>
                  <td className="px-3 py-2">{row.documentNumber}</td>
                  <td className="max-w-40 truncate px-3 py-2" title={row.sellerKey}>
                    {row.sellerKey}
                  </td>
                  <td className="max-w-64 truncate px-3 py-2" title={row.productLabel}>
                    {row.productLabel}
                    {row.isReturn ? (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">NCE</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatInteger(row.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(row.subtotalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
