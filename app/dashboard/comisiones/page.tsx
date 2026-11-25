"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  EyeIcon,
  LoaderCircleIcon,
  PencilIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { CommissionResultCard } from "@/components/commissions/commission-result"
import { LinesTable } from "@/components/commissions/lines-table"
import { SellerSelector } from "@/components/commissions/seller-selector"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCommissionProfile } from "@/lib/config/commission-profiles"
import { analyticsService } from "@/services/analyticsService"
import { listAnalyses } from "@/services/analysesService"
import {
  createCommissionReport,
  deleteCommissionReport,
  listCommissionReports,
} from "@/services/commissionReportsService"
import type { SavedAnalysis } from "@/types/analyses"
import type { SavedCommissionReport } from "@/types/commission-reports"
import type { OverviewFilters } from "@/types/overview"
import { formatDate, formatMoney, formatPercent } from "@/utils/format"

/** Sin dataset no hay líneas desde las que calcular; se ocultan de la lista. */
function usableAnalyses(analyses: SavedAnalysis[]): SavedAnalysis[] {
  return analyses.filter((analysis) => analysis.datasetId !== null)
}

function keepValidSelection(current: string, analyses: SavedAnalysis[]): string {
  return analyses.some((analysis) => analysis.id === current) ? current : ""
}

