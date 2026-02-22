export function shouldShowLandingPage(pathname: string, hasToken: boolean): boolean {
  return pathname === '/' && !hasToken
}
