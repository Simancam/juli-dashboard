"use client"

import { DateField } from "@/components/ui/date-field"

interface DateRangeFilterProps {
  from: string
  to: string
  minDate?: string | null
  maxDate?: string | null
  disabled?: boolean
  onChange: (range: { from: string; to: string }) => void
}

/** Filtro del Panel: dos fechas independientes, aplicadas al elegirlas. */
export function DateRangeFilter({
  from,
  to,
  minDate,
  maxDate,
  disabled = false,
  onChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <DateField
        id="panel-fecha-inicio"
        label="Fecha inicio"
        value={from}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        onChange={(nextFrom) =>
          onChange({ from: nextFrom, to: nextFrom > to ? nextFrom : to })
        }
      />
      <DateField
        id="panel-fecha-fin"
        label="Fecha fin"
        value={to}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        onChange={(nextTo) =>
          onChange({ from: nextTo < from ? nextTo : from, to: nextTo })
        }
      />
    </div>
  )
}
