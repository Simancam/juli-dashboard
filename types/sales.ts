export type DocType = "FEV" | "FEF" | "FEE" | "NCE"

export interface SaleLine {
  id: string
  datasetId: string
  documentNumber: string
  docType: DocType
  /** Fecha sin hora en formato YYYY-MM-DD. */
  date: string
  status: string
  /** C.O. tal como viene en el archivo, conservando ceros iniciales. */
  costCenter: string
  sellerName: string
  sellerId: string
  sellerKey: string
  clientName: string
  clientKey: string
  item: string
  itemDescription: string
  unit: string
  quantity: number
  /** Valor subtotal local en centavos (sin IVA). */
  subtotalCents: number
  /** Valor neto en centavos, usado para controles de calidad. */
  netCents: number
  margin: number
  warehouse: string
  familyKey: string
  isProduct: boolean
  isReturn: boolean
}

export type SaleLineDraft = Omit<SaleLine, "id" | "datasetId">

export interface DateRange {
  /** YYYY-MM-DD */
  start: string
  /** YYYY-MM-DD */
  end: string
}
