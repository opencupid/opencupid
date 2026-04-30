import { CanceledError } from 'axios'
import { type Ref } from 'vue'
import { z } from 'zod'
import { api, safeApiCall } from '@/lib/api'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'
import type { MapBounds } from '@/features/map/types/map.types'

export interface UserContentEndpoints {
  /** GET / list endpoint, relative to basePath. Default: '' (i.e. basePath itself). */
  list?: string
  /** GET /me — owner-scoped list, relative to basePath. */
  mine: string
  /** GET /nearby. Optional. */
  nearby?: string
  /** GET /recent. Optional. */
  recent?: string
  /** GET /bounds. Optional. */
  bounds?: string
}

export interface UserContentActionsConfig<
  TPublic,
  TOwner,
  TSummary,
  TDetail,
  TSingular extends string = string,
  TPlural extends string = string,
> {
  /** Resource base path, e.g. '/posts'. */
  basePath: string
  /**
   * Wire response keys per content type. The literal types of `singular` and
   * `plural` propagate into action return types so a Post store yields
   * `{ post: ... }` and an Event store yields `{ event: ... }`.
   */
  wire: {
    /** Singular response key, e.g. 'post'. Used in `{success, [singular]: ...}`. */
    singular: TSingular
    /** Plural response key, e.g. 'posts'. Used in `{success, [plural]: [...]}`. */
    plural: TPlural
  }
  publicSchema: z.ZodType<TPublic, z.ZodTypeDef, unknown>
  ownerSchema: z.ZodType<TOwner, z.ZodTypeDef, unknown>
  summarySchema: z.ZodType<TSummary, z.ZodTypeDef, unknown>
  detailSchema: z.ZodType<TDetail, z.ZodTypeDef, unknown>
  endpoints: UserContentEndpoints
  /** Resource label for error messages, e.g. 'post' / 'event'. */
  resourceLabel: string
}

export interface UserContentActionsState<TPublic, TOwner, TSummary> {
  items: Ref<TPublic[]>
  myItems: Ref<TOwner[]>
  summaries: Ref<TSummary[]>
  currentItem: Ref<TPublic | TOwner | null>
}

interface PaginatedQueryLike {
  offset?: number
}

const joinPath = (base: string, rel: string) =>
  rel.startsWith('/') ? `${base}${rel}` : rel ? `${base}/${rel}` : base

export function useUserContentActions<
  TPublic extends { id: string; isOwn?: boolean },
  TOwner extends { id: string; isVisible: boolean },
  TSummary,
  TDetail,
  TSingular extends string,
  TPlural extends string,
