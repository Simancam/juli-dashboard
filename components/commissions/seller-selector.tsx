"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCommissionProfile } from "@/lib/config/commission-profiles"
import { formatInteger } from "@/utils/format"

export interface SellerSelectorProps {
  sellers: string[]
  /** undefined = todos; array vacío = ninguno. */
  selected: string[] | undefined
  disabled?: boolean
  className?: string
  onChange: (keys: string[] | undefined) => void
}

export function SellerSelector({
  sellers,
  selected,
  disabled = false,
  className,
  onChange,
}: SellerSelectorProps) {
  const selectedSet = new Set(selected ?? sellers)
  const profileSellerKey = getCommissionProfile().sellerKey

  const toggle = (key: string) => {
    const next = new Set(selectedSet)

    if (next.has(key)) next.delete(key)
    else next.add(key)

    onChange([...next])
  }

  const content = (
    <div className="flex flex-1 flex-col text-xs">
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <span className="font-medium">
          {formatInteger(selectedSet.size)}/{formatInteger(sellers.length)} vendedores
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            className="underline disabled:opacity-50"
            disabled={disabled}
            onClick={() => onChange(undefined)}
          >
            Todos
          </button>
          <button
            type="button"
            className="underline disabled:opacity-50"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Ninguno
          </button>
        </div>
      </div>
      {sellers.length === 0 ? null : (
        <div className="grid gap-1 pt-2 sm:grid-cols-2">
          {sellers.map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                className={
                  key === profileSellerKey
                    ? "accent-emerald-600"
                    : "accent-[#3b82f6]"
                }
                checked={selectedSet.has(key)}
                disabled={disabled}
                onChange={() => toggle(key)}
              />
              <span className="truncate" title={key}>
                {key}
              </span>
            </label>
          ))}
        </div>
      )}
      {sellers.length === 0 ? (
        <p className="mt-auto border-t pt-2 text-muted-foreground">
          No hay vendedores en el periodo.
        </p>
      ) : null}
    </div>
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Vendedores</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{content}</CardContent>
    </Card>
  )
}
