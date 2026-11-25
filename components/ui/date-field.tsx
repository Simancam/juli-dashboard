"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DateFieldProps {
  id: string
  label: string
  value: string
  minDate?: string | null
  maxDate?: string | null
  disabled?: boolean
  onChange: (value: string) => void
}

/** Campo de fecha única con calendario de shadcn y límites deshabilitados. */
export function DateField({
  id,
  label,
  value,
  minDate,
  maxDate,
  disabled = false,
  onChange,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false)

  const disabledDays: Matcher[] = []
  if (minDate) disabledDays.push({ before: parseISO(minDate) })
  if (maxDate) disabledDays.push({ after: parseISO(maxDate) })

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              disabled={disabled}
              className="w-44 justify-start gap-2 font-normal"
            />
          }
        >
          <CalendarIcon className="size-4" />
          <span className="tabular-nums">
            {format(parseISO(value), "dd MMM yyyy", { locale: es })}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom">
          <Calendar
            mode="single"
            locale={es}
            selected={parseISO(value)}
            onSelect={(date) => {
              if (!date) {
                return
              }

              setOpen(false)
              onChange(format(date, "yyyy-MM-dd"))
            }}
            disabled={disabledDays}
            defaultMonth={parseISO(value)}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
