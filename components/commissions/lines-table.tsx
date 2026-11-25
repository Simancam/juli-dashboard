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
  ChevronsUpDownIcon,
  RotateCcwIcon,
  UserRoundCheckIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { SalesTableRow } from "@/types/overview"
import { formatDate, formatInteger, formatMoney } from "@/utils/format"

export interface LinesTableProps {
  rows: SalesTableRow[]
  targetSeller: string
  selectedLines?: number[]
  reassignedLines?: number[]
  isLoading?: boolean
  /** En el detalle del reporte las elecciones se muestran, no se editan. */
  readOnly?: boolean
  onSelectedLinesChange?: (ids: number[] | undefined) => void
  onReassignedLinesChange?: (ids: number[]) => void
  title?: string
  description?: string
}

const linesFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

const linesColumnHelper = createColumnHelper<typeof linesFeatures, SalesTableRow>()

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUpIcon className="size-3" />
  if (direction === "desc") return <ArrowDownIcon className="size-3" />
  return <ChevronsUpDownIcon className="size-3 opacity-50" />
}

export function LinesTable({
  rows,
  targetSeller,
  selectedLines,
  reassignedLines,
  isLoading = false,
  readOnly = false,
  onSelectedLinesChange,
  onReassignedLinesChange,
  title = "Reasignar",
  description,
}: LinesTableProps) {
  const [search, setSearch] = React.useState("")
  const [seller, setSeller] = React.useState("")
  const [client, setClient] = React.useState("")
  const [product, setProduct] = React.useState("")
  const [onlyReturns, setOnlyReturns] = React.useState(false)

  const sellers = React.useMemo(
    () => [...new Set(rows.map((row) => row.sellerKey))].sort(),
    [rows]
  )
  const clients = React.useMemo(
    () => [...new Set(rows.map((row) => row.clientKey))].sort(),
    [rows]
  )
  const products = React.useMemo(
    () => [...new Set(rows.map((row) => row.productLabel))].sort(),
    [rows]
  )

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (seller && row.sellerKey !== seller) return false
      if (client && row.clientKey !== client) return false
      if (product && row.productLabel !== product) return false
      if (onlyReturns && !row.isReturn) return false

      if (!query) return true

      return [
        row.documentNumber,
        row.sellerKey,
        row.clientKey,
        row.productLabel,
      ].some((value) => value.toLowerCase().includes(query))
    })
  }, [rows, search, seller, client, product, onlyReturns])

  const selectedSet = React.useMemo(
    () => new Set(selectedLines ?? []),
    [selectedLines]
  )
  const selectedRows = React.useMemo(
    () => rows.filter((row) => selectedSet.has(row.id)),
    [rows, selectedSet]
  )
  const selectedCents = selectedRows.reduce(
    (total, row) => total + row.subtotalCents,
    0
  )
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((row) => selectedSet.has(row.id))

  const reassignedSet = React.useMemo(
    () => new Set(reassignedLines ?? []),
    [reassignedLines]
  )
  const reassignedRows = React.useMemo(
    () => rows.filter((row) => reassignedSet.has(row.id)),
    [rows, reassignedSet]
  )
  const reassignedCents = reassignedRows.reduce(
    (total, row) => total + row.subtotalCents,
    0
  )

  const setSelection = React.useCallback(
    (ids: number[] | undefined) => {
      onSelectedLinesChange?.(ids)
    },
    [onSelectedLinesChange]
  )

  const toggleRow = React.useCallback(
    (id: number) => {
      const next = new Set(selectedSet)

      if (next.has(id)) next.delete(id)
      else next.add(id)

      setSelection([...next])
    },
    [selectedSet, setSelection]
  )

  const toggleAllVisible = React.useCallback(() => {
    const next = new Set(selectedSet)

    for (const row of filtered) {
      if (allVisibleSelected) next.delete(row.id)
      else next.add(row.id)
    }

    setSelection([...next])
  }, [allVisibleSelected, filtered, selectedSet, setSelection])

  const setReassignments = (ids: number[]) => {
    onReassignedLinesChange?.(ids)
  }

  // Si todas las marcadas ya están asignadas, el mismo botón revierte y esas
  // líneas dejan de contar en la venta propia del cálculo.
  const allSelectedReassigned =
    selectedRows.length > 0 &&
    selectedRows.every((row) => reassignedSet.has(row.id))

  const toggleAssignment = () => {
    if (selectedRows.length === 0) return

    const next = new Set(reassignedSet)
    for (const row of selectedRows) {
      if (allSelectedReassigned) next.delete(row.id)
      else next.add(row.id)
    }

    setReassignments([...next])
  }

  const clearFilters = () => {
    setSearch("")
    setSeller("")
    setClient("")
    setProduct("")
    setOnlyReturns(false)
  }

  const columns = React.useMemo(
    () =>
      linesColumnHelper.columns([
        linesColumnHelper.display({
          id: "select",
          header: () => (
            <th className="px-2 py-2 font-medium">
              <input
                type="checkbox"
                aria-label="Seleccionar todas las visibles"
                checked={allVisibleSelected}
                disabled={readOnly || isLoading || filtered.length === 0}
                onChange={toggleAllVisible}
              />
            </th>
          ),
          cell: ({ row }) => (
            <td className="px-2 py-1.5">
              <input
                type="checkbox"
                aria-label={`Seleccionar línea ${row.original.id}`}
                checked={selectedSet.has(row.original.id)}
                disabled={readOnly || isLoading}
                onChange={() => toggleRow(row.original.id)}
              />
            </td>
          ),
        }),
        linesColumnHelper.accessor("date", {
          sortFn: "alphanumeric",
          header: ({ column }) => (
            <th className="px-2 py-2 font-medium">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Fecha
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
              {formatDate(info.getValue())}
            </td>
          ),
        }),
        linesColumnHelper.accessor("documentNumber", {
          sortFn: "alphanumeric",
          header: ({ column }) => (
            <th className="px-2 py-2 font-medium">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Documento
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td className="whitespace-nowrap px-2 py-1.5">
              {info.getValue()}
              {info.row.original.isReturn ? (
                <span className="ml-1 text-destructive">NCE</span>
              ) : null}
            </td>
          ),
        }),
        linesColumnHelper.accessor("sellerKey", {
          sortFn: "alphanumeric",
          header: ({ column }) => (
            <th className="px-2 py-2 font-medium">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Vendedor
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td className="max-w-48 px-2 py-1.5">
              <div className="truncate" title={info.getValue()}>
                {info.getValue()}
              </div>
              {reassignedSet.has(info.row.original.id) ? (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  → {targetSeller}
                </div>
              ) : null}
            </td>
          ),
        }),
        linesColumnHelper.accessor("clientKey", {
          sortFn: "alphanumeric",
          header: ({ column }) => (
            <th className="px-2 py-2 font-medium">
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
              className="max-w-48 truncate px-2 py-1.5"
              title={info.getValue()}
            >
              {info.getValue()}
            </td>
          ),
        }),
        linesColumnHelper.accessor("productLabel", {
          sortFn: "alphanumeric",
          header: ({ column }) => (
            <th className="px-2 py-2 font-medium">
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
            <td
              className="max-w-56 truncate px-2 py-1.5"
              title={`${info.getValue()} [${info.row.original.unit}]`}
            >
              {info.getValue()}
            </td>
          ),
        }),
        linesColumnHelper.accessor("quantity", {
          header: ({ column }) => (
            <th className="px-2 py-2 text-right font-medium">
              <button
                type="button"
                className="flex w-full items-center justify-end gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Cant.
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td className="px-2 py-1.5 text-right tabular-nums">
              {formatInteger(info.getValue())}
            </td>
          ),
        }),
        linesColumnHelper.accessor("subtotalCents", {
          header: ({ column }) => (
            <th className="px-2 py-2 text-right font-medium">
              <button
                type="button"
                className="flex w-full items-center justify-end gap-1 hover:text-foreground"
                onClick={column.getToggleSortingHandler()}
              >
                Subtotal local
                <SortIcon direction={column.getIsSorted()} />
              </button>
            </th>
          ),
          cell: (info) => (
            <td className="px-2 py-1.5 text-right tabular-nums">
              {formatMoney(info.getValue())}
            </td>
          ),
        }),
      ]),
    [
      allVisibleSelected,
      filtered.length,
      isLoading,
      readOnly,
      reassignedSet,
      selectedSet,
      targetSeller,
      toggleAllVisible,
      toggleRow,
    ]
  )

  const table = useTable({
    features: linesFeatures,
    columns,
    data: filtered,
  })
  const tableRows = table.getRowModel().rows

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            type="search"
            placeholder="Buscar documento, vendedor, cliente o producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select value={seller} onValueChange={(value) => setSeller(value ?? "")}>
            <SelectTrigger className="w-full" aria-label="Filtrar por vendedor">
              <SelectValue placeholder="Todos los vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los vendedores</SelectItem>
              {sellers.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={client} onValueChange={(value) => setClient(value ?? "")}>
            <SelectTrigger className="w-full" aria-label="Filtrar por cliente">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los clientes</SelectItem>
              {clients.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={product} onValueChange={(value) => setProduct(value ?? "")}>
            <SelectTrigger className="w-full" aria-label="Filtrar por producto">
              <SelectValue placeholder="Todos los productos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los productos</SelectItem>
              {products.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={onlyReturns}
              onChange={(event) => setOnlyReturns(event.target.checked)}
            />
            Solo NCE
          </label>
          <button type="button" className="underline" onClick={clearFilters}>
            Limpiar filtros
          </button>
          <span className="text-muted-foreground">
            {formatInteger(filtered.length)} de {formatInteger(rows.length)} líneas
          </span>
        </div>

        {!readOnly ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-y py-2 text-xs">
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading || filtered.length === 0}
                onClick={toggleAllVisible}
              >
                {allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar visibles"}
              </button>
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading}
                onClick={() => setSelection([])}
              >
                Limpiar selección
              </button>
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading}
                onClick={() => setSelection(undefined)}
              >
                Quitar selección
              </button>
              <Button
                type="button"
                size="sm"
                variant={allSelectedReassigned ? "outline" : "default"}
                className={
                  allSelectedReassigned
                    ? "gap-1 text-[#3b82f6] hover:bg-[#3b82f6]/10"
                    : "gap-1 bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                }
                disabled={isLoading || selectedRows.length === 0}
                onClick={toggleAssignment}
              >
                {allSelectedReassigned ? <RotateCcwIcon /> : <UserRoundCheckIcon />}
                {allSelectedReassigned ? "Revertir" : "Reasignar"}
              </Button>
              <span className="font-medium">
                {formatInteger(selectedRows.length)} seleccionadas ·{" "}
                {formatMoney(selectedCents)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b py-2 text-xs">
              <span className="font-medium">Reasignadas a {targetSeller}</span>
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading}
                onClick={() => setReassignments([])}
              >
                Limpiar reasignaciones
              </button>
              <span className="font-medium">
                {formatInteger(reassignedRows.length)} reasignadas ·{" "}
                {formatMoney(reassignedCents)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4 border-y py-2 text-xs">
            <span>
              {selectedLines === undefined
                ? "Todas las líneas del periodo"
                : `${formatInteger(selectedRows.length)} seleccionadas`}
            </span>
            <span>
              {formatInteger(reassignedRows.length)} reasignadas ·{" "}
              {formatMoney(reassignedCents)}
            </span>
          </div>
        )}

        {selectedLines !== undefined && !readOnly ? (
          <p className="text-xs text-muted-foreground">
            Las líneas marcadas solo preparan reasignaciones; la comisión sigue
            calculándose con los vendedores elegidos.
          </p>
        ) : null}

        <div className="max-h-[30rem] overflow-auto text-xs">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b">
                  {group.headers.map((header) => (
                    <table.FlexRender key={header.id} header={header} />
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  {row.getAllCells().map((cell) => (
                    <table.FlexRender key={cell.id} cell={cell} />
                  ))}
                </tr>
              ))}
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="px-2 py-6 text-center text-muted-foreground"
                  >
                    No hay líneas con estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
