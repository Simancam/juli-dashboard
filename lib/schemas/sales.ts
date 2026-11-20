import { z } from "zod"

import { isoDateSchema } from "./common"
import { docTypeSchema } from "./analytics"

export const saleLineDraftSchema = z.object({
  documentNumber: z.string().min(1),
  docType: docTypeSchema,
  date: isoDateSchema,
  status: z.string().min(1),
  costCenter: z.string(),
  sellerName: z.string().min(1),
  sellerId: z.string(),
  sellerKey: z.string().min(1),
  clientName: z.string().min(1),
  clientKey: z.string().min(1),
  item: z.string().min(1),
  itemDescription: z.string(),
  unit: z.string().min(1),
  quantity: z.number().finite(),
  subtotalCents: z.number().int(),
  netCents: z.number().int(),
  margin: z.number().finite(),
  warehouse: z.string(),
  familyKey: z.string().min(1),
  isProduct: z.boolean(),
  isReturn: z.boolean(),
})
