"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  FileUpIcon,
  LoaderCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import FileUploadDemo from "@/components/file-upload-demo"
import { DateRangeFilter } from "@/components/panel/date-range-filter"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { computeDelta, type DeltaKind } from "@/lib/panel-delta"
import { ALL_SELLERS } from "@/lib/panel-sellers"
import { useDashboardData } from "@/hooks/useDashboardData"
import { cn } from "@/lib/utils"
import { getPanel } from "@/services/panelService"
import type { RankedEntry } from "@/types/analytics"
import type { PanelMonthlyPoint, PanelResponse, PanelSummary } from "@/types/panel"
import {
  formatApproxMoney,
  formatDate,
  formatInteger,
  formatMargin,
  formatMoney,
  formatPercent,
} from "@/utils/format"

/** Diccionario de meses: nunca mostramos el número de mes en el eje. */
const MONTH_NAMES: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
}

function monthName(month: string): string {
  return MONTH_NAMES[month.slice(5)] ?? month
}

function MonthlyChart({ points }: { points: PanelMonthlyPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin ventas en el periodo.</p>
  }

  const width = 760
  const height = 280
  const pad = { left: 18, right: 18, top: 34, bottom: 44 }
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom

  const values = points.map((point) => Math.round(point.netSalesCents / 100))
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const span = max - min || 1

  const xOf = (index: number) =>
    points.length === 1
      ? pad.left + plotWidth / 2
      : pad.left + (index * plotWidth) / (points.length - 1)
  const yOf = (value: number) => pad.top + ((max - value) / span) * plotHeight

  const coordinates = values.map((value, index) => ({
    x: xOf(index),
    y: yOf(value),
    value,
  }))
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(" ")

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Venta neta mensual"
    >
      <line
        x1={pad.left}
        y1={yOf(0)}
        x2={width - pad.right}
        y2={yOf(0)}
        className="stroke-border"
        strokeDasharray="4 4"
      />
      <polyline
        points={line}
        fill="none"
        className="stroke-primary"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coordinates.map(({ x, y, value }, index) => (
        <g key={points[index].month}>
          <circle
            cx={x}
            cy={y}
            r={4}
            className="fill-primary stroke-background"
            strokeWidth={2}
          >
            <title>{`${monthName(points[index].month)}: $${formatInteger(value)}`}</title>
          </circle>
          <text
            x={x}
            y={y - 10}
            textAnchor="middle"
            className="fill-foreground text-[10px] font-medium"
          >
            {formatApproxMoney(points[index].netSalesCents)}
          </text>
          <text
            x={x}
            y={height - pad.bottom + 20}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {monthName(points[index].month)}
          </text>
        </g>
      ))}
    </svg>
  )
}

interface RankingTableProps {
  title: string
  entries: RankedEntry[]
  pageSize?: number
  className?: string
  nameLabel?: string
}

