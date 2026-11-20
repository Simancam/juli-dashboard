import type { SaleLine, SaleLineDraft } from "@/types/sales"

const baseDraft: SaleLineDraft = {
  documentNumber: "FEF-1",
  docType: "FEF",
  date: "2025-10-21",
  status: "Aprobada",
  costCenter: "001",
  sellerName: "MONTES CUELLO JULIANA",
  sellerId: "1000",
  sellerKey: "MONTES CUELLO JULIANA",
  clientName: "CLIENTE UNO",
  clientKey: "CLIENTE UNO",
  item: "ABRAZ-001",
  itemDescription: "ABRAZADERA 1/2",
  unit: "UND",
  quantity: 1,
  subtotalCents: 100_000,
  netCents: 100_000,
  margin: 0.2,
  warehouse: "BOGOTA",
  familyKey: "ABRAZADERAS",
  isProduct: true,
  isReturn: false,
}

export function makeSaleLineDraft(
  overrides: Partial<SaleLineDraft> = {}
): SaleLineDraft {
  return { ...baseDraft, ...overrides }
}

export function makeSaleLine(overrides: Partial<SaleLine> = {}): SaleLine {
  return {
    id: "line-1",
    datasetId: "dataset-1",
    ...makeSaleLineDraft(),
    ...overrides,
  }
}
