import { searchPhoton } from '../providers/photon'
// import { searchNominatim } from '../providers/nominatim'

export function useGeocoder() {
  const search = searchPhoton
  // To switch provider: const search = searchNominatim
  return { search }
}
