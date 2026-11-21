import { type Prisma } from '@prisma/client'

/**
 * UserContent filter excluding events whose start time has passed.
 * Non-event content always passes. Apply to map/grid reads so past events
 * don't linger on the map; owner lists and direct links still show them.
 */
export const notPastEventWhere = (now: Date = new Date()) =>
  ({
    OR: [{ kind: { not: 'event' } }, { event: { startsAt: { gte: now } } }],
  }) satisfies Prisma.UserContentWhereInput