function RankingTable({
  title,
  entries,
  pageSize = 8,
  className,
  nameLabel = "Nombre",
}: RankingTableProps) {
  const [page, setPage] = React.useState(0)
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const start = currentPage * pageSize
  const visible = entries.slice(start, start + pageSize)

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <table className="h-full w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-1 text-left font-medium">{nameLabel}</th>
                    <th className="py-1 text-right font-medium">Venta neta</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <Tooltip key={entry.key}>
                      <TooltipTrigger
                        render={
                          <tr className="cursor-default border-b last:border-0 hover:bg-muted/50" />
                        }
                      >
                        <td className="py-1.5 pr-2">{entry.label}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatMoney(entry.netSalesCents)}
                        </td>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        className="flex w-52 flex-col items-stretch gap-2 bg-card p-3 text-card-foreground shadow-lg ring-1 ring-foreground/10"
                        arrowClassName="bg-card fill-card"
                      >
                        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
                          <dt className="text-muted-foreground">
                            Participación
                          </dt>
                          <dd className="text-right tabular-nums">
                            {formatPercent(entry.share)}
                          </dd>
                          <dt className="text-muted-foreground">Comprobantes</dt>
                          <dd className="text-right tabular-nums">
                            {formatInteger(entry.documents)}
                          </dd>
                          <dt className="text-muted-foreground">Margen</dt>
                          <dd className="text-right tabular-nums">
                            {formatMargin(entry.margin)}
                          </dd>
                        </dl>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {formatInteger(start + 1)}–
                {formatInteger(Math.min(start + pageSize, entries.length))} de{" "}
                {formatInteger(entries.length)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Anterior
                </Button>
                <span className="tabular-nums">
                  {formatInteger(currentPage + 1)}/{formatInteger(totalPages)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface KpiDescriptor {
  label: string
  value: (summary: PanelSummary) => number
  format: (value: number) => string
  deltaKind?: DeltaKind
}

const KPI_LABELS: KpiDescriptor[] = [
  { label: "Venta neta", value: (s) => s.netSalesCents, format: formatMoney },
  { label: "Venta bruta", value: (s) => s.grossSalesCents, format: formatMoney },
  { label: "Devoluciones", value: (s) => s.returnsCents, format: formatMoney },
  {
    label: "Tasa de devolución",
    value: (s) => s.returnRate,
    format: formatPercent,
    deltaKind: "ratio-points",
  },
  { label: "Comprobantes", value: (s) => s.documents, format: formatInteger },
  { label: "Clientes", value: (s) => s.clients, format: formatInteger },
  { label: "Ticket promedio", value: (s) => s.avgTicketCents, format: formatMoney },
  {
    label: "Margen ponderado",
    value: (s) => s.weightedMargin,
    format: formatMargin,
    deltaKind: "points",
  },
]

function sellerLabel(
  sellers: PanelResponse["sellers"],
  keys: string[] | null
): string {
  if (!keys) return "Todos los vendedores"
  if (keys.length === 1) {
    const key = keys[0]
    return sellers.find((seller) => seller.key === key)?.label ?? key
  }
  return `${keys.length} vendedores`
}

interface PanelQuery {
  from?: string
  to?: string
  seller?: string[]
}

export function PanelView() {
  const router = useRouter()
  const { analyze, isLoading: isAnalyzing, error: analyzeError } = useDashboardData()
  const [data, setData] = React.useState<PanelResponse | null>(null)
  const [query, setQuery] = React.useState<PanelQuery>({})
  const [error, setError] = React.useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [isAnalyzeOpen, setIsAnalyzeOpen] = React.useState(false)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)

  React.useEffect(() => {
    let active = true

    getPanel(query)
      .then((result) => {
        if (active) {
          setData(result)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          const message =
            cause instanceof Error ? cause.message : "No se pudo cargar el panel"
          setError(message)
          toast.error("No se pudo cargar el panel", { description: message })
        }
      })
      .finally(() => {
        if (active) setIsInitialLoading(false)
      })

    return () => {
      active = false
    }
  }, [query])

  if (isInitialLoading && !data) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Cargando panel histórico…
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="p-6 text-sm text-destructive">
        {error ?? "No se pudo cargar el panel"}
      </p>
    )
  }

  const { coverage, summary } = data
  // Los controles reflejan la intención al instante; las cifras se actualizan
  // cuando llega la respuesta, sin mostrar estados de carga entremedias.
  const selectedSellers = query.seller
    ? query.seller.includes(ALL_SELLERS)
      ? null
      : query.seller
    : data.sellerKeys
  const period = {
    start: query.from ?? data.period.start,
    end: query.to ?? data.period.end,
  }

  function applySellers(keys: string[]) {
    setQuery((previous) => ({
      ...previous,
      seller: keys.length > 0 ? keys : [ALL_SELLERS],
    }))
  }

  function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setPendingFile(null)
      toast.error("El archivo debe ser XLSX")
      return
    }

    setPendingFile(file)
  }

  async function handleAnalyze() {
    if (!pendingFile) return

    const ok = await analyze(pendingFile)
    if (!ok) {
      toast.error("No se pudo analizar el archivo", {
        description: analyzeError ?? undefined,
      })
      return
    }

    toast.success("Análisis listo", { description: pendingFile.name })
    setIsAnalyzeOpen(false)
    setPendingFile(null)
    router.push("/dashboard/analizar/resultado")
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Panel histórico
          </h1>
          <p className="text-sm text-muted-foreground">
            Periodo {formatDate(period.start)} – {formatDate(period.end)} ·{" "}
            {formatInteger(summary.documents)} comprobantes. Solo cargas en estado
            listo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAnalyzeOpen} onOpenChange={setIsAnalyzeOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <FileUpIcon />
              Analizar
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Analizar informe de ventas</DialogTitle>
                <DialogDescription>
                  Arrastra un XLSX o haz clic para elegirlo. El resultado se abre
                  en otra vista y solo se guarda si pulsas Guardar.
                </DialogDescription>
              </DialogHeader>
              <FileUploadDemo onFiles={handleFiles} />
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsAnalyzeOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={!pendingFile || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <FileUpIcon />
                  )}
                  {isAnalyzing ? "Analizando…" : "Analizar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="justify-between gap-2 font-normal"
                />
              }
            >
              <span className="max-w-52 truncate">
                {sellerLabel(data.sellers, selectedSellers)}
              </span>
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" className="w-72 gap-1 p-1">
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
                <Checkbox
                  checked={selectedSellers === null}
                  onCheckedChange={() => applySellers([])}
                />
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => applySellers([])}
                >
                  Todos los vendedores
                </button>
              </div>
              <div className="mx-2 h-px bg-border" />
              <div className="max-h-64 overflow-y-auto">
                {data.sellers.map((seller) => {
                  const checked = selectedSellers?.includes(seller.key) ?? false
                  const toggle = () =>
                    applySellers(
                      checked
                        ? (selectedSellers ?? []).filter(
                            (key) => key !== seller.key
                          )
                        : [...(selectedSellers ?? []), seller.key]
                    )

                  return (
                    <div
                      key={seller.key}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs"
                    >
                      <Checkbox checked={checked} onCheckedChange={toggle} />
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={toggle}
                      >
                        {seller.label}
                      </button>
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <DateRangeFilter
            from={period.start}
            to={period.end}
            minDate={coverage.firstDate}
            maxDate={coverage.lastDate}
            onChange={(range) => {
              setQuery((previous) => ({ ...previous, ...range }))
            }}
          />
        </div>
      </div>

      {coverage.firstDate ? (
        <Card>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-xs sm:grid-cols-4">
              <div className="min-w-0 space-y-1">
                <dt className="text-muted-foreground">Desde</dt>
                <dd className="font-medium tabular-nums">
                  {formatDate(coverage.firstDate)}
                </dd>
              </div>
              <div className="min-w-0 space-y-1">
                <dt className="text-muted-foreground">Hasta</dt>
                <dd className="font-medium tabular-nums">
                  {formatDate(coverage.lastDate ?? coverage.firstDate)}
                </dd>
              </div>
              <div className="min-w-0 space-y-1">
                <dt className="text-muted-foreground">Reportes analizados</dt>
                <dd className="font-medium tabular-nums">
                  {formatInteger(coverage.datasetsReady)}
                </dd>
              </div>
              <div className="min-w-0 space-y-1">
                <dt className="text-muted-foreground">Huecos</dt>
                <dd
                  className="truncate font-medium"
                  title={
                    coverage.missingMonths.length > 0
                      ? coverage.missingMonths.join(", ")
                      : undefined
                  }
                >
                  {coverage.missingMonths.length > 0
                    ? coverage.missingMonths.join(", ")
                    : "ninguno"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_LABELS.map((item) => {
          const current = item.value(summary)
          const delta = data.comparison
            ? computeDelta(
                current,
                item.value(data.comparison.summary),
                item.deltaKind
              )
            : null

          return (
            <Card key={item.label}>
              <CardHeader className="pb-1">
                <CardDescription>{item.label}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <span className="text-xl font-semibold tabular-nums">
                  {item.format(current)}
                </span>
                {delta ? (
                  <p
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      delta.direction === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {delta.direction === "up" ? (
                      <ArrowUpIcon className="size-3.5" />
                    ) : (
                      <ArrowDownIcon className="size-3.5" />
                    )}
                    {delta.label}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Venta neta por mes</CardTitle>
          <CardDescription>
            Ventas aprobadas, incluidas NCE. Todo el periodo con datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyChart points={data.monthly} />
        </CardContent>
      </Card>

      <TooltipProvider delay={100}>
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Rankings">
          <RankingTable
            title="Clientes"
            entries={data.rankings.clients}
            nameLabel="Cliente"
            className="lg:row-span-2"
          />
          <RankingTable title="Productos" entries={data.rankings.products} />
          <RankingTable title="Vendedores" entries={data.rankings.sellers} />
          <RankingTable title="Familias" entries={data.rankings.families} />
          <RankingTable title="Bodegas" entries={data.rankings.warehouses} />
        </section>
      </TooltipProvider>
    </div>
  )
}
