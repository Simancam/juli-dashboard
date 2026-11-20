"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardData } from "@/hooks/useDashboardData"
import { formatInteger, formatMoney, formatPercent } from "@/utils/format"

interface RowProps {
  label: string
  value: string
  emphasis?: boolean
}

function Row({ label, value, emphasis = false }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0">
      <span className={emphasis ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular-nums ${emphasis ? "text-base font-medium" : ""}`}>
        {value}
      </span>
    </div>
  )
}

export function CommissionPanel() {
  const { overview, filters, isLoading, applyFilters } = useDashboardData()

  if (!overview) {
    return null
  }

  const { sellerKey, ownRate, teamRate, result, reassignments, warnings } =
    overview.commission
  const availableSellers = overview.sellers
  const selectedSellers = filters.sellers ?? availableSellers
  const manualSelectionActive = filters.selectedLines !== undefined

  const reassignedCents = reassignments.reduce(
    (total, item) => total + item.subtotalCents,
    0
  )
  const reassignedBySeller = Object.entries(
    reassignments.reduce<Record<string, { count: number; cents: number }>>(
      (acc, item) => {
        const entry = acc[item.originalSellerKey] ?? { count: 0, cents: 0 }
        entry.count += 1
        entry.cents += item.subtotalCents
        acc[item.originalSellerKey] = entry
        return acc
      },
      {}
    )
  ).sort(([a], [b]) => a.localeCompare(b))

  const toggleSeller = (key: string) => {
    const next = selectedSellers.includes(key)
      ? selectedSellers.filter((item) => item !== key)
      : [...selectedSellers, key]

    void applyFilters({ sellers: next })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Comisión</CardTitle>
        <CardDescription>
          {sellerKey} · {formatPercent(ownRate)} sobre sus ventas +{" "}
          {formatPercent(teamRate)} sobre los demás vendedores
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs">
        <Row
          label={`Venta propia (base ${formatPercent(ownRate)})`}
          value={formatMoney(result.ownCents)}
        />
        <Row
          label={`Comisión propia (${formatPercent(ownRate)})`}
          value={formatMoney(result.ownCommissionCents)}
        />
        <Row
          label={`Venta equipo sin ${sellerKey} (base ${formatPercent(teamRate)})`}
          value={formatMoney(result.teamCents)}
        />
        <Row
          label={`Comisión equipo (${formatPercent(teamRate)})`}
          value={formatMoney(result.teamCommissionCents)}
        />
        <Row label="Anticipo" value={formatMoney(result.advanceCents)} />
        <Row label="Total comisión" value={formatMoney(result.totalCommissionCents)} emphasis />
        <Row
          label={result.netToPayCents < 0 ? "Saldo a favor" : "Neto a pagar"}
          value={formatMoney(Math.abs(result.netToPayCents))}
          emphasis
        />

        <div className="mt-4 space-y-2 border-t pt-3">
          {manualSelectionActive ? (
            <div className="space-y-1">
              <p className="font-medium">
                Selección manual activa: {formatInteger(filters.selectedLines?.length ?? 0)} líneas
              </p>
              <p className="text-muted-foreground">
                La comisión usa solo las líneas elegidas en la tabla. El filtro
                de vendedores no se aplica mientras esté activa.
              </p>
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading}
                onClick={() => void applyFilters({ selectedLines: undefined })}
              >
                Volver a todos los vendedores
              </button>
            </div>
          ) : null}
          {reassignments.length > 0 ? (
            <div className="space-y-1 rounded-md border border-emerald-600/30 bg-emerald-600/5 p-2">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                Constancia · reasignadas a {sellerKey}: {formatInteger(reassignments.length)} línea(s)
              </p>
              <p className="text-muted-foreground">
                Base {formatMoney(reassignedCents)} · pasan del 1% al 2%. El
                registro original no se modifica.
              </p>
              <ul className="space-y-0.5">
                {reassignedBySeller.map(([seller, entry]) => (
                  <li key={seller} className="flex justify-between gap-2">
                    <span className="truncate" title={seller}>
                      {seller}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatInteger(entry.count)} · {formatMoney(entry.cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div
            className={`flex items-center justify-between gap-2 ${manualSelectionActive ? "opacity-50" : ""}`}
          >
            <span className="font-medium">
              Vendedores incluidos ({formatInteger(selectedSellers.length)}/
              {formatInteger(availableSellers.length)})
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading || manualSelectionActive}
                onClick={() => void applyFilters({ sellers: [...availableSellers] })}
              >
                Todos
              </button>
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={isLoading || manualSelectionActive}
                onClick={() => void applyFilters({ sellers: [] })}
              >
                Ninguno
              </button>
            </div>
          </div>
          <div className="grid gap-1">
            {availableSellers.map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSellers.includes(key)}
                  disabled={isLoading || manualSelectionActive}
                  onChange={() => toggleSeller(key)}
                />
                <span className="truncate" title={key}>
                  {key}
                </span>
              </label>
            ))}
          </div>
          <p className="text-muted-foreground">
            Afecta solo a la comisión. KPIs y productos siguen con todos los
            vendedores. Base: Valor subtotal local (sin IVA); las NCE descuentan.
          </p>
        </div>

        {warnings.length > 0 ? (
          <ul className="mt-3 list-inside list-disc text-amber-600 dark:text-amber-400">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
