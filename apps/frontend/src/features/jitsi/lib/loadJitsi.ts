declare global {
  interface Window {
    JitsiMeetExternalAPI?: unknown
  }
}

let loading: Promise<void> | null = null

export function loadJitsi() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
  return loading
}
