"use client"

import * as React from "react"
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartColumnIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  FileUpIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { AnalysisResultContent } from "@/components/dashboard/analysis-result-content"
import { EditableAnalysisName } from "@/components/dashboard/editable-analysis-name"
import FileUploadDemo from "@/components/file-upload-demo"
import { DateRangeFilter } from "@/components/panel/date-range-filter"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogClose,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import type { PanelChartPoint, PanelResponse, PanelSummary } from "@/types/panel"
import {
  formatApproxMoney,
  formatDate,
  formatInteger,
  formatMargin,
  formatMoney,
  formatPercent,
} from "@/utils/format"

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

type ChartMetric = keyof Omit<PanelChartPoint, "bucket">
type ChartAxis = "month" | "day"
type ChartType = "area" | "bar" | "line"

const CHART_METRICS: Array<{
  value: ChartMetric
  label: string
  format: (value: number) => string
  axisFormat: (value: number) => string
}> = [
  { value: "netSalesCents", label: "Venta neta", format: formatMoney, axisFormat: formatApproxMoney },
  { value: "grossSalesCents", label: "Venta bruta", format: formatMoney, axisFormat: formatApproxMoney },
  { value: "returnsCents", label: "Devoluciones", format: formatMoney, axisFormat: formatApproxMoney },
  { value: "documents", label: "Comprobantes", format: formatInteger, axisFormat: formatInteger },
  { value: "clients", label: "Clientes", format: formatInteger, axisFormat: formatInteger },
  { value: "products", label: "Productos", format: formatInteger, axisFormat: formatInteger },
  { value: "families", label: "Familias", format: formatInteger, axisFormat: formatInteger },
  { value: "sellers", label: "Vendedores", format: formatInteger, axisFormat: formatInteger },
  { value: "warehouses", label: "Bodegas", format: formatInteger, axisFormat: formatInteger },
  { value: "quantity", label: "Cantidad", format: formatInteger, axisFormat: formatInteger },
]

const CHART_AXES = [
  { value: "month", label: "Mes" },
  { value: "day", label: "Días" },
] as const

const CHART_TYPES = [
  { value: "area", label: "Área" },
  { value: "bar", label: "Barras" },
  { value: "line", label: "Línea" },
] as const

interface SalesChartCardProps {
  points: PanelChartPoint[]
  months: string[]
  selectedMonth: string | undefined
  onMonthChange: (month: string | undefined) => void
  isLoading: boolean
}

