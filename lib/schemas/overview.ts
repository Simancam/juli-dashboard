import { z } from "zod"

import { isoDateSchema } from "./common"

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1"
}

export const overviewQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    metric: z.enum(["value", "quantity"]).default("value"),
    order: z.enum(["asc", "desc"]).default("desc"),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    advance: z.coerce.number().int().min(0).default(0),
    includeNonProducts: z.preprocess(parseBoolean, z.boolean()),
    sellers: z.array(z.string().min(1)).optional(),
    selectedLines: z.array(z.coerce.number().int().nonnegative()).optional(),
    reassignedLines: z.array(z.coerce.number().int().nonnegative()).optional(),
  })
  .superRefine((value, ctx) => {
    const hasFrom = value.from !== undefined
    const hasTo = value.to !== undefined

    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: "custom",
        message: "`from` y `to` deben enviarse juntos",
        path: [hasFrom ? "to" : "from"],
      })
      return
    }

    if (
      value.from !== undefined &&
      value.to !== undefined &&
      value.from > value.to
    ) {
      ctx.addIssue({
        code: "custom",
        message: "`from` no puede ser posterior a `to`",
        path: ["to"],
      })
    }
  })
