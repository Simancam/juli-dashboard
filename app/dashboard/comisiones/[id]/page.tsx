"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { LoaderCircleIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { CommissionEditForm } from "@/components/commissions/commission-edit-form"
import { CommissionResultCard } from "@/components/commissions/commission-result"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAnalysis } from "@/services/analysesService"
import {
  deleteCommissionReport,
  getCommissionReport,
} from "@/services/commissionReportsService"
import type { SavedAnalysis } from "@/types/analyses"
import type {
  SavedCommissionReport,
} from "@/types/commission-reports"
import {
  formatDate,
  formatInteger,
  formatMoney,
  formatPercent,
} from "@/utils/format"

interface CommissionDetailData {
  report: SavedCommissionReport
  analysis: SavedAnalysis
}

function CommissionDetailContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = React.useState<CommissionDetailData | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [pendingDelete, setPendingDelete] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const isEditing = searchParams.get("editar") === "1"

  React.useEffect(() => {
    let active = true

    async function load() {
      const report = await getCommissionReport(params.id)
      if (!report) throw new Error("No se encontró el reporte")

      const analysis = await getAnalysis(report.analysisId)

      return { report, analysis }
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

  const { report, analysis } = data
  const { result, inputs, reassignments } = report
  const sellers = inputs.sellers
  const commissionLines = inputs.commissionLines ?? []
  const analysisLabel = `${analysis.name} · ${formatDate(analysis.periodStart)} al ${formatDate(analysis.periodEnd)}`

  const handleSaved = (updated: SavedCommissionReport) => {
    setData((current) => (current ? { ...current, report: updated } : current))
    router.replace(`/dashboard/comisiones/${updated.id}`)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteCommissionReport(report.id)
      toast.success("Comisiones eliminadas")
      router.push("/dashboard/comisiones")
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo eliminar el reporte"
      setError(message)
      toast.error("No se pudo eliminar el reporte", { description: message })
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Comisiones
            </h1>
            <span className="font-heading text-2xl font-semibold tracking-tight text-muted-foreground tabular-nums">
              {formatDate(analysis.periodStart)} – {formatDate(analysis.periodEnd)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {analysis.name} · guardado el{" "}
            {formatDate(report.createdAt.slice(0, 10))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing && analysis.datasetId ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() =>
                router.push(`/dashboard/comisiones/${report.id}?editar=1`)
              }
              disabled={isDeleting}
              aria-label="Editar"
              title="Editar"
            >
              <PencilIcon className="size-3.5" />
            </Button>
          ) : null}
          {!isEditing ? (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:bg-transparent hover:text-destructive"
              onClick={() => setPendingDelete(true)}
              disabled={isDeleting}
              aria-label="Eliminar"
              title="Eliminar"
            >
              {isDeleting ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : (
                <Trash2Icon className="size-3.5" />
              )}
            </Button>
          ) : null}
          <Link
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href="/dashboard/comisiones"
          >
            Volver a Comisiones
          </Link>
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

      {isEditing && analysis.datasetId ? (
        <CommissionEditForm
          key={report.id}
          report={report}
          analysisLabel={analysisLabel}
          onCancel={() => router.replace(`/dashboard/comisiones/${report.id}`)}
          onSaved={handleSaved}
        />
      ) : (
        <>
          {searchParams.get("editar") === "1" && !analysis.datasetId ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Este informe fue reemplazado y ya no tiene líneas para recalcular;
              solo se puede consultar.
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Estas son las Comisiones guardadas. Las cifras y las líneas se muestran
            tal como se guardaron; no se vuelven a calcular al abrirla.
          </p>

          <CommissionResultCard
            result={result}
            ownRate={report.ownRate}
            teamRate={report.teamRate}
            sellerKey={report.sellerKey}
            reassignmentCount={reassignments.length}
            reassignedCents={reassignments.reduce(
              (total, item) => total + item.subtotalCents,
              0
            )}
            title="Resultado guardado"
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Elecciones guardadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p>
                <span className="text-muted-foreground">Vendedores incluidos: </span>
                {inputs.sellers === undefined
                  ? "todos"
                  : sellers?.length === 0
                    ? "ninguno"
                    : (sellers?.join(", ") ?? "")}
              </p>
              <p>
                <span className="text-muted-foreground">
                  Líneas incluidas en el cálculo:{" "}
                </span>
                {commissionLines.length > 0
                  ? `${formatInteger(commissionLines.length)} línea(s)`
                  : inputs.selectedLines === undefined
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
                <CardTitle className="text-base">
                  Constancia de reasignaciones
                </CardTitle>
                <CardDescription>
                  Pasaron a la base del {formatPercent(report.ownRate)} sin
                  modificar el registro original.
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Líneas incluidas en la comisión
              </CardTitle>
              <CardDescription>
                Venta propia y del equipo, con el vendedor efectivo y la tasa
                aplicada a cada línea.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissionLines.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Este reporte no guardó el detalle línea a línea. Las cifras
                  agregadas siguen disponibles en el resultado.
                </p>
              ) : (
                <div className="max-h-[30rem] overflow-auto text-xs">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                      <tr className="border-b">
                        <th className="px-2 py-2 font-medium">Línea</th>
                        <th className="px-2 py-2 font-medium">Fecha</th>
                        <th className="px-2 py-2 font-medium">Documento</th>
                        <th className="px-2 py-2 font-medium">Vendedor</th>
                        <th className="px-2 py-2 font-medium">Cuenta como</th>
                        <th className="px-2 py-2 font-medium">Cliente</th>
                        <th className="px-2 py-2 font-medium">Producto</th>
                        <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                        <th className="px-2 py-2 text-right font-medium">Tasa</th>
                        <th className="px-2 py-2 text-right font-medium">Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionLines.map((line) => (
                        <tr
                          key={line.id}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-2 py-1.5 tabular-nums">{line.id}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                            {formatDate(line.date)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5">
                            {line.documentNumber}
                            {line.isReturn ? (
                              <span className="ml-1 text-destructive">NCE</span>
                            ) : null}
                          </td>
                          <td
                            className="max-w-48 truncate px-2 py-1.5"
                            title={line.sellerKey}
                          >
                            {line.sellerKey}
                          </td>
                          <td className="max-w-48 px-2 py-1.5">
                            <span
                              className={
                                line.effectiveSellerKey === line.sellerKey
                                  ? ""
                                  : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {line.effectiveSellerKey}
                            </span>
                          </td>
                          <td
                            className="max-w-48 truncate px-2 py-1.5"
                            title={line.clientKey}
                          >
                            {line.clientKey}
                          </td>
                          <td
                            className="max-w-56 truncate px-2 py-1.5"
                            title={`${line.productLabel} [${line.unit}]`}
                          >
                            {line.productLabel}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatMoney(line.subtotalCents)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatPercent(line.rate)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatMoney(line.commissionCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog
        open={pendingDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estas Comisiones?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará Comisiones {report.version} de {report.sellerKey}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? <LoaderCircleIcon className="animate-spin" /> : null}
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
