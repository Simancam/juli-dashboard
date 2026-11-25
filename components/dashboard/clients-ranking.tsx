"use client"

import * as React from "react"
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartPieIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  TableIcon,
} from "lucide-react"
import { Label, Pie, PieChart } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useDashboardData } from "@/hooks/useDashboardData"
import type { Kpis, RankedEntry } from "@/types/analytics"
import {
  formatApproxMoney,
  formatInteger,
  formatMoney,
  formatPercent,
} from "@/utils/format"

const PAGE_SIZE = 10
const CHART_LIMIT = 8
const PARETO_THRESHOLD = 0.8

const clientsFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

const clientsColumnHelper = createColumnHelper<
  typeof clientsFeatures,
  RankedEntry
>()

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUpIcon className="size-3" />
  if (direction === "desc") return <ArrowDownIcon className="size-3" />
  return <ChevronsUpDownIcon className="size-3 opacity-50" />
}

/** Colores vivos y distintos para que cada cliente se identifique de un vistazo. */
const SLICE_COLORS = [
  "#3b82f6", // azul
  "#06b6d4", // cian
  "#22c55e", // verde
  "#eab308", // amarillo
  "#ef4444", // rojo
  "#a855f7", // violeta
  "#ec4899", // rosa
  "#84cc16", // lima
]
const OTHER_COLOR = "#94a3b8" // gris para «Otros»

interface ClientsRankingCardProps {
  clients: RankedEntry[]
  kpis: Kpis
}

interface ChartSlice {
  key: string
  label: string
  netSalesCents: number
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-muted/20 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}

function getParetoCount(clients: RankedEntry[]): number {
  const crossing = clients.findIndex(
    (client) => (client.cumulativeShare ?? client.share) >= PARETO_THRESHOLD
  )

  return crossing === -1 ? clients.length : crossing + 1
}

