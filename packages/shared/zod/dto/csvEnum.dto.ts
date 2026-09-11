import { z } from 'zod'

/**
 * Builds a parser for comma-separated enum query params, producing a deduped
 * array constrained to `values`. Empty input fails `.min(1)` — callers with
 * nothing selected skip the request rather than sending an empty filter.
 * Order is preserved from input; cache-key callers sort separately when
 * stability is required.
 */
export function csvEnumSchema<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((raw) => [
      ...new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ])
    .pipe(z.array(z.enum(values)).min(1).max(values.length))
}
