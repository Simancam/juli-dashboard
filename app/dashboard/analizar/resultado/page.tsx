"use client"

import Link from "next/link"

import { SaveAnalysisButton } from "@/components/analyses/save-analysis-button"
import { AnalysisFilters } from "@/components/dashboard/analysis-filters"
import { CommissionPanel } from "@/components/dashboard/commission-panel"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { ProductsRanking } from "@/components/dashboard/products-ranking"
import { SalesTable } from "@/components/dashboard/sales-table"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardData } from "@/hooks/useDashboardData"
import { formatDate, formatInteger } from "@/utils/format"

export default function AnalysisResultPage() {
  const { file, overview, analysisId, error } = useDashboardData()

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Resultado del análisis
          </h1>
          <p className="text-sm text-muted-foreground">
            {file?.name ?? (analysisId ? "Análisis guardado" : "Sin archivo en memoria")}{" "}
            · revisa los indicadores y guarda si quieres conservar el informe.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className={buttonVariants({ variant: "ghost" })}
            href="/dashboard/analizar"
          >
            Volver a Analizar
          </Link>
          <SaveAnalysisButton />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="border border-destructive bg-destructive/10 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      ) : null}

      {overview ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Informe del {overview.period.start.slice(0, 4)}
              </CardTitle>
              <CardDescription>
                {formatInteger(overview.report.validRows)} líneas válidas del{" "}
                {formatDate(overview.period.start)} al{" "}
                {formatDate(overview.period.end)}.
                {analysisId
                  ? " Este informe está guardado y se puede volver a consultar."
                  : " Todavía no está guardado: pulsa Guardar para conservarlo."}
              </CardDescription>
            </CardHeader>
          </Card>

          <AnalysisFilters
            key={`${overview.period.start}-${overview.period.end}`}
          />
          <KpiCards />

          <div className="max-w-lg">
            <CommissionPanel />
          </div>
          <SalesTable />
          <ProductsRanking />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No hay un análisis para mostrar</CardTitle>
            <CardDescription>
              El resultado vive en memoria mientras navegas. Carga un XLSX desde
              Analizar para verlo aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/dashboard/analizar"
            >
              Ir a Analizar
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
