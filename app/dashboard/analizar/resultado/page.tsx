"use client"

import Link from "next/link"

import { AnalysisResultContent } from "@/components/dashboard/analysis-result-content"
import { EditableAnalysisName } from "@/components/dashboard/editable-analysis-name"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardData } from "@/hooks/useDashboardData"

export default function AnalysisResultPage() {
  const { file, overview, analysisId, error } = useDashboardData()

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <EditableAnalysisName className="text-2xl md:text-2xl" />
          <p className="text-sm text-muted-foreground">
            {file?.name ?? (analysisId ? "Análisis guardado" : "Sin archivo en memoria")}{" "}
            · clientes, productos e indicadores del periodo. El cálculo de
            comisiones vive en su propia sección.
          </p>
        </div>
        <Link
          className={buttonVariants({ variant: "ghost" })}
          href="/dashboard/analizar"
        >
          Volver a Análisis
        </Link>
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
          <AnalysisResultContent />
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
              Ir a Análisis
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
