import MobileDetect from 'mobile-detect'

export function detectMobile(): boolean {
  const md = new MobileDetect(window.navigator.userAgent)
  return !!md.mobile()
}
