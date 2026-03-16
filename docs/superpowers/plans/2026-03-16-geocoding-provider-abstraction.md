# Geocoding Provider Abstraction — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tightly-coupled Komoot Photon geocoding integration with a provider-agnostic architecture and add Nominatim as a second provider.

**Architecture:** Shared `GeocodingResult` type + `GeocodingProvider` function signature. Two provider modules (Photon, Nominatim) implement the signature. A `useGeocoder` composable selects the active provider. A Pinia store wraps the composable for reactive state. Consumers import only the store and `GeocodingResult`.

**Tech Stack:** Vue 3, Pinia, TypeScript, `@types/geojson`, axios, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-geocoding-provider-abstraction-design.md`

---

## File Structure

```
apps/frontend/src/features/geocoding/
  types.ts                                    # GeocodingResult, GeocodingProvider
  composables/
    useGeocoder.ts                            # provider switch point
  providers/
    photon.ts                                 # Photon API fetch+map
    nominatim.ts                              # Nominatim API fetch+map
  stores/
    geocodingStore.ts                         # Pinia store (consumer-facing)
    __tests__/
      geocodingStore.spec.ts                  # store tests
  __tests__/
    photon.spec.ts                            # Photon provider tests
    nominatim.spec.ts                         # Nominatim provider tests
```

**Files to delete:**
- `apps/frontend/src/features/komoot/stores/komootStore.ts`
- `apps/frontend/src/features/komoot/stores/__tests__/komootStore.spec.ts`
- `apps/frontend/src/features/komoot/` (entire directory)

**Files to modify:**
- `apps/frontend/src/features/shared/profileform/LocationSelector.vue` (import paths + type rename)
- `apps/frontend/src/features/shared/profileform/__tests__/LocationSelector.spec.ts` (mock paths)

---

## Chunk 1: Shared Types + Photon Provider (extract from existing code)

### Task 1: Create shared types

**Files:**
- Create: `apps/frontend/src/features/geocoding/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
export interface GeocodingResult {
  name: string
  country: string // ISO 3166-1 alpha-2, uppercase (e.g. "DE")
  lat: number
  lon: number
}

export type GeocodingProvider = (
  query: string,
  lang: string,
) => Promise<GeocodingResult[]>
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/features/geocoding/types.ts
git commit -m "feat(geocoding): add shared GeocodingResult and GeocodingProvider types"
```

---

### Task 2: Create Photon provider with tests (TDD)

**Files:**
- Create: `apps/frontend/src/features/geocoding/__tests__/photon.spec.ts`
- Create: `apps/frontend/src/features/geocoding/providers/photon.ts`

- [ ] **Step 1: Write the Photon provider tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  axios: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { searchPhoton } from '../providers/photon'

describe('searchPhoton', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('calls the Photon API with correct URL and params', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('Berlin', 'en')

    expect(mockGet).toHaveBeenCalledOnce()
    const [url, config] = mockGet.mock.calls[0]!
    expect(url).toBe('https://photon.komoot.io/api/')

    const params: URLSearchParams = config.params
    expect(params.get('q')).toBe('Berlin')
    expect(params.get('lang')).toBe('en')
    expect(params.get('limit')).toBe('10')
    expect(params.getAll('osm_tag')).toEqual([
      'place:city',
      'place:town',
      'place:village',
      'place:hamlet',
    ])
    expect(params.getAll('layer')).toEqual(['city', 'locality'])
  })

  it('passes through de lang (Photon supports en/de)', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('Berlin', 'de')

    const params: URLSearchParams = mockGet.mock.calls[0]![1].params
    expect(params.get('lang')).toBe('de')
  })

  it('defaults unsupported languages to en', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('Paris', 'fr')

    const params: URLSearchParams = mockGet.mock.calls[0]![1].params
    expect(params.get('lang')).toBe('en')
  })

  it('maps GeoJSON features to GeocodingResult[]', async () => {
    mockGet.mockResolvedValue({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [13.4, 52.5] },
            properties: { name: 'Berlin', countrycode: 'DE' },
          },
        ],
      },
    })

    const results = await searchPhoton('Berlin', 'en')

    expect(results).toEqual([{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }])
  })

  it('returns empty array when no features', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    const results = await searchPhoton('nonexistent', 'en')

    expect(results).toEqual([])
  })

  it('propagates errors (does not catch)', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    await expect(searchPhoton('Berlin', 'en')).rejects.toThrow('Network error')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/geocoding/__tests__/photon.spec.ts`
