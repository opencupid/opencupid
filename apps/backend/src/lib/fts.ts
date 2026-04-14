/**
 * PostgreSQL full-text search dictionary selection for the /search endpoint.
 *
 * The `LocalizedProfileField.tsv` generated column uses these dictionaries
 * (chosen per-row from the row's `locale`), so query-time lookups must use
 * the matching dictionary to get valid results.
 *
 * `Post.tsv` always uses the 'simple' dictionary — see POST_FTS_DICTIONARY.
 */

export const PROFILE_FTS_DICTIONARY_BY_LOCALE: Record<string, string> = {
  en: 'english',
  hu: 'hungarian',
}

export const DEFAULT_PROFILE_FTS_DICTIONARY = 'english'

export const POST_FTS_DICTIONARY = 'simple'

/** Resolve a session locale to its Postgres text-search configuration. */
export function profileFtsDictionary(locale: string): string {
  return PROFILE_FTS_DICTIONARY_BY_LOCALE[locale] ?? DEFAULT_PROFILE_FTS_DICTIONARY
}
