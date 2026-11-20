import { z } from "zod"

import { dateRangeOptions, isoDateSchema } from "./common"

export const commissionQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    /** Anticipo en centavos. */
    advance: z.coerce.number().int().min(0).default(0),
  })
  .refine((value) => value.from <= value.to, dateRangeOptions)
