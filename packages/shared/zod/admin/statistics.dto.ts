import { z } from 'zod'
import {
  ActivitySegmentSchema,
  type ActivitySegmentType,
} from '../generated/inputTypeSchemas/ActivitySegmentSchema'
import type { RelationshipStatusType } from '../generated/inputTypeSchemas/RelationshipStatusSchema'
import type { HasKidsType } from '../generated/inputTypeSchemas/HasKidsSchema'

export const AdminStatisticsQuerySchema = z.object({
  origin: z.string().min(1).optional(),
  segment: ActivitySegmentSchema.optional(),
})
export type AdminStatisticsQuery = z.infer<typeof AdminStatisticsQuerySchema>

export type StatisticsSegment = ActivitySegmentType

/** `other` is every gender that isn't male or female, including unspecified. */
export interface GenderCounts {
  male: number
  female: number
  other: number
}

export interface MatchCounts {
  /** People in the group. */
  count: number
  /** Median mutual matches per person, null for an empty group. */
  median: number | null
}

export interface AdminStatistics {
  /** Every brand domain, whatever the filter. */
  origins: string[]
  profiles: { total: number; social: number; dating: number; hidden: number }
  /** Dating profiles, hidden ones included. */
  dating: {
    gender: GenderCounts
    medianAge: { all: number | null; male: number | null; female: number | null }
    ageBands: ({ band: string } & GenderCounts)[]
    relationship: ({ value: RelationshipStatusType } & GenderCounts)[]
    hasKids: ({ value: HasKidsType } & GenderCounts)[]
  }
  /** Mutual matches per person, hidden profiles excluded on both sides. */
  pool: {
    gender: GenderCounts
    /** People with at most FEW_MATCHES_MAX matches. */
    fewMatches: number
    ageBands: { band: string; male: MatchCounts; female: MatchCounts }[]
    distribution: ({ range: string } & GenderCounts)[]
  }
}

export const FEW_MATCHES_MAX = 5

export interface AdminStatisticsResponse {
  success: true
  statistics: AdminStatistics
}