export default function ComisionesPage() {
  const router = useRouter()
  const profile = getCommissionProfile()

  const [analyses, setAnalyses] = React.useState<SavedAnalysis[]>([])
  const [reports, setReports] = React.useState<SavedCommissionReport[]>([])
  const [selected, setSelected] = React.useState("")
  const [ownRate, setOwnRate] = React.useState("2")
  const [teamRate, setTeamRate] = React.useState("1")
  const [advance, setAdvance] = React.useState("0")
  const [sellers, setSellers] = React.useState<string[] | undefined>([
    profile.sellerKey,
  ])
  const [selectedLines, setSelectedLines] = React.useState<number[] | undefined>(
    undefined
  )
  const [reassignedLines, setReassignedLines] = React.useState<number[]>([])
  const [preview, setPreview] = React.useState<Awaited<
    ReturnType<typeof analyticsService.getOverviewByAnalysis>
  > | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] =
    React.useState<SavedCommissionReport | null>(null)
  const requestId = React.useRef(0)

  const own = Number(ownRate) / 100
  const team = Number(teamRate) / 100
  const advanceValue = Number(advance)
  const advanceValid = Number.isFinite(advanceValue) && advanceValue >= 0
  const advanceCents = advanceValid ? Math.round(advanceValue * 100) : 0
  const ratesValid =
    Number.isFinite(own) &&
    Number.isFinite(team) &&
    own >= 0 &&
    own <= 1 &&
    team >= 0 &&
    team <= 1 &&
    advanceValid

  // El Select de shadcn necesita las etiquetas para mostrarlas en el trigger.
  const reportItems = React.useMemo(
    () =>
      analyses.map((analysis) => ({
        value: analysis.id,
        label: `${formatDate(analysis.periodStart)} – ${formatDate(analysis.periodEnd)}`,
      })),
    [analyses]
  )

  const refresh = React.useCallback(async () => {
    const [analysisList, reportList] = await Promise.all([
      listAnalyses("active"),
      listCommissionReports(),
    ])
    const usable = usableAnalyses(analysisList)

    setAnalyses(usable)
    setReports(reportList)
    setSelected((current) => keepValidSelection(current, usable))
  }, [])

  React.useEffect(() => {
    let active = true

    Promise.all([listAnalyses("active"), listCommissionReports()])
      .then(([analysisList, reportList]) => {
        if (!active) return

        const usable = usableAnalyses(analysisList)
        setAnalyses(usable)
        setReports(reportList)
        setSelected((current) => keepValidSelection(current, usable))
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo cargar Comisiones"
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // La vista previa se recalcula en servidor sin bloquear los controles.
  React.useEffect(() => {
    if (!selected || !ratesValid) return

    let active = true
    const current = ++requestId.current
    const filters: OverviewFilters = {
      metric: "value",
      order: "desc",
      limit: 10,
      includeCommission: true,
      ownRate: own,
      teamRate: team,
      advanceCents,
      sellers,
      reassignedLines,
    }

    analyticsService
      .getOverviewByAnalysis(selected, filters)
      .then((result) => {
        if (active && current === requestId.current) setPreview(result)
      })
      .catch((cause: unknown) => {
        if (active && current === requestId.current) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo calcular la comisión"
          )
        }
      })

    return () => {
      active = false
    }
  }, [
    selected,
    ratesValid,
    own,
    team,
    advanceCents,
    sellers,
    reassignedLines,
  ])

  const updateAnalysis = (id: string) => {
    setSelected(id)
    setPreview(null)
    setSelectedLines(undefined)
    setReassignedLines([])
    setAdvance("0")
    setSellers([profile.sellerKey])
    setError(null)
  }

  const handleSave = async () => {
    if (!selected) {
      setError("Selecciona un análisis activo")
      return
    }
    if (!ratesValid) {
      setError("Las tasas y el anticipo deben ser números válidos")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const report = await createCommissionReport({
        analysisId: selected,
        sellerKey: profile.sellerKey,
        ownRate: own,
        teamRate: team,
        advanceCents,
        ...(sellers !== undefined ? { sellers } : {}),
        reassignedLines,
      })
      await refresh()
      toast.success("Reporte de comisiones guardado")
      router.push(`/dashboard/comisiones/${report.id}`)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo guardar el reporte"
      setError(message)
      toast.error("No se pudo guardar el reporte", { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (report: SavedCommissionReport) => {
    setBusyId(report.id)
    setError(null)

    try {
      await deleteCommissionReport(report.id)
      if (pendingDelete?.id === report.id) setPendingDelete(null)
      await refresh()
      toast.success("Comisiones eliminadas")
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo eliminar el reporte"
      setError(message)
      toast.error("No se pudo eliminar el reporte", { description: message })
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" /> Cargando comisiones…
      </div>
    )
  }

  const showPreview = preview !== null && selected !== "" && ratesValid
  const shownPreview = showPreview ? preview : null
  const commission = shownPreview?.commission

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Comisiones
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2" onClick={handleSave} disabled={isSaving || !selected || !ratesValid}>
            {isSaving ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
            Guardar Comisiones
          </Button>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs sm:col-span-2">
              <span className="font-medium">Informe</span>
              <Select
                value={selected}
                items={reportItems}
                onValueChange={(value) => updateAnalysis(value ?? "")}
              >
                <SelectTrigger className="w-full" aria-label="Informe">
                  <SelectValue placeholder="Selecciona un informe" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.length === 0 ? (
                    <SelectItem value="" disabled>
                      No hay informes con líneas disponibles
                    </SelectItem>
                  ) : (
                    <SelectItem value="">Selecciona un informe</SelectItem>
                  )}
                  {reportItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2 text-xs">
              <span className="font-medium">Own rate (%)</span>
              <Input
                value={ownRate}
                onChange={(event) => setOwnRate(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs">
              <span className="font-medium">Team rate (%)</span>
              <Input
                value={teamRate}
                onChange={(event) => setTeamRate(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs sm:col-span-2">
              <span className="font-medium">Anticipo ($)</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={advance}
                onChange={(event) => setAdvance(event.target.value)}
              />
            </label>
          </CardContent>
        </Card>
        <SellerSelector
          className="h-full"
          sellers={shownPreview?.sellers ?? []}
          selected={sellers}
          onChange={setSellers}
        />
      </div>

      {shownPreview ? (
        <LinesTable
          rows={shownPreview.table}
          targetSeller={profile.sellerKey}
          selectedLines={selectedLines}
          reassignedLines={reassignedLines}
          onSelectedLinesChange={setSelectedLines}
          onReassignedLinesChange={setReassignedLines}
        />
      ) : null}

      {commission ? (
        <CommissionResultCard
          result={commission.result}
          ownRate={own}
          teamRate={team}
          sellerKey={profile.sellerKey}
          reassignmentCount={commission.reassignments.length}
          reassignedCents={commission.reassignments.reduce(
            (total, item) => total + item.subtotalCents,
            0
          )}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Selecciona un informe y revisa las tasas para ver paso a paso cómo
            se obtiene la comisión y el neto a pagar.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de Comisiones</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center">
              <p className="text-sm font-medium">Sin comisiones guardadas</p>
              <p className="text-xs text-muted-foreground">
                Guarda un cálculo para verlo aquí y poder volver a editarlo.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {reports.map((report) => {
                const analysis = analyses.find(
                  (item) => item.id === report.analysisId
                )
                const period = analysis
                  ? `${formatDate(analysis.periodStart)} – ${formatDate(
                      analysis.periodEnd
                    )}`
                  : formatDate(report.createdAt.slice(0, 10))

                return (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium tabular-nums">
                          {formatMoney(report.result.totalCommissionCents)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          comisión · neto{" "}
                          <span className="tabular-nums">
                            {formatMoney(report.result.netToPayCents)}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {period} · {report.sellerKey} ·{" "}
                        {formatPercent(report.ownRate)} propio /{" "}
                        {formatPercent(report.teamRate)} equipo
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon-sm",
                        })}
                        href={`/dashboard/comisiones/${report.id}`}
                        aria-label="Ver detalle"
                        title="Ver detalle"
                      >
                        <EyeIcon className="size-3.5" />
                      </Link>
                      <Link
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon-sm",
                        })}
                        href={`/dashboard/comisiones/${report.id}?editar=1`}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <PencilIcon className="size-3.5" />
                      </Link>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:bg-transparent hover:text-destructive"
                        onClick={() => setPendingDelete(report)}
                        disabled={busyId !== null}
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
                        {busyId === report.id ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : (
                          <Trash2Icon className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estas Comisiones?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará Comisiones {pendingDelete?.version} de{" "}
              {pendingDelete?.sellerKey}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => {
                if (pendingDelete) void handleDelete(pendingDelete)
              }}
            >
              {busyId !== null ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              {busyId !== null ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
