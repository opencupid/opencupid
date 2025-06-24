
export function tagTranslationsInclude(locale: string) {
  return {
    translations: true
  }
}


export function translationWhereClause(term: string, locale: string) {
  return {
    translations: {
      some: {
        locale,
        name: {
          contains: term,
          mode: 'insensitive' as const,
        },
      },
    },
  }
}
