import type L from 'leaflet'
import type { Marker as LMarker } from 'leaflet'

/**
 * Diffable-layer constructor config. shouldUpdate and apply are paired:
 * a layer either supplies both (mutable items, e.g. clusters with changing
 * count/centroid) or neither (immutable per id, e.g. POIs in this app).
 * The discriminated union prevents the silent-skip case where one is
 * provided without the other — the runtime would no-op via optional
 * chaining, which is correct but invisible at the call site.
 */
export type DiffableLayerFns<T> = { create: (item: T) => LMarker } & (
  | {
      shouldUpdate: (prev: T, next: T) => boolean
      apply: (marker: LMarker, item: T) => void
    }
  | { shouldUpdate?: never; apply?: never }
)

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
  private fns: DiffableLayerFns<T>

  constructor(layer: L.LayerGroup, fns: DiffableLayerFns<T>) {
    this.layer = layer
    this.fns = fns
  }

  /**
   * Reconcile the layer against `incoming`: create markers for new ids,
   * remove markers for ids that have left, and (when fns supplies them)
   * call `apply` for ids whose item changed per `shouldUpdate`. Returns
   * the marker objects added and removed in this batch so the caller
   * can register them with downstream consumers (e.g. OMS).
   */
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

  /** Remove all markers from the underlying Leaflet layer and reset internal state. */
  clear(): void {
    this.layer.clearLayers()
    // WeakMap entries die with their marker keys.
    this.idsByMarker = new WeakMap()
    this.markers.clear()
    this.items.clear()
  }

  /** Look up a marker by item id; undefined if no marker exists for that id. */
  get(id: string | number): LMarker | undefined {
    return this.markers.get(id)
  }

  /** O(1) reverse lookup — undefined if the marker isn't part of this layer. */
  getId(marker: LMarker): string | number | undefined {
    return this.idsByMarker.get(marker)
  }

  /** Iterate every marker currently in the layer (insertion order). */
  values(): IterableIterator<LMarker> {
    return this.markers.values()
  }

  /** Number of markers currently in the layer. */
  size(): number {
    return this.markers.size
  }

  /** Snapshot of every item currently tracked, in insertion order. */
  allItems(): T[] {
    return [...this.items.values()]
  }
}
