"use client"

import * as React from "react"

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

const selectClass =
  "h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"

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

export function LinesTable({
  rows,
  targetSeller,
  selectedLines,
  reassignedLines,
  isLoading = false,
  readOnly = false,
  onSelectedLinesChange,
  onReassignedLinesChange,
  title = "Ventas · selección manual",
  description = "Elige a dedo las líneas que cuentan y reasigna las que son realmente tuyas. Base: Valor subtotal local (columna M del Excel). El registro original no se modifica.",
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

  const setSelection = (ids: number[] | undefined) => {
    onSelectedLinesChange?.(ids)
  }

  const toggleRow = (id: number) => {
    const next = new Set(selectedSet)

    if (next.has(id)) next.delete(id)
    else next.add(id)

    setSelection([...next])
  }

  const toggleAllVisible = () => {
    const next = new Set(selectedSet)

    for (const row of filtered) {
      if (allVisibleSelected) next.delete(row.id)
      else next.add(row.id)
    }

    setSelection([...next])
  }

  const setReassignments = (ids: number[]) => {
    onReassignedLinesChange?.(ids)
  }

  const toggleReassign = (id: number) => {
    const next = new Set(reassignedSet)

    if (next.has(id)) next.delete(id)
    else next.add(id)

    setReassignments([...next])
  }

  const setVisibleReassigned = (value: boolean) => {
    const next = new Set(reassignedSet)

    for (const row of filtered) {
      if (value) next.add(row.id)
      else next.delete(row.id)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            type="search"
            placeholder="Buscar documento, vendedor, cliente o producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={selectClass}
            value={seller}
            onChange={(event) => setSeller(event.target.value)}
          >
            <option value="">Todos los vendedores</option>
            {sellers.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={client}
            onChange={(event) => setClient(event.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clients.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={product}
            onChange={(event) => setProduct(event.target.value)}
          >
            <option value="">Todos los productos</option>
            {products.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
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
                Usar todas las líneas
              </button>
              <span className="font-medium">
                {formatInteger(selectedRows.length)} seleccionadas ·{" "}
                {formatMoney(selectedCents)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b py-2 text-xs">
              <span className="font-medium">Reasignar a {targetSeller}</span>
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading || filtered.length === 0}
                onClick={() => setVisibleReassigned(true)}
              >
                Reasignar visibles
              </button>
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading || filtered.length === 0}
                onClick={() => setVisibleReassigned(false)}
              >
                Quitar reasignación de visibles
              </button>
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
            Selección manual activa: la comisión usa solo estas líneas e ignora
            el filtro de vendedores.
          </p>
        ) : null}

        <div className="max-h-[30rem] overflow-auto text-xs">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <tr className="border-b">
                <th className="px-2 py-2 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todas las visibles"
                    checked={allVisibleSelected}
                    disabled={readOnly || isLoading || filtered.length === 0}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-2 py-2 font-medium">Reasignar</th>
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Documento</th>
                <th className="px-2 py-2 font-medium">Vendedor</th>
                <th className="px-2 py-2 font-medium">Cliente</th>
                <th className="px-2 py-2 font-medium">Producto</th>
                <th className="px-2 py-2 text-right font-medium">Cant.</th>
                <th className="px-2 py-2 text-right font-medium">Subtotal local</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar línea ${row.id}`}
                      checked={selectedSet.has(row.id)}
                      disabled={readOnly || isLoading}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={`Reasignar línea ${row.id} a ${targetSeller}`}
                      checked={reassignedSet.has(row.id)}
                      disabled={readOnly || isLoading}
                      onChange={() => toggleReassign(row.id)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                    {formatDate(row.date)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    {row.documentNumber}
                    {row.isReturn ? (
                      <span className="ml-1 text-destructive">NCE</span>
                    ) : null}
                  </td>
                  <td className="max-w-48 px-2 py-1.5">
                    <div className="truncate" title={row.sellerKey}>
                      {row.sellerKey}
                    </div>
                    {reassignedSet.has(row.id) ? (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        → {targetSeller}
                      </div>
                    ) : null}
                  </td>
                  <td
                    className="max-w-48 truncate px-2 py-1.5"
                    title={row.clientKey}
                  >
                    {row.clientKey}
                  </td>
                  <td
                    className="max-w-56 truncate px-2 py-1.5"
                    title={`${row.productLabel} [${row.unit}]`}
                  >
                    {row.productLabel}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatInteger(row.quantity)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatMoney(row.subtotalCents)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
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
