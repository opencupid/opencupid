# Geocoding Provider Abstraction

Replace the tightly-coupled Komoot Photon geocoding integration with a provider-agnostic architecture. Add Nominatim as a second provider. Switching providers requires changing one line in a composable — no call-site changes.

## Current State

The `features/komoot/` directory contains a Pinia store that directly calls the Photon API, maps the GeoJSON response, and exposes results to consumers. Problems:

- Vendor name (`Komoot`) baked into types, store, directory, and Pinia ID
- Custom GeoJSON types (`KomootFeature`, `KomootFeatureCollection`) duplicate `@types/geojson`
- HTTP call, response mapping, and state management are all in one file
- Switching to another geocoding API requires rewriting the store

### Files to Remove

- `features/komoot/stores/komootStore.ts`
- `features/komoot/stores/__tests__/komootStore.spec.ts`
- `features/komoot/` directory

### Consumers to Update (import path + type rename only)

- `features/shared/profileform/LocationSelector.vue` — imports `useKomootStore`, `KomootLocation`
- `features/shared/profileform/__tests__/LocationSelector.spec.ts` — mocks `useKomootStore`

## Design

### Layer 1 — Shared Types (`types.ts`)

```typescript
export interface GeocodingResult {
  name: string
  country: string // ISO 3166-1 alpha-2
  lat: number
  lon: number
}

export type GeocodingProvider = (
  query: string,
  lang: string,
) => Promise<GeocodingResult[]>
```

`GeocodingResult` replaces `KomootLocation` as the public type. `GeocodingProvider` is the function signature every provider implements.

### Layer 2 — Provider Implementations

Each provider is a module exporting a single `GeocodingProvider` function. Providers handle HTTP + response mapping only. They use `axios` from `@/lib/api`.

Both providers type their response as `FeatureCollection<Point, *Properties>` from the `geojson` package. Only provider-specific property interfaces are defined locally.

#### Photon (`providers/photon.ts`)

- Endpoint: `https://photon.komoot.io/api/`
- Local type: `PhotonProperties { name: string; countrycode: string }`
- Response typed as `FeatureCollection<Point, PhotonProperties>`
- Query params: `q`, `lang` (defaults to `'en'` — Photon only supports `en`/`de`), `limit=10`, `osm_tag` filters (`place:city`, `place:town`, `place:village`, `place:hamlet`), `layer` (`city`, `locality`)
- Mapping: `properties.name` → `name`, `properties.countrycode` → `country`, `geometry.coordinates[1]` → `lat`, `geometry.coordinates[0]` → `lon`

#### Nominatim (`providers/nominatim.ts`)

- Endpoint: `https://nominatim.openstreetmap.org/search`
- Local type: `NominatimProperties { name: string; address: { country_code: string } }`
- Response typed as `FeatureCollection<Point, NominatimProperties>`
- Query params: `q`, `format=geojson`, `addressdetails=1`, `limit=10`, `featureType=city`, `accept-language` (full locale support)
- Mapping: `properties.name` → `name`, `properties.address.country_code` → `country`, `geometry.coordinates[1]` → `lat`, `geometry.coordinates[0]` → `lon`

### Layer 3 — Composable (`composables/useGeocoder.ts`)

Single switching point. The store calls this composable instead of importing a provider directly.

```typescript
import { searchPhoton } from '../providers/photon'
// import { searchNominatim } from '../providers/nominatim'

export function useGeocoder() {
  const search = searchPhoton
  // To switch: const search = searchNominatim
  return { search }
}
```

Switching providers = changing one line in this file.

### Layer 4 — Pinia Store (`stores/geocodingStore.ts`)

- Pinia ID: `'geocoding'`
- Export: `useGeocodingStore`
- State: `results: GeocodingResult[]`, `isLoading: boolean`
- Action `search(query, lang)`: calls `useGeocoder().search(query, lang)`, maps result to `results`, manages `isLoading`
- No provider-specific code

### Consumer Changes

`LocationSelector.vue`:
- Import: `useKomootStore` → `useGeocodingStore`, `KomootLocation` → `GeocodingResult`
- Local variable: `komoot` → `geocoding` (or similar)
- No behavioral changes

`LocationSelector.spec.ts`:
- Mock path: `@/features/komoot/stores/komootStore` → `@/features/geocoding/stores/geocodingStore`
- Mock export: `useKomootStore` → `useGeocodingStore`

### CSP Configuration

Add Nominatim domain to `CSP_ALLOWED_DOMAINS` in `.env.example` and `.env.development.local`:
```
CSP_ALLOWED_DOMAINS="https://photon.komoot.io https://nominatim.openstreetmap.org https://api.maptiler.com"
```

## File Structure

```
features/geocoding/
  types.ts                          # GeocodingResult, GeocodingProvider
  composables/
    useGeocoder.ts                  # provider switch point
  providers/
    photon.ts                       # Photon implementation
    nominatim.ts                    # Nominatim implementation
  stores/
    geocodingStore.ts               # Pinia store (consumer-facing)
    __tests__/
      geocodingStore.spec.ts        # store tests (mocks useGeocoder)
  __tests__/
    photon.spec.ts                  # Photon provider unit tests
    nominatim.spec.ts               # Nominatim provider unit tests
```

## Testing Strategy

- **Provider tests** (`photon.spec.ts`, `nominatim.spec.ts`): mock `axios.get`, verify correct URL/params, verify response mapping to `GeocodingResult[]`, verify error handling returns `[]`
- **Store tests** (`geocodingStore.spec.ts`): mock `useGeocoder`, verify store manages `results`/`isLoading` correctly, verify empty query short-circuit
- **LocationSelector tests**: update mock paths, no behavioral changes

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Provider switching | Build-time, one-line change in composable | YAGNI — no need for env vars or runtime config |
| Store kept | Yes, Pinia store remains consumer-facing | Consumers depend on reactive `results`/`isLoading` |
| HTTP client | `axios` from `@/lib/api` | Consistent with codebase, gets shared config |
| GeoJSON types | `@types/geojson` (`FeatureCollection<Point, P>`) | Already a dependency, no custom duplicates |
| Response format | Both providers use GeoJSON | Uniform mapping logic, coordinates as numbers |
