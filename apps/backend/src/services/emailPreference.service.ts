import type { EmailPreference, EmailPreferenceSource, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  EMAIL_SCOPES,
  EMAIL_SCOPE_DEFAULTS,
  type EmailPreferences,
  type EmailScope,
  type UpdateEmailPreferences,
} from '@zod/user/emailPreference.dto'

type PreferenceRow = Pick<EmailPreference, 'scope' | 'granted'>
type Db = Prisma.TransactionClient | typeof prisma

/** Select the rows needed to decide what a user receives. */
export const emailPreferencesSelect = {
  emailPreferences: { select: { scope: true, granted: true } },
} as const

/** Nested write that gives a new user one row per scope at its default value. */
export function defaultEmailPreferencesCreate(): Prisma.EmailPreferenceCreateNestedManyWithoutUserInput {
  return {
    createMany: {
      data: EMAIL_SCOPES.map((scope) => ({
        scope,
        granted: EMAIL_SCOPE_DEFAULTS[scope],
        source: 'default' as const,
      })),
    },
  }
}

/** Whether the user receives a scope. A missing row means no. */
export function isGranted(rows: readonly PreferenceRow[], scope: EmailScope): boolean {
  return rows.some((row) => row.scope === scope && row.granted)
}

/** Rows as a `{ scope: granted }` map covering every scope. */
export function toEmailPreferences(rows: readonly PreferenceRow[]): EmailPreferences {
  return Object.fromEntries(
    EMAIL_SCOPES.map((scope) => [scope, isGranted(rows, scope)])
  ) as EmailPreferences
}

/** The single write path for email preferences. */
export async function setEmailPreferences(
  db: Db,
  userId: string,
  changes: UpdateEmailPreferences,
  source: EmailPreferenceSource
): Promise<void> {
  for (const [scope, granted] of Object.entries(changes) as [EmailScope, boolean][]) {
    await db.emailPreference.upsert({
      where: { userId_scope: { userId, scope } },
      create: { userId, scope, granted, source },
      update: { granted, source },
    })
  }
}
