

export type ProfileScope = 'social' | 'dating'

export type ScopeSelectModel = {
  scopes: ProfileScope[],
  currentScope: ProfileScope | null,
}

