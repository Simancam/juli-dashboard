"use client"

import * as React from "react"
import Link from "next/link"
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
  ChevronsUpDownIcon,
  PencilIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ClientsRankingCard } from "@/components/dashboard/clients-ranking"
import { FamiliesChartCard } from "@/components/dashboard/families-chart"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { updateAnalysis } from "@/services/analysesService"
import type { AnalysisDetail, SavedAnalysis } from "@/types/analyses"
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
  analysis: AnalysisDetail
  overview: OverviewResponse
}

const reportFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

const reportColumnHelper = createColumnHelper<
  typeof reportFeatures,
  RankedEntry
>()

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUpIcon className="size-3" />
  if (direction === "desc") return <ArrowDownIcon className="size-3" />
  return <ChevronsUpDownIcon className="size-3 opacity-50" />
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
  const columns = React.useMemo(
    () =>
      reportColumnHelper.columns([
        reportColumnHelper.display({
          id: "index",
          header: () => <th className="px-3 py-2 font-medium">#</th>,
          cell: ({ row }) => (
            <td className="px-3 py-2 text-muted-foreground">{row.index + 1}</td>
          ),
        }),
        reportColumnHelper.accessor("label", {
          sortFn: "alphanumeric",
          header: ({ column }) => (
            <th className="px-3 py-2 font-medium">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Producto
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td className="max-w-64 truncate px-3 py-2" title={info.getValue()}>
              {info.getValue()}
              {info.row.original.unit ? (
                <span className="ml-1 text-muted-foreground">
                  ({info.row.original.unit})
                </span>
              ) : null}
            </td>
          ),
        }),
        reportColumnHelper.accessor("netSalesCents", {
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
        reportColumnHelper.accessor("share", {
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
        reportColumnHelper.accessor("quantity", {
          header: ({ column }) => (
            <th className="px-3 py-2 text-right font-medium">
              <button
                type="button"
                className="flex w-full items-center justify-end gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Cantidad
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => {
            const quantity = info.getValue()
            return (
              <td className="px-3 py-2 text-right tabular-nums">
                {quantity === undefined ? "—" : formatInteger(quantity)}
              </td>
            )
          },
        }),
      ]),
    []
  )

  const table = useTable({
    features: reportFeatures,
    columns,
    data: entries,
  })
  const rows = table.getRowModel().rows

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Sin datos.</p>
        ) : (
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
              {rows.map((row) => (
                <tr key={row.original.key} className="border-b last:border-0">
                  {row.getAllCells().map((cell) => (
                    <table.FlexRender key={cell.id} cell={cell} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

function EditableName({
  analysis,
  value,
  onSaved,
}: {
  analysis: SavedAnalysis
  value: string
  onSaved: (name: string) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [isSaving, setIsSaving] = React.useState(false)
  const cancelRef = React.useRef(false)

  async function commit() {
    if (cancelRef.current) {
      cancelRef.current = false
      setDraft(value)
      setIsEditing(false)
      return
    }

    const next = draft.trim()
    setIsEditing(false)

    if (!next || next === value) {
      setDraft(value)
      return
    }

    setIsSaving(true)

    try {
      await updateAnalysis(analysis.id, {
        name: next,
        periodStart: analysis.periodStart,
        periodEnd: analysis.periodEnd,
      })
      onSaved(next)
      toast.success("Nombre actualizado")
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo guardar el nombre"
      setDraft(value)
      toast.error("No se pudo guardar el nombre", { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        autoFocus
        aria-label="Nombre del informe"
        value={draft}
        maxLength={120}
        disabled={isSaving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === "Escape") {
            cancelRef.current = true
            event.currentTarget.blur()
          }
        }}
        className="font-heading h-auto w-full max-w-xl text-2xl font-semibold tracking-tight"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value)
        setIsEditing(true)
      }}
      className="group flex items-center gap-2 text-left"
      title="Editar nombre del informe"
    >
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {value}
      </h1>
      <PencilIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

export function SavedAnalysisView({ analysis, overview }: SavedAnalysisViewProps) {
  const { kpis } = overview
  const [name, setName] = React.useState(analysis.name)

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <EditableName
              analysis={analysis}
              value={name}
              onSaved={(next) => setName(next)}
            />
            <span className="font-heading text-2xl font-semibold tracking-tight text-muted-foreground tabular-nums">
              {formatDate(analysis.periodStart)} –{" "}
              {formatDate(analysis.periodEnd)}
            </span>
          </div>
          <span
            className="block text-[10px] text-muted-foreground/70"
            title={analysis.fileName}
          >
            {analysis.fileName}
          </span>
        </div>
        <Link className={buttonVariants({ variant: "ghost" })} href="/dashboard/analizar">
          Volver a Informes
        </Link>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-2">
        <ClientsRankingCard
          clients={overview.clients ?? analysis.snapshot.clients ?? []}
          kpis={kpis}
        />
        <FamiliesChartCard families={overview.families ?? []} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranking title="Productos" entries={overview.products} />
        <Ranking title="Productos devueltos" entries={overview.returnedProducts} />
      </div>
    </div>
  )
}
