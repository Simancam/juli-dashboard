"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

import { LinesTable } from "@/components/commissions/lines-table"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { analyticsService } from "@/services/analyticsService"
import { getAnalysis } from "@/services/analysesService"
import { getCommissionReport } from "@/services/commissionReportsService"
import type { SavedAnalysis } from "@/types/analyses"
import type { SavedCommissionReport } from "@/types/commission-reports"
import type { OverviewResponse } from "@/types/overview"
import {
  formatDate,
  formatInteger,
  formatMoney,
  formatPercent,
} from "@/utils/format"

interface CommissionDetailData {
  report: SavedCommissionReport
  analysis: SavedAnalysis
  overview: OverviewResponse
}

function CommissionDetailContent() {
  const params = useParams<{ id: string }>()
  const [data, setData] = React.useState<CommissionDetailData | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true

    async function load() {
      const report = await getCommissionReport(params.id)
      if (!report) throw new Error("No se encontró el reporte")

      const analysis = await getAnalysis(report.analysisId)
      const overview = await analyticsService.getOverviewByAnalysis(
        report.analysisId,
        {
          metric: "value",
          order: "desc",
          limit: 10,
          includeNonProducts: false,
          advanceCents: report.advanceCents,
          ownRate: report.ownRate,
          teamRate: report.teamRate,
          sellers: report.inputs.sellers,
          selectedLines: report.inputs.selectedLines,
          reassignedLines: report.inputs.reassignedLines ?? [],
        }
      )

      return { report, analysis, overview }
    }

    load()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo cargar el reporte"
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" /> Cargando reporte…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-destructive">{error ?? "No encontrado"}</p>
        <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/comisiones">
          Volver a Comisiones
        </Link>
      </div>
    )
  }

  const { report, analysis, overview } = data
  const { result, inputs, reassignments } = report
  const sellers = inputs.sellers ?? overview.sellers

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Reporte v{report.version} · {report.sellerKey}
          </h1>
          <p className="text-sm text-muted-foreground">
            {analysis.name} · {formatDate(analysis.periodStart)} al{" "}
            {formatDate(analysis.periodEnd)} · guardado el{" "}
            {formatDate(report.createdAt.slice(0, 10))}
          </p>
        </div>
        <Link className={buttonVariants({ variant: "ghost" })} href="/dashboard/comisiones">
          Volver a Comisiones
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Esta es la versión guardada. Las cifras y las elecciones no se vuelven a
        calcular al abrirla; la tabla solo permite revisar las líneas.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado guardado</CardTitle>
          <CardDescription>
            {formatPercent(report.ownRate)} propio + {formatPercent(report.teamRate)}{" "}
            de equipo · anticipo {formatMoney(report.advanceCents)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Venta propia</p>
            <p className="tabular-nums">{formatMoney(result.ownCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Comisión propia</p>
            <p className="tabular-nums">{formatMoney(result.ownCommissionCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Venta equipo</p>
            <p className="tabular-nums">{formatMoney(result.teamCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Comisión equipo</p>
            <p className="tabular-nums">{formatMoney(result.teamCommissionCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Anticipo</p>
            <p className="tabular-nums">{formatMoney(result.advanceCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total comisión</p>
            <p className="font-medium tabular-nums">
              {formatMoney(result.totalCommissionCents)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {result.netToPayCents < 0 ? "Saldo a favor" : "Neto a pagar"}
            </p>
            <p className="font-medium tabular-nums">
              {formatMoney(Math.abs(result.netToPayCents))}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Elecciones guardadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            <span className="text-muted-foreground">Vendedores incluidos: </span>
            {inputs.sellers === undefined
              ? "todos"
              : sellers.length === 0
                ? "ninguno"
                : sellers.join(", ")}
          </p>
          <p>
            <span className="text-muted-foreground">Líneas elegidas: </span>
            {inputs.selectedLines === undefined
              ? "todas las del periodo"
              : `${formatInteger(inputs.selectedLines.length)} línea(s)`}
          </p>
          <p>
            <span className="text-muted-foreground">Líneas reasignadas: </span>
            {formatInteger(reassignments.length)}
          </p>
          {warningsBlock(report.warnings)}
        </CardContent>
      </Card>

      {reassignments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Constancia de reasignaciones</CardTitle>
            <CardDescription>
              Pasaron a la base del {formatPercent(report.ownRate)} sin modificar
              el registro original.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-xs">
              <thead className="border-y bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Línea</th>
                  <th className="px-3 py-2 font-medium">Vendedor original</th>
                  <th className="px-3 py-2 font-medium">Asignada a</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {reassignments.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-2 tabular-nums">{item.id}</td>
                    <td className="px-3 py-2">{item.originalSellerKey}</td>
                    <td className="px-3 py-2">{item.assignedTo}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(item.subtotalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <LinesTable
        rows={overview.table}
        targetSeller={report.sellerKey}
        selectedLines={inputs.selectedLines}
        reassignedLines={inputs.reassignedLines ?? []}
        readOnly
        title="Líneas del informe"
        description="Vista de solo lectura de las líneas que se usaron para esta versión."
      />
    </div>
  )
}

function warningsBlock(warnings: string[]) {
  if (warnings.length === 0) return null

  return (
    <ul className="list-inside list-disc text-amber-600 dark:text-amber-400">
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  )
}

export default function CommissionDetailPage() {
  return (
    <React.Suspense fallback={null}>
      <CommissionDetailContent />
    </React.Suspense>
  )
}
