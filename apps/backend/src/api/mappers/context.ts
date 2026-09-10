import type { FastifyRequest } from 'fastify'

/**
 * Per-request context every UserContent mapper needs.
 *
 * Bundled into an object rather than passed as positional arguments because
 * both fields are plain strings: `mapDbPostToPublic(row, viewerProfileId,
 * locale)` would let a transposed pair through the type checker and surface
 * as tag names resolved against a profile id. A named field per value makes
 * that swap impossible.
 *
 * Routes build one from the session: `{ viewerProfileId: req.session.profileId,
 * locale: req.session.lang }`.
 */
export type MapperContext = {
  /** Profile viewing the content — drives `isOwn` and conversation context. */
  viewerProfileId: string
  /** Session locale, used to resolve translated tag names. */
  locale: string
}

/** Builds the mapper context for the current request. */
export function mapperContext(req: FastifyRequest): MapperContext {
  return {
    viewerProfileId: req.session.profileId,
    locale: req.session.lang,
  }
}