>(
  state: UserContentActionsState<TPublic, TOwner, TSummary>,
  config: UserContentActionsConfig<TPublic, TOwner, TSummary, TDetail, TSingular, TPlural>
) {
  const publicArraySchema = config.publicSchema.array()
  const ownerArraySchema = config.ownerSchema.array()
  const summaryArraySchema = config.summarySchema.array()
  let publicSingleAbort: AbortController | null = null

  const errFor = (verb: string) => `Failed to ${verb} ${config.resourceLabel}`
  const singular = config.wire.singular
  const plural = config.wire.plural

  const extractItem = (data: unknown): unknown => (data as Record<string, unknown>)[singular]
  const extractList = (data: unknown): unknown => (data as Record<string, unknown>)[plural]

  const wrapItem = <V>(value: V) => ({ [singular]: value }) as Record<TSingular, V>
  const wrapList = <V>(value: V) => ({ [plural]: value }) as Record<TPlural, V>

  // --- writes ---

  async function create<TCreatePayload>(
    payload: TCreatePayload
  ): Promise<StoreResponse<Record<TSingular, TOwner>>> {
    try {
      const res = await safeApiCall(() => api.post(config.basePath, payload))
      const item = config.ownerSchema.parse(extractItem(res.data))
      state.myItems.value.unshift(item)
      return storeSuccess(wrapItem(item))
    } catch (error: any) {
      return storeError(error, errFor('create'))
    }
  }

  async function update<TUpdatePayload>(
    id: string,
    payload: TUpdatePayload
  ): Promise<StoreResponse<Record<TSingular, TOwner>>> {
    try {
      const res = await safeApiCall(() => api.patch(`${config.basePath}/${id}`, payload))
      const item = config.ownerSchema.parse(extractItem(res.data))
      syncOwnerIntoState(id, item)
      return storeSuccess(wrapItem(item))
    } catch (error: any) {
      return storeError(error, errFor('update'))
    }
  }

  async function deleteItem(id: string): Promise<StoreResponse<void>> {
    try {
      await safeApiCall(() => api.delete(`${config.basePath}/${id}`))
      state.myItems.value = state.myItems.value.filter((p) => p.id !== id) as TOwner[]
      state.items.value = state.items.value.filter((p) => p.id !== id) as TPublic[]
      if (state.currentItem.value?.id === id) state.currentItem.value = null
      return storeSuccess()
    } catch (error: any) {
      return storeError(error, errFor('delete'))
    }
  }

  async function setVisibility(
    id: string,
    isVisible: boolean
  ): Promise<StoreResponse<Record<TSingular, TOwner>>> {
    try {
      const res = await safeApiCall(() => api.patch(`${config.basePath}/${id}`, { isVisible }))
      const item = config.ownerSchema.parse(extractItem(res.data))
      syncOwnerIntoState(id, item)

      if (item.isVisible) {
        upsertItem(item)
      } else {
        state.items.value = state.items.value.filter((p) => p.id !== id) as TPublic[]
      }

      return storeSuccess(wrapItem(item))
    } catch (error: any) {
      return storeError(error, `Failed to update ${config.resourceLabel} visibility`)
    }
  }

  const hide = (id: string) => setVisibility(id, false)
  const show = (id: string) => setVisibility(id, true)

  // --- list reads ---

  async function fetchList<Q extends PaginatedQueryLike>(
    query: Q = {} as Q
  ): Promise<StoreResponse<Record<TPlural, TPublic[]>>> {
    return fetchListInto(
      state.items,
      publicArraySchema,
      config.endpoints.list ?? '',
      query,
      errFor('fetch')
    )
  }

  async function fetchMine<Q extends PaginatedQueryLike>(
    query: Q = {} as Q
  ): Promise<StoreResponse<Record<TPlural, TOwner[]>>> {
    return fetchListInto(
      state.myItems,
      ownerArraySchema,
      config.endpoints.mine,
      query,
      errFor('fetch')
    )
  }

  async function fetchNearby<Q extends PaginatedQueryLike>(
    query: Q
  ): Promise<StoreResponse<Record<TPlural, TPublic[]>>> {
    if (!config.endpoints.nearby) {
      return storeError(
        new Error('not supported'),
        `Failed to fetch nearby ${config.resourceLabel}`
      )
    }
    return fetchListInto(
      state.items,
      publicArraySchema,
      config.endpoints.nearby,
      query,
      errFor('fetch nearby')
    )
  }

  async function fetchRecent<Q extends PaginatedQueryLike>(
    query: Q = {} as Q
  ): Promise<StoreResponse<Record<TPlural, TPublic[]>>> {
    if (!config.endpoints.recent) {
      return storeError(
        new Error('not supported'),
        `Failed to fetch recent ${config.resourceLabel}`
      )
    }
    return fetchListInto(
      state.items,
      publicArraySchema,
      config.endpoints.recent,
      query,
      errFor('fetch recent')
    )
  }

  async function fetchInBounds(
    bounds: MapBounds
  ): Promise<StoreResponse<Record<TPlural, TSummary[]>>> {
    if (!config.endpoints.bounds) {
      return storeError(
        new Error('not supported'),
        `Failed to fetch ${config.resourceLabel} in bounds`
      )
    }
    try {
      const res = await safeApiCall(() =>
        api.get(joinPath(config.basePath, config.endpoints.bounds!), { params: bounds })
      )
      const items = summaryArraySchema.parse(extractList(res.data))
      state.summaries.value = items
      return storeSuccess(wrapList(items))
    } catch (error: any) {
      return storeError(error, `Failed to fetch ${config.resourceLabel} in bounds`)
    }
  }

  // --- single reads ---

  async function fetchOwner(id: string): Promise<StoreResponse<Record<TSingular, TOwner>>> {
    try {
      const res = await safeApiCall(() => api.get(`${config.basePath}/${id}`))
      const item = config.ownerSchema.parse(extractItem(res.data))
      state.currentItem.value = item
      return storeSuccess(wrapItem(item))
    } catch (error: any) {
      return storeError(error, errFor('fetch'))
    }
  }

  async function fetchPublic(id: string): Promise<StoreResponse<Record<TSingular, TDetail>>> {
    publicSingleAbort?.abort()
    const ctl = new AbortController()
    publicSingleAbort = ctl
    try {
      const res = await safeApiCall(() =>
        api.get(`${config.basePath}/${id}`, { signal: ctl.signal })
      )
      const item = config.detailSchema.parse(extractItem(res.data))
      return storeSuccess(wrapItem(item))
    } catch (error: any) {
      if (error instanceof CanceledError) return storeSuccess()
      return storeError(error, errFor('fetch'))
    }
  }

  // --- state helpers ---

  /**
   * Upserts an item into the public list and (when the input is owner-shaped)
   * also into the owner list. Owner-shape detection uses the discriminating
   * `isVisible` property; only owner-shaped inputs get `isOwn: true` forced
   * onto the public list copy. Public-shaped inputs preserve their existing
   * `isOwn` value (or absence thereof).
   */
  function upsertItem(item: TPublic | TOwner): void {
    const isOwnerShape = 'isVisible' in item
    if (isOwnerShape) {
      const i = state.myItems.value.findIndex((p) => p.id === item.id)
      if (i === -1) state.myItems.value.unshift(item as TOwner)
      else state.myItems.value[i] = item as TOwner
    }
    const j = state.items.value.findIndex((p) => p.id === item.id)
    const asPublic = (isOwnerShape ? { ...(item as object), isOwn: true } : item) as TPublic
    if (j === -1) state.items.value.unshift(asPublic)
    else state.items.value[j] = asPublic
  }

  function clearItems(): void {
    state.items.value = []
  }

  function clearMyItems(): void {
    state.myItems.value = []
  }

  function setCurrentItem(item: TPublic | TOwner | null): void {
    state.currentItem.value = item
  }

  // --- internals ---

  function syncOwnerIntoState(id: string, item: TOwner): void {
    const i = state.myItems.value.findIndex((p) => p.id === id)
    if (i !== -1) state.myItems.value[i] = item
    if (state.currentItem.value?.id === id) state.currentItem.value = item
  }

  async function fetchListInto<T, Q extends PaginatedQueryLike>(
    target: Ref<T[]>,
    arraySchema: z.ZodType<T[], z.ZodTypeDef, unknown>,
    relPath: string,
    query: Q,
    errMsg: string
  ): Promise<StoreResponse<Record<TPlural, T[]>>> {
    try {
      const res = await safeApiCall(() =>
        api.get(joinPath(config.basePath, relPath), { params: query })
      )
      const items = arraySchema.parse(extractList(res.data))
      if (query.offset === 0 || query.offset === undefined) target.value = items
      else target.value.push(...items)
      return storeSuccess(wrapList(items))
    } catch (error: any) {
      return storeError(error, errMsg)
    }
  }

  return {
    create,
    update,
    deleteItem,
    setVisibility,
    hide,
    show,
    fetchList,
    fetchMine,
    fetchNearby,
    fetchRecent,
    fetchInBounds,
    fetchOwner,
    fetchPublic,
    upsertItem,
    clearItems,
    clearMyItems,
    setCurrentItem,
  }
}
