import type L from 'leaflet'
import type { Marker as LMarker } from 'leaflet'

/**
 * Generic add/remove/update diffing layer.
 * Instantiated once for POI markers, once for cluster markers.
 * The structural diffing logic lives here exactly once.
 */
export class DiffableLayer<T extends { id: string | number }> {
  private layer: L.LayerGroup
  private markers = new Map<string | number, LMarker>()
  // Reverse index for O(1) marker → id lookup (e.g. on OMS click).
  private idsByMarker = new WeakMap<LMarker, string | number>()
  private items = new Map<string | number, T>()
  private fns: {
    create: (item: T) => LMarker
    // shouldUpdate/apply are optional. Layers whose data is treated as
    // immutable per id (e.g. POIs in this app) omit them; the known-id
    // path then becomes a pure no-op. Layers whose data legitimately
    // changes between batches (e.g. clusters) supply both.
    shouldUpdate?: (prev: T, next: T) => boolean
    apply?: (marker: LMarker, item: T) => void
  }

  constructor(
    layer: L.LayerGroup,
    fns: {
      create: (item: T) => LMarker
      shouldUpdate?: (prev: T, next: T) => boolean
      apply?: (marker: LMarker, item: T) => void
    }
  ) {
    this.layer = layer
    this.fns = fns
  }

  update(incoming: T[]): { added: LMarker[]; removed: LMarker[] } {
    const incomingMap = new Map<string | number, T>()
    for (const item of incoming) incomingMap.set(item.id, item)

    const toRemove: LMarker[] = []
    for (const [id, marker] of this.markers) {
      if (!incomingMap.has(id)) {
        toRemove.push(marker)
        this.idsByMarker.delete(marker)
        this.markers.delete(id)
        this.items.delete(id)
      }
    }

    const toAdd: LMarker[] = []
    for (const [id, item] of incomingMap) {
      const prev = this.items.get(id)
      if (!prev) {
        const marker = this.fns.create(item)
        this.markers.set(id, marker)
        this.idsByMarker.set(marker, id)
        this.items.set(id, item)
        toAdd.push(marker)
      } else {
        this.items.set(id, item)
        if (this.fns.shouldUpdate?.(prev, item)) {
          this.fns.apply?.(this.markers.get(id)!, item)
        }
      }
    }

    for (const m of toRemove) this.layer.removeLayer(m)
    for (const m of toAdd) this.layer.addLayer(m)

    return { added: toAdd, removed: toRemove }
  }

  clear(): void {
    this.layer.clearLayers()
    // WeakMap entries die with their marker keys.
    this.idsByMarker = new WeakMap()
    this.markers.clear()
    this.items.clear()
  }

  get(id: string | number): LMarker | undefined {
    return this.markers.get(id)
  }

  /** O(1) reverse lookup — undefined if the marker isn't part of this layer. */
  getId(marker: LMarker): string | number | undefined {
    return this.idsByMarker.get(marker)
  }

  values(): IterableIterator<LMarker> {
    return this.markers.values()
  }

  size(): number {
    return this.markers.size
  }

  allItems(): T[] {
    return [...this.items.values()]
  }
}
