let previousUrl: string = '/browse'

export function setPreviousUrl(url: string) {
  previousUrl = url
}

export function getPreviousUrl(): string {
  return previousUrl
}
