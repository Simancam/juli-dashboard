"use client"

import type { ReactNode } from "react"
import {
  ArrowRightIcon,
  EqualIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CommissionResult } from "@/types/commissions"
import { formatMoney, formatPercent } from "@/utils/format"

const REASSIGNED_COLOR = "text-emerald-600 dark:text-emerald-400"

interface CommissionResultCardProps {
  result: CommissionResult
  ownRate: number
  teamRate: number
  sellerKey: string
  reassignmentCount?: number
  reassignedCents?: number
  title?: string
  className?: string
}

function CalculationRow({
  label,
  detail,
  base,
  baseSuffix,
  rate,
  commission,
}: {
  label: ReactNode
  detail: ReactNode
  base: number
  baseSuffix?: ReactNode
  rate: number
  commission: number
}) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums sm:gap-x-3">
        <span>{formatMoney(base)}</span>
        {baseSuffix}
        <XIcon className="size-3 text-muted-foreground" />
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
          {formatPercent(rate)}
        </span>
        <EqualIcon className="size-3 text-muted-foreground" />
        <span className="min-w-[7.5rem] text-right font-medium">
          {formatMoney(commission)}
        </span>
      </div>
    </div>
  )
}

/**
 * Resultado de comisiones explicado paso a paso: base × tasa por tipo de
 * venta, suma de las dos comisiones y descuento del anticipo.
 */
export function CommissionResultCard({
  result,
  ownRate,
  teamRate,
  sellerKey,
  reassignmentCount = 0,
  reassignedCents = 0,
  title = "Resultado",
  className,
}: CommissionResultCardProps) {
  // Mostramos `ventas propias + reasignadas` en la misma fila; el total de ambas
  // es el que ya calculó el servidor y sobre el que se aplica la tasa.
  const reassignedBase = Math.max(
    0,
    Math.min(reassignedCents, result.ownCents)
  )
  const ownBase = result.ownCents - reassignedBase

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <section className="space-y-2">
          <p className="font-medium uppercase tracking-wide text-muted-foreground">
            1 · Comisión por tipo de venta
          </p>
          <div className="divide-y rounded-md border">
            <CalculationRow
              label="Venta propia"
              detail={`Ventas de ${sellerKey}`}
              base={ownBase}
              baseSuffix={
                reassignmentCount > 0 && reassignedBase > 0 ? (
                  <span className={REASSIGNED_COLOR}>
                    + {formatMoney(reassignedBase)}
                  </span>
                ) : undefined
              }
              rate={ownRate}
              commission={result.ownCommissionCents}
            />
            <CalculationRow
              label="Venta del equipo"
              detail="Ventas de los demás vendedores"
              base={result.teamCents}
              rate={teamRate}
              commission={result.teamCommissionCents}
            />
          </div>
        </section>

        <section className="space-y-2">
          <p className="font-medium uppercase tracking-wide text-muted-foreground">
            2 · Total de comisión
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-muted/30 px-3 py-2.5 tabular-nums">
            <span>{formatMoney(result.ownCommissionCents)}</span>
            <PlusIcon className="size-3 text-muted-foreground" />
            <span>{formatMoney(result.teamCommissionCents)}</span>
            <EqualIcon className="size-3 text-muted-foreground" />
            <span className="font-medium">
              {formatMoney(result.totalCommissionCents)}
            </span>
          </div>
        </section>

        <section className="space-y-2">
          <p className="font-medium uppercase tracking-wide text-muted-foreground">
            3 · Lo que se paga
          </p>
          <div className="space-y-1.5 rounded-md border bg-muted/30 px-3 py-2.5 tabular-nums">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Total comisión</span>
              <span>{formatMoney(result.totalCommissionCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MinusIcon className="size-3" /> Anticipo
              </span>
              <span>{formatMoney(result.advanceCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-2">
              <span className="font-medium">Neto a pagar</span>
              <span className="flex items-center gap-2 text-base font-semibold">
                <ArrowRightIcon className="size-4 text-muted-foreground" />
                {formatMoney(result.netToPayCents)}
              </span>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
