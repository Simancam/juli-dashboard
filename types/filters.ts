import type { DocType } from "./sales"

export interface FilterOption {
  value: string
  label: string
  count: number
}

export interface FilterOptions {
  sellers: FilterOption[]
  clients: FilterOption[]
  families: FilterOption[]
  items: FilterOption[]
  warehouses: FilterOption[]
  docTypes: Array<{ value: DocType; label: string; count: number }>
  dateMin: string | null
  dateMax: string | null
}