Expected: FAIL — module `../providers/photon` not found

- [ ] **Step 3: Implement the Photon provider**

```typescript
import { axios } from '@/lib/api'
import type { FeatureCollection, Point } from 'geojson'
import type { GeocodingProvider, GeocodingResult } from '../types'

interface PhotonProperties {
  name: string
  countrycode: string
}

const SUPPORTED_LANGS = ['en', 'de']
const OSM_TAG_FILTERS = ['place:city', 'place:town', 'place:village', 'place:hamlet']

export const searchPhoton: GeocodingProvider = async (query, lang) => {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('lang', SUPPORTED_LANGS.includes(lang) ? lang : 'en')
  params.set('limit', '10')
  for (const tag of OSM_TAG_FILTERS) {
    params.append('osm_tag', tag)
  }
  params.append('layer', 'city')
  params.append('layer', 'locality')

  const res = await axios.get<FeatureCollection<Point, PhotonProperties>>(
    'https://photon.komoot.io/api/',
    { params },
  )

  return (res.data.features ?? []).map((f): GeocodingResult => ({
    name: f.properties.name,
    country: f.properties.countrycode,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/geocoding/__tests__/photon.spec.ts`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/geocoding/__tests__/photon.spec.ts apps/frontend/src/features/geocoding/providers/photon.ts
git commit -m "feat(geocoding): add Photon provider with tests"
```

---

### Task 3: Create useGeocoder composable

**Files:**
- Create: `apps/frontend/src/features/geocoding/composables/useGeocoder.ts`

- [ ] **Step 1: Create the composable**

```typescript
import { searchPhoton } from '../providers/photon'
// import { searchNominatim } from '../providers/nominatim'