function ClientsDonut({ clients }: { clients: RankedEntry[] }) {
  const top = clients.slice(0, CHART_LIMIT)
  const rest = clients.slice(CHART_LIMIT)
  const slices: ChartSlice[] = rest.length
    ? [
        ...top.map((client) => ({
          key: client.key,
          label: client.label,
          netSalesCents: client.netSalesCents,
        })),
        {
          key: "__others__",
          label: `Otros (${formatInteger(rest.length)})`,
          netSalesCents: rest.reduce(
            (total, client) => total + client.netSalesCents,
            0
          ),
        },
      ]
    : top.map((client) => ({
        key: client.key,
        label: client.label,
        netSalesCents: client.netSalesCents,
      }))

  const total = slices.reduce((sum, slice) => sum + slice.netSalesCents, 0)

  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay ventas netas para mostrar.
      </p>
    )
  }

  const chartData = slices.map((slice, index) => ({
    key: `slice-${index}`,
    name: slice.label,
    netSalesCents: slice.netSalesCents,
    fill: `var(--color-slice-${index})`,
    isOther: slice.key === "__others__",
  }))
  const chartConfig = {
    netSalesCents: { label: "Venta neta" },
    ...Object.fromEntries(
      chartData.map((item, index) => [
        item.key,
        {
          label: item.name,
          color: item.isOther
            ? OTHER_COLOR
            : SLICE_COLORS[index % SLICE_COLORS.length],
        },
      ])
    ),
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name, item) => {
                const label =
                  typeof item?.payload?.name === "string"
                    ? item.payload.name
                    : String(name ?? "")
                const color =
                  typeof item?.payload?.fill === "string"
                    ? item.payload.fill
                    : item?.color
                const shortLabel =
                  label.length > 24 ? `${label.slice(0, 24).trimEnd()}…` : label

                return (
                  <div className="flex w-full max-w-[240px] items-center justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate" title={label}>
                        {shortLabel}
                      </span>
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatMoney(Number(value))}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="netSalesCents"
          nameKey="name"
          innerRadius={60}
          strokeWidth={2}
          paddingAngle={2}
          cornerRadius={4}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {formatApproxMoney(total)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 24}
                      className="fill-muted-foreground"
                    >
                      Venta neta
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

function ClientsTable({ clients }: { clients: RankedEntry[] }) {
  const [page, setPage] = React.useState(1)
  const paretoCount = getParetoCount(clients)
  // El color Pareto sigue el ranking original, aunque se ordene por otra columna.
  const paretoKeys = React.useMemo(
    () => new Set(clients.slice(0, paretoCount).map((client) => client.key)),
    [clients, paretoCount]
  )
  const originalRanks = React.useMemo(
    () => new Map(clients.map((client, index) => [client.key, index + 1])),
    [clients]
  )

  const columns = React.useMemo(
    () =>
      clientsColumnHelper.columns([
        clientsColumnHelper.display({
          id: "index",
          header: () => <th className="px-3 py-2 font-medium">#</th>,
          cell: ({ row }) => (
            <td className="px-3 py-2 tabular-nums">
              {originalRanks.get(row.original.key)}
            </td>
          ),
        }),
        clientsColumnHelper.accessor("label", {
          sortFn: "alphanumeric",
          header: ({ column }) => (
            <th className="px-3 py-2 font-medium">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Cliente
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td
              className="max-w-72 truncate px-3 py-2 font-medium"
              title={info.getValue()}
            >
              {info.getValue()}
            </td>
          ),
        }),
        clientsColumnHelper.accessor("netSalesCents", {
          header: ({ column }) => (
            <th className="px-3 py-2 text-right font-medium">
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
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(info.getValue())}
            </td>
          ),
        }),
        clientsColumnHelper.accessor("share", {
          header: ({ column }) => (
            <th className="px-3 py-2 text-right font-medium">
              <button
                type="button"
                className="flex w-full items-center justify-end gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Participación
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td className="px-3 py-2 text-right tabular-nums">
              {formatPercent(info.getValue())}
            </td>
          ),
        }),
        clientsColumnHelper.accessor(
          (client) => client.cumulativeShare ?? client.share,
          {
            id: "cumulativeShare",
            header: ({ column }) => (
              <th className="px-3 py-2 text-right font-medium">
                <button
                  type="button"
                  className="flex w-full items-center justify-end gap-1 hover:text-foreground"
                  onClick={column.getToggleSortingHandler()}
                >
                  Acumulado
                  <SortIcon direction={column.getIsSorted()} />
                </button>
              </th>
            ),
            cell: (info) => (
              <td className="px-3 py-2 text-right tabular-nums">
                {formatPercent(info.getValue())}
              </td>
            ),
          }
        ),
      ]),
    [originalRanks]
  )

  const table = useTable({
    features: clientsFeatures,
    columns,
    data: clients,
  })
  const sortedRows = table.getRowModel().rows
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const visibleRows = sortedRows.slice(start, start + PAGE_SIZE)

  return (
    <div className="flex h-[420px] flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-y bg-muted/40 text-muted-foreground">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <table.FlexRender key={header.id} header={header} />
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isPareto = paretoKeys.has(row.original.key)

              return (
                <tr
                  key={row.original.key}
                  className={`border-b last:border-0 ${
                    isPareto ? "text-primary" : ""
                  }`}
                >
                  {row.getAllCells().map((cell) => (
                    <table.FlexRender key={cell.id} cell={cell} />
                  ))}
                </tr>
              )
            })}
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllLeafColumns().length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No hay clientes con venta para los filtros elegidos.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>
          {sortedRows.length === 0
            ? "Sin clientes"
            : `Mostrando ${formatInteger(start + 1)}–${formatInteger(
                Math.min(start + PAGE_SIZE, sortedRows.length)
              )} de ${formatInteger(sortedRows.length)}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeftIcon />
            Anterior
          </Button>
          <span className="tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Clientes por venta neta: dona de shadcn o tabla paginada, con Pareto. */
export function ClientsRankingCard({
  clients,
  kpis,
}: ClientsRankingCardProps) {
  const [view, setView] = React.useState<"chart" | "table">("chart")

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <CardTitle className="text-base">Ventas</CardTitle>
        <div className="inline-flex border">
          <Button
            variant={view === "chart" ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={view === "chart"}
            onClick={() => setView("chart")}
          >
            <ChartPieIcon />
            Gráfica
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            <TableIcon />
            Tabla
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {view === "chart" ? (
          <ClientsDonut clients={clients} />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat
                label="Clientes con venta"
                value={formatInteger(kpis.clients)}
              />
              <Stat label="Venta neta" value={formatMoney(kpis.netSalesCents)} />
              <Stat
                label="Clientes Pareto (80%)"
                value={`${formatInteger(getParetoCount(clients))} / ${formatInteger(clients.length)}`}
              />
            </div>
            <ClientsTable clients={clients} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ClientsRanking() {
  const { overview } = useDashboardData()

  if (!overview) {
    return null
  }

  return (
    <ClientsRankingCard
      clients={overview.clients ?? []}
      kpis={overview.kpis}
    />
  )
}
