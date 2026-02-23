import { ref } from 'vue'

const baseUrl = __APP_CONFIG__.API_BASE_URL || ''

interface ApiOptions {
  method?: string
  body?: unknown
  params?: Record<string, string | number | undefined>
}

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = opts

  let url = `${baseUrl}${path}`
  if (params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value))
    }
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${text || res.statusText}`)
  }

  return res.json()
}

export function useApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function call<T>(path: string, opts: ApiOptions = {}): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      return await request<T>(path, opts)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  return { call, loading, error }
}

export { request as apiRequest }