export function useGeocoder() {
  const search = searchPhoton
  // To switch provider: const search = searchNominatim
  return { search }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/features/geocoding/composables/useGeocoder.ts
git commit -m "feat(geocoding): add useGeocoder composable as provider switch point"
```

---

### Task 4: Create geocoding store with tests (TDD)

**Files:**
- Create: `apps/frontend/src/features/geocoding/stores/__tests__/geocodingStore.spec.ts`
- Create: `apps/frontend/src/features/geocoding/stores/geocodingStore.ts`

- [ ] **Step 1: Write the store tests**

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSearch = vi.fn()

vi.mock('../../composables/useGeocoder', () => ({
  useGeocoder: () => ({ search: mockSearch }),
}))

import { useGeocodingStore } from '../geocodingStore'

describe('geocodingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSearch.mockReset()
  })

  it('returns results from the geocoder', async () => {
    const mockResults = [{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }]
    mockSearch.mockResolvedValue(mockResults)

    const store = useGeocodingStore()
    const results = await store.search('Berlin', 'en')

    expect(mockSearch).toHaveBeenCalledWith('Berlin', 'en')
    expect(results).toEqual(mockResults)
    expect(store.results).toEqual(mockResults)
  })

  it('sets isLoading during search', async () => {
    let resolveSearch: (v: unknown[]) => void
    mockSearch.mockReturnValue(new Promise((r) => { resolveSearch = r }))

    const store = useGeocodingStore()
    const searchPromise = store.search('Berlin', 'en')

    expect(store.isLoading).toBe(true)

    resolveSearch!([])
    await searchPromise

    expect(store.isLoading).toBe(false)
  })

  it('returns empty results for empty query without calling geocoder', async () => {
    const store = useGeocodingStore()
    const results = await store.search('', 'en')

    expect(results).toEqual([])
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('catches errors and returns empty results', async () => {
    mockSearch.mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = useGeocodingStore()
    const results = await store.search('Berlin', 'en')

    expect(results).toEqual([])
    expect(store.results).toEqual([])
    expect(store.isLoading).toBe(false)
    consoleSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/geocoding/stores/__tests__/geocodingStore.spec.ts`
Expected: FAIL — module `../geocodingStore` not found

- [ ] **Step 3: Implement the store**

```typescript
import { defineStore } from 'pinia'
import { useGeocoder } from '../composables/useGeocoder'
import type { GeocodingResult } from '../types'

export type { GeocodingResult }

export const useGeocodingStore = defineStore('geocoding', {
  state: () => ({
    results: [] as GeocodingResult[],
    isLoading: false,
  }),

  actions: {
    async search(query: string, lang: string): Promise<GeocodingResult[]> {
      if (!query) {
        this.results = []
        return this.results
      }
      this.isLoading = true
      try {
        const { search } = useGeocoder()
        this.results = await search(query, lang)
        return this.results
      } catch (err) {
        console.error('Geocoding search failed:', err)
        this.results = []
        return this.results
      } finally {
        this.isLoading = false
      }
    },
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/geocoding/stores/__tests__/geocodingStore.spec.ts`
Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/geocoding/stores/__tests__/geocodingStore.spec.ts apps/frontend/src/features/geocoding/stores/geocodingStore.ts
git commit -m "feat(geocoding): add geocoding store with tests"
```

---

## Chunk 2: Nominatim Provider + Consumer Migration + Cleanup

### Task 5: Create Nominatim provider with tests (TDD)

**Files:**
- Create: `apps/frontend/src/features/geocoding/__tests__/nominatim.spec.ts`
- Create: `apps/frontend/src/features/geocoding/providers/nominatim.ts`

- [ ] **Step 1: Write the Nominatim provider tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  axios: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { searchNominatim } from '../providers/nominatim'

describe('searchNominatim', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('calls the Nominatim API with correct URL and params', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchNominatim('Berlin', 'de')

    expect(mockGet).toHaveBeenCalledOnce()
    const [url, config] = mockGet.mock.calls[0]!
    expect(url).toBe('https://nominatim.openstreetmap.org/search')

    const params: URLSearchParams = config.params
    expect(params.get('q')).toBe('Berlin')
    expect(params.get('format')).toBe('geojson')
    expect(params.get('addressdetails')).toBe('1')
    expect(params.get('limit')).toBe('10')
    expect(params.get('featureType')).toBe('city')
    expect(params.get('accept-language')).toBe('de')
  })

  it('sets User-Agent header per Nominatim usage policy', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchNominatim('Berlin', 'en')

    const config = mockGet.mock.calls[0]![1]
    expect(config.headers['User-Agent']).toBe('OpenCupid/1.0')
  })

  it('maps GeoJSON features to GeocodingResult[] with uppercase country', async () => {
    mockGet.mockResolvedValue({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [13.3951, 52.5174] },
            properties: {
              name: 'Berlin',
              display_name: 'Berlin, Deutschland',
              address: { country_code: 'de', country: 'Deutschland', city: 'Berlin' },
            },
          },
        ],
      },
    })

    const results = await searchNominatim('Berlin', 'en')

    expect(results).toEqual([
      { name: 'Berlin', country: 'DE', lat: 52.5174, lon: 13.3951 },
    ])
  })

  it('returns empty array when no features', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    const results = await searchNominatim('nonexistent', 'en')

    expect(results).toEqual([])
  })

  it('propagates errors (does not catch)', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    await expect(searchNominatim('Berlin', 'en')).rejects.toThrow('Network error')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/geocoding/__tests__/nominatim.spec.ts`
Expected: FAIL — module `../providers/nominatim` not found

- [ ] **Step 3: Implement the Nominatim provider**

```typescript
import { axios } from '@/lib/api'
import type { FeatureCollection, Point } from 'geojson'
import type { GeocodingProvider, GeocodingResult } from '../types'

interface NominatimProperties {
  name: string
  address: {
    country_code: string
  }
}

export const searchNominatim: GeocodingProvider = async (query, lang) => {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('format', 'geojson')
  params.set('addressdetails', '1')
  params.set('limit', '10')
  params.set('featureType', 'city')
  params.set('accept-language', lang)

  const res = await axios.get<FeatureCollection<Point, NominatimProperties>>(
    'https://nominatim.openstreetmap.org/search',
    {
      params,
      headers: { 'User-Agent': 'OpenCupid/1.0' },
    },
  )

  return (res.data.features ?? []).map((f): GeocodingResult => ({
    name: f.properties.name,
    country: f.properties.address.country_code.toUpperCase(),
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/geocoding/__tests__/nominatim.spec.ts`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/geocoding/__tests__/nominatim.spec.ts apps/frontend/src/features/geocoding/providers/nominatim.ts
git commit -m "feat(geocoding): add Nominatim provider with tests"
```

---

### Task 6: Update CSP configuration

**Files:**
- Modify: `.env.example:57`

- [ ] **Step 1: Add Nominatim domain to CSP_ALLOWED_DOMAINS**

In `.env.example`, line 57 — change:
```
# OLD:
CSP_ALLOWED_DOMAINS="https://photon.komoot.io https://api.maptiler.com"
# NEW:
CSP_ALLOWED_DOMAINS="https://photon.komoot.io https://nominatim.openstreetmap.org https://api.maptiler.com"
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add Nominatim domain to CSP_ALLOWED_DOMAINS"
```

---

### Task 7: Update consumers and delete old komoot code

**Files:**
- Modify: `apps/frontend/src/features/shared/profileform/LocationSelector.vue:4,19,22,37,40-41,43,53,69,74`
- Modify: `apps/frontend/src/features/shared/profileform/__tests__/LocationSelector.spec.ts:6-8`
- Delete: `apps/frontend/src/features/komoot/` (entire directory)

- [ ] **Step 1: Update LocationSelector.vue imports and references**

In `LocationSelector.vue`, make these changes:

Line 4 — change import:
```
// OLD:
import { useKomootStore, type KomootLocation } from '@/features/komoot/stores/komootStore'
// NEW:
import { useGeocodingStore, type GeocodingResult } from '@/features/geocoding/stores/geocodingStore'
```

Line 37 — change store instantiation:
```
// OLD:
const komoot = useKomootStore()
// NEW:
const geocoding = useGeocodingStore()
```

Lines 19, 22, 40, 41, 69, 74 — rename `komoot` → `geocoding` (all occurrences of the local variable)

Lines 43, 53 — rename type `KomootLocation` → `GeocodingResult`

- [ ] **Step 2: Update LocationSelector.spec.ts mock path**

Lines 6-8 — change mock:
```typescript
// OLD:
vi.mock('@/features/komoot/stores/komootStore', () => ({
  useKomootStore: () => ({ search: vi.fn(), results: [], isLoading: false }),
}))
// NEW:
vi.mock('@/features/geocoding/stores/geocodingStore', () => ({
  useGeocodingStore: () => ({ search: vi.fn(), results: [], isLoading: false }),
}))
```

- [ ] **Step 3: Delete the old komoot directory**

```bash
rm -rf apps/frontend/src/features/komoot
```

- [ ] **Step 4: Run all affected tests**

Run: `pnpm --filter frontend exec vitest run`
Expected: all tests PASS (geocoding + LocationSelector)

- [ ] **Step 5: Run type-check**

Run: `pnpm type-check`
Expected: no errors

- [ ] **Step 6: Run lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 7: Format changed files**

```bash
pnpm exec prettier --write \
  apps/frontend/src/features/geocoding/types.ts \
  apps/frontend/src/features/geocoding/providers/photon.ts \
  apps/frontend/src/features/geocoding/providers/nominatim.ts \
  apps/frontend/src/features/geocoding/composables/useGeocoder.ts \
  apps/frontend/src/features/geocoding/stores/geocodingStore.ts \
  apps/frontend/src/features/geocoding/stores/__tests__/geocodingStore.spec.ts \
  apps/frontend/src/features/geocoding/__tests__/photon.spec.ts \
  apps/frontend/src/features/geocoding/__tests__/nominatim.spec.ts \
  apps/frontend/src/features/shared/profileform/LocationSelector.vue \
  apps/frontend/src/features/shared/profileform/__tests__/LocationSelector.spec.ts
```

- [ ] **Step 8: Commit**

```bash
git add -A apps/frontend/src/features/komoot apps/frontend/src/features/shared/profileform/LocationSelector.vue apps/frontend/src/features/shared/profileform/__tests__/LocationSelector.spec.ts
git commit -m "refactor(geocoding): migrate consumers from komoot to geocoding store, delete old code"
```

---

### Task 8: Add changeset

**Files:**
- Create: `.changeset/<random-name>.md`

- [ ] **Step 1: Create changeset file**

```bash
cat > .changeset/bright-rivers-flow.md << 'EOF'
---
'@opencupid/frontend': minor
---

Refactor geocoding: extract provider abstraction, add Nominatim support
EOF
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/bright-rivers-flow.md
git commit -m "chore: add changeset for geocoding provider abstraction"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all tests PASS

- [ ] **Step 2: Run type-check**

Run: `pnpm type-check`
Expected: no errors

- [ ] **Step 3: Run full CI suite**

Run: `pnpm run ci:test`
Expected: all checks PASS
