"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, RotateCcwIcon } from "lucide-react"
import type { DateRange, Matcher } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangeFilterProps {
  from: string
  to: string
  minDate?: string | null
  maxDate?: string | null
  disabled?: boolean
  onChange: (range: { from: string; to: string }) => void
}

export function DateRangeFilter({
  from,
  to,
  minDate,
  maxDate,
  disabled = false,
  onChange,
}: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [start, setStart] = React.useState<Date>()
  const [selectingEnd, setSelectingEnd] = React.useState(false)

  const rangeFrom = parseISO(from)
  const rangeTo = parseISO(to)
  const currentRange: DateRange = { from: rangeFrom, to: rangeTo }

  const selected: DateRange | undefined = selectingEnd
    ? start
      ? { from: start }
      : undefined
    : currentRange

  const disabledDays: Matcher[] = []
  if (minDate) disabledDays.push({ before: parseISO(minDate) })
  if (maxDate) disabledDays.push({ after: parseISO(maxDate) })

  const label =
    selectingEnd && start
      ? `${format(start, "dd MMM yyyy", { locale: es })} — …`
      : `${format(rangeFrom, "dd MMM", { locale: es })} — ${format(rangeTo, "dd MMM yyyy", { locale: es })}`

  function reset() {
    setStart(undefined)
    setSelectingEnd(false)
  }

  function handleDayClick(date: Date) {
    const min = minDate ? parseISO(minDate) : undefined
    const max = maxDate ? parseISO(maxDate) : undefined

    if ((min && date < min) || (max && date > max)) {
      return
    }

    if (!selectingEnd || !start) {
      setStart(date)
      setSelectingEnd(true)
      return
    }

    const rangeStart = date < start ? date : start
    const rangeEnd = date < start ? start : date

    reset()
    setOpen(false)
    onChange({
      from: format(rangeStart, "yyyy-MM-dd"),
      to: format(rangeEnd, "yyyy-MM-dd"),
    })
  }

  function applyFullRange() {
    if (!minDate || !maxDate) {
      return
    }

    reset()
    setOpen(false)
    onChange({ from: minDate, to: maxDate })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className="justify-start gap-2 font-normal"
          />
        }
      >
        <CalendarIcon className="size-4" />
        <span className="tabular-nums">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" side="bottom">
        <Calendar
          mode="range"
          locale={es}
          selected={selected}
          onDayClick={handleDayClick}
          disabled={disabledDays}
          defaultMonth={rangeFrom}
          numberOfMonths={1}
        />
        <div className="flex items-center justify-end gap-3 border-t p-2">
          {selectingEnd ? (
            <span className="mr-auto text-muted-foreground">
              Ahora elegí el fin
            </span>
          ) : null}
          {minDate && maxDate ? (
            <Button variant="ghost" size="sm" onClick={applyFullRange}>
              <RotateCcwIcon className="size-3.5" />
              Rango completo
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