function SalesChartCard({
  points,
  months,
  selectedMonth,
  onMonthChange,
  isLoading,
}: SalesChartCardProps) {
  const [metric, setMetric] = React.useState<ChartMetric>("netSalesCents")
  const [axis, setAxis] = React.useState<ChartAxis>("month")
  const [chartType, setChartType] = React.useState<ChartType>("area")

  React.useEffect(() => {
    if (axis === "day" && selectedMonth === undefined && months.length > 0) {
      onMonthChange(months[months.length - 1])
    }
    if (axis === "month" && selectedMonth !== undefined) {
      onMonthChange(undefined)
    }
  }, [axis, months, onMonthChange, selectedMonth])

  const descriptor =
    CHART_METRICS.find((item) => item.value === metric) ?? CHART_METRICS[0]
  const data = React.useMemo(
    () => points.map((point) => ({ bucket: point.bucket, value: point[metric] })),
    [points, metric]
  )
  const config: ChartConfig = React.useMemo(
    () => ({ value: { label: descriptor.label, color: "#3b82f6" } }),
    [descriptor.label]
  )
  const monthItems = React.useMemo(
    () =>
      months.map((month) => ({
        value: month,
        label: `${monthName(month)} ${month.slice(0, 4)}`,
      })),
    [months]
  )

  const bucketLabel = (bucket: string) =>
    axis === "day"
      ? `${Number(bucket.slice(8, 10))} de ${monthName(bucket.slice(0, 7))}`
      : monthName(bucket.slice(0, 7))

  const shared = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="bucket"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={16}
        tick={{ fontSize: 10 }}
        tickFormatter={(value) =>
          axis === "day"
            ? String(Number(String(value).slice(8, 10)))
            : monthName(String(value).slice(0, 7))
        }
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        width={72}
        tick={{ fontSize: 10 }}
        tickFormatter={(value) => descriptor.axisFormat(Number(value))}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            hideLabel
            formatter={(value, _name, item) => {
              const bucket =
                typeof item?.payload?.bucket === "string"
                  ? item.payload.bucket
                  : null

              return (
                <div className="flex w-full items-center justify-between gap-6">
                  <span className="text-muted-foreground">
                    {bucket ? bucketLabel(bucket) : descriptor.label}
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {descriptor.format(Number(value))}
                  </span>
                </div>
              )
            }}
          />
        }
      />
    </>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {descriptor.label} por {axis === "day" ? "día" : "mes"}
        </CardTitle>
        <CardDescription>
          {axis === "day" && selectedMonth
            ? `Días de ${monthName(selectedMonth)} ${selectedMonth.slice(0, 4)}`
            : "Ventas aprobadas, incluidas NCE. Todo el periodo con datos."}
        </CardDescription>
        <CardAction>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
              value={chartType}
              items={CHART_TYPES}
              onValueChange={(value) => setChartType((value ?? "area") as ChartType)}
            >
              <SelectTrigger size="sm" className="w-[104px]" aria-label="Tipo de gráfica">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={metric}
              items={CHART_METRICS}
              onValueChange={(value) =>
                setMetric((value ?? "netSalesCents") as ChartMetric)
              }
            >
              <SelectTrigger size="sm" className="w-[124px]" aria-label="Eje Y">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_METRICS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={axis}
              items={CHART_AXES}
              onValueChange={(value) => setAxis((value ?? "month") as ChartAxis)}
            >
              <SelectTrigger size="sm" className="w-[104px]" aria-label="Eje X">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_AXES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {axis === "day" ? (
              <Select
                value={selectedMonth ?? ""}
                items={monthItems}
                onValueChange={(value) => onMonthChange(value ?? undefined)}
              >
                <SelectTrigger size="sm" className="w-[128px]" aria-label="Mes del gráfico">
                  <SelectValue placeholder="Elegir mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
            Cargando gráfica…
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas en el periodo.</p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
            {chartType === "bar" ? (
              <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                {shared}
                <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                {shared}
                <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            ) : (
              <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                {shared}
                <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.12} strokeWidth={2} activeDot={{ r: 4 }} />
              </AreaChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

const rankingFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

const rankingColumnHelper = createColumnHelper<
  typeof rankingFeatures,
  RankedEntry
>()

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUpIcon className="size-3" />
  if (direction === "desc") return <ArrowDownIcon className="size-3" />
  return <ChevronsUpDownIcon className="size-3 opacity-50" />
}

function createRankingColumns(nameLabel: string) {
  return rankingColumnHelper.columns([
    rankingColumnHelper.accessor("label", {
      sortFn: "alphanumeric",
      header: ({ column }) => (
        <th className="h-7 py-0 text-left font-medium">
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={column.getToggleSortingHandler()}
          >
            {nameLabel}
            <SortIcon direction={column.getIsSorted()} />
          </button>
        </th>
      ),
      cell: (info) => <td className="truncate py-0 pr-2">{info.getValue()}</td>,
    }),
    rankingColumnHelper.accessor("netSalesCents", {
      header: ({ column }) => (
        <th className="h-7 py-0 text-right font-medium">
          <button
            type="button"
            className="flex w-full items-center justify-end gap-1 hover:text-foreground"
            onClick={column.getToggleSortingHandler()}
          >
            Venta neta
            <SortIcon direction={column.getIsSorted()} />
          </button>
        </th>
      ),
      cell: (info) => (
        <td className="py-0 text-right tabular-nums">
          {formatMoney(info.getValue())}
        </td>
      ),
    }),
  ])
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
  const columns = React.useMemo(
    () => createRankingColumns(nameLabel),
    [nameLabel]
  )
  const table = useTable({
    features: rankingFeatures,
    columns,
    data: entries,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    autoResetPageIndex: false,
  })

  const rows = table.getRowModel().rows
  const rowCount = table.getRowCount()
  const pageCount = Math.max(1, table.getPageCount())
  const { pageIndex, pageSize: currentPageSize } = table.state.pagination
  const currentPage = Math.min(pageIndex, pageCount - 1)
  const start = currentPage * currentPageSize
  const end = Math.min(start + currentPageSize, rowCount)

  useIsomorphicLayoutEffect(() => {
    const { pageIndex: index, pageSize: size } = table.state.pagination
    if (size !== pageSize) {
      table.setPagination({ pageIndex: 0, pageSize })
      return
    }
    if (index >= pageCount) {
      table.setPageIndex(pageCount - 1)
    }
  }, [pageCount, pageSize, table])

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-sm">
            <thead className="text-xs text-muted-foreground">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b">
                  {group.headers.map((header) => (
                    <table.FlexRender key={header.id} header={header} />
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="h-8 text-muted-foreground"
                  >
                    Sin datos.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Tooltip key={row.original.key}>
                    <TooltipTrigger
                      render={
                        <tr className="h-8 cursor-default border-b last:border-0 hover:bg-muted/50" />
                      }
                    >
                      {row.getAllCells().map((cell) => (
                        <table.FlexRender key={cell.id} cell={cell} />
                      ))}
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
                          {formatPercent(row.original.share)}
                        </dd>
                        <dt className="text-muted-foreground">Comprobantes</dt>
                        <dd className="text-right tabular-nums">
                          {formatInteger(row.original.documents)}
                        </dd>
                        <dt className="text-muted-foreground">Margen</dt>
                        <dd className="text-right tabular-nums">
                          {formatMargin(row.original.margin)}
                        </dd>
                      </dl>
                    </TooltipContent>
                  </Tooltip>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {rowCount === 0
              ? "Sin resultados"
              : `${formatInteger(start + 1)}–${formatInteger(
                  end
                )} de ${formatInteger(rowCount)}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Anterior
            </Button>
            <span className="tabular-nums">
              {formatInteger(currentPage + 1)}/{formatInteger(pageCount)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
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
  const {
    overview,
    analyze,
    isLoading: isAnalyzing,
    error: analyzeError,
  } = useDashboardData()
  const [data, setData] = React.useState<PanelResponse | null>(null)
  const [query, setQuery] = React.useState<PanelQuery>({})
  const [error, setError] = React.useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [isAnalyzeOpen, setIsAnalyzeOpen] = React.useState(false)
  const [isResultOpen, setIsResultOpen] = React.useState(false)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [panelRevision, setPanelRevision] = React.useState(0)
  const [chartMonth, setChartMonth] = React.useState<string | undefined>()
  const [loadedChartMonth, setLoadedChartMonth] = React.useState<
    string | undefined
  >()
  const chartMonths = React.useMemo(
    () => data?.monthly.map((point) => point.month) ?? [],
    [data]
  )

  React.useEffect(() => {
    let active = true

    getPanel({ ...query, chartMonth })
      .then((result) => {
        if (active) {
          setData(result)
          setLoadedChartMonth(result.chartMonth)
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
  }, [query, chartMonth, panelRevision])

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
  const isChartLoading = chartMonth !== loadedChartMonth
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
    setIsResultOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Panel histórico
        </h1>
        <div className="flex flex-wrap items-end gap-2">
          <Dialog open={isAnalyzeOpen} onOpenChange={setIsAnalyzeOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <ChartColumnIcon />
              Analizar
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Analizar informe de ventas</DialogTitle>
                <DialogDescription>
                  Arrastra un XLSX o haz clic para elegirlo. El resultado se abre
                  en una ventana amplia y solo se guarda si pulsas Guardar.
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
                {delta ? (
                  <CardAction>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                        delta.direction === "up"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                      )}
                    >
                      {delta.label}
                    </span>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent>
                <span className="text-xl font-semibold tabular-nums">
                  {item.format(current)}
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <SalesChartCard
        points={data.chart}
        months={chartMonths}
        selectedMonth={chartMonth}
        onMonthChange={setChartMonth}
        isLoading={isChartLoading}
      />

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

      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[92vh] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b px-4 py-3">
            <DialogTitle className="sr-only">Nombre del informe</DialogTitle>
            <EditableAnalysisName className="min-w-0 flex-1 text-base md:text-base" />
            <DialogClose
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Cerrar" />
              }
            >
              <XIcon />
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {overview ? (
              <AnalysisResultContent
                onSaved={() => {
                  setIsResultOpen(false)
                  setPanelRevision((revision) => revision + 1)
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay un análisis en curso.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
