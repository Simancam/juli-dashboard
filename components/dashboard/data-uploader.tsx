"use client"

import * as React from "react"
import { FileUpIcon, LoaderCircleIcon } from "lucide-react"

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
import { formatDate, formatInteger } from "@/utils/format"

export function DataUploader() {
  const { file, overview, isLoading, upload, clear } = useDashboardData()
  const [selected, setSelected] = React.useState<File | null>(null)

  const handleAnalyze = async () => {
    if (!selected) {
      return
    }

    await upload(selected)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Cargar informe de ventas</CardTitle>
        <CardDescription>
          Selecciona el XLSX. El análisis se hace en memoria, sin guardar datos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept=".xlsx"
            className="max-w-xs"
            onChange={(event) =>
              setSelected(event.target.files?.[0] ?? null)
            }
          />
          <Button onClick={handleAnalyze} disabled={!selected || isLoading}>
            {isLoading ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <FileUpIcon />
            )}
            {isLoading ? "Analizando…" : "Analizar"}
          </Button>
          {file ? (
            <Button variant="ghost" onClick={clear} disabled={isLoading}>
              Limpiar
            </Button>
          ) : null}
        </div>

        {overview ? (
          <div className="space-y-2 border-t pt-3 text-xs">
            <p className="font-medium">
              {file?.name} · {formatDate(overview.period.start)} a{" "}
              {formatDate(overview.period.end)}
            </p>
            <p className="text-muted-foreground">
              {formatInteger(overview.report.validRows)} líneas válidas ·{" "}
              {formatInteger(overview.report.rowsRead)} leídas ·{" "}
              {formatInteger(overview.report.excludedByStatus)} excluidas
            </p>
            {overview.report.warnings.length > 0 ? (
              <ul className="list-inside list-disc space-y-0.5 text-amber-600 dark:text-amber-400">
                {overview.report.warnings.slice(0, 4).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
