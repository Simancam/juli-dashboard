"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatInteger } from "@/utils/format"

export interface SellerSelectorProps {
  sellers: string[]
  /** undefined = todos; array vacío = ninguno. */
  selected: string[] | undefined
  disabled?: boolean
  onChange: (keys: string[] | undefined) => void
}

export function SellerSelector({
  sellers,
  selected,
  disabled = false,
  onChange,
}: SellerSelectorProps) {
  const selectedSet = new Set(selected ?? sellers)

  const toggle = (key: string) => {
    const next = new Set(selectedSet)

    if (next.has(key)) next.delete(key)
    else next.add(key)

    onChange([...next])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendedores de la base de equipo</CardTitle>
        <CardDescription>
          Elige cuáles vendedores entran en la base del team rate. Las líneas
          reasignadas se suman a la venta propia sin cambiar el archivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
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
        {sellers.length === 0 ? (
          <p className="text-muted-foreground">No hay vendedores en el periodo.</p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {sellers.map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
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
      </CardContent>
    </Card>
  )
}
