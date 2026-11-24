import { z } from "zod"

import { isoDateSchema } from "./common"

export const panelQuerySchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    seller: z.array(z.string().trim().min(1).max(300)).optional(),
  })
  .superRefine((value, ctx) => {
    const hasFrom = value.from !== undefined
    const hasTo = value.to !== undefined

    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: "custom",
        message: "`from` y `to` deben enviarse juntos",
        path: hasFrom ? ["to"] : ["from"],
      })
      return
    }

    if (value.from !== undefined && value.to !== undefined && value.from > value.to) {
      ctx.addIssue({
        code: "custom",
        message: "`from` no puede ser posterior a `to`",
        path: ["to"],
      })
    }
  })

export type PanelQuery = z.infer<typeof panelQuerySchema>
