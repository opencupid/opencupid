<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatTimeAgoIntl, useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { useApi, apiRequest } from '../composables/useApi'
import {
  flagProfile,
  clearTrustFlag,
  flagOrigin,
  flagOriginBadgeClass,
} from '../composables/useTrustFlags'
import { appLocales } from '@shared/i18n/locales'
import PublicProfileLink from '../components/PublicProfileLink.vue'
import KpiCard from '../components/KpiCard.vue'
import ProfileImageReview, { type AdminProfileImage } from '../components/ProfileImageReview.vue'
import { vModalFocus } from '../directives/modalFocus'

interface AdminProfile {
  id: string
  publicName: string
  country: string
  cityName: string
  isSocialActive: boolean
  isDatingActive: boolean
  isActive: boolean
  isReported: boolean
  isOnboarded: boolean
  gender: string | null
  hasFace: boolean
  createdAt: string
  userId: string
  user: { email: string; phonenumber: string | null } | null
  activitySummary: { segment: string; lastSeenAt: string } | null
  hasActiveTrustFlag: boolean
}

interface AdminProfileTrustFlag {
  id: string
  reason: 'PROFILE_UNVETTED' | 'SPAM_BURST'
  flaggedAt: string
  flaggedBy: string
  evidence: string
}

interface AdminProfileDetail extends AdminProfile {
  trustFlags: AdminProfileTrustFlag[]
  profileImages: AdminProfileImage[]
}

interface AdminUserDetail {
  id: string
  email: string
  isActive: boolean
  isBlocked: boolean
  newsletterOptIn: boolean
  emailNotificationsOptIn: boolean
  isPushNotificationEnabled: boolean
  pushSubscriptionCount: number
  createdAt: string
  lastSeenAt: string | null
  language: string
  originDomain: string
}

interface AdminUserRow {
  id: string
  email: string
  phonenumber: string | null
  isActive: boolean
  isBlocked: boolean
  isRegistrationConfirmed: boolean
  newsletterOptIn: boolean
  createdAt: string
  originDomain: string
}

interface ProfilesResponse {
  success: boolean
  profiles: AdminProfile[]
  total: number
  page: number
  pageSize: number
}

interface UsersResponse {
  success: boolean
  users: AdminUserRow[]
  total: number
  page: number
  pageSize: number
}

const route = useRoute()
const router = useRouter()
const { call, loading, error } = useApi()
const pageTab = ref<'profiles' | 'users'>('profiles')
const profiles = ref<AdminProfile[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const search = ref('')
const selectedProfile = ref<AdminProfile | null>(null)
const countries = ref<string[]>([])
const selectedCountry = ref('')
const allSegments = ['new', 'returning', 'frequent', 'dormant'] as const
const selectedSegments = ref<string[]>([])
const segmentDropdownOpen = ref(false)

// Multi-selection + bulk message modal state
const selectedProfiles = ref<Map<string, AdminProfile>>(new Map())
const selectedProfileIds = computed(() => new Set(selectedProfiles.value.keys()))
const showSendMessageModal = ref(false)
const messageContent = ref('')
const sending = ref(false)
const sendError = ref<string | null>(null)
const sendResult = ref<{ sent: number; failed: number } | null>(null)

type ProfileSort = 'created' | 'lastActive'
const sortOptions: { value: ProfileSort; label: string }[] = [
  { value: 'created', label: 'Date created' },
  { value: 'lastActive', label: 'Last active' },
]
// Kept in the URL (?sort=) so the choice survives a reload; 'created' is the
// default and is left out of the URL.
const selectedSort = computed<ProfileSort>({
  get: () => (route.query.sort === 'lastActive' ? 'lastActive' : 'created'),
  set: (sort) => {
    router.replace({ query: { ...route.query, sort: sort === 'created' ? undefined : sort } })
  },
})

function formatRelative(date: string) {
  return formatTimeAgoIntl(new Date(date), { locale: 'en' })
}

async function fetchCountries() {
  const res = await call<{ success: boolean; countries: string[] }>('/admin/profiles/countries')
  if (res) countries.value = res.countries
}

const hasMore = computed(() => profiles.value.length < total.value)
const loadingMore = ref(false)

function buildParams(p = page.value) {
  return {
    page: p,
    pageSize,
    search: search.value || undefined,
    country: selectedCountry.value || undefined,
    segments: selectedSegments.value.length > 0 ? selectedSegments.value.join(',') : undefined,
    sort: selectedSort.value,
  }
}

async function fetchProfiles() {
  listGeneration++
  const res = await call<ProfilesResponse>('/admin/profiles', { params: buildParams() })
  if (res) {
    profiles.value = res.profiles
    total.value = res.total
  }
}

async function appendProfiles() {
  loadingMore.value = true
  try {
    const res = await apiRequest<ProfilesResponse>('/admin/profiles', { params: buildParams() })
    profiles.value = [...profiles.value, ...res.profiles]
    total.value = res.total
  } finally {
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  listGeneration++
  page.value++
  await appendProfiles()
}

// "Not onboarded" tab: users that have no profile yet
const users = ref<AdminUserRow[]>([])
const usersTotal = ref(0)
const usersPage = ref(1)
const usersLoading = ref(false)
const usersError = ref<string | null>(null)
const usersLoadingMore = ref(false)
const usersHasMore = computed(() => users.value.length < usersTotal.value)

function buildUsersParams(p = usersPage.value) {
  return {
    page: p,
    pageSize,
    search: search.value || undefined,
    hasProfile: 'false',
  }
}

async function fetchUsers() {
  listGeneration++
  usersLoading.value = true
  usersError.value = null
  try {
    const res = await apiRequest<UsersResponse>('/admin/users', { params: buildUsersParams() })
    users.value = res.users
    usersTotal.value = res.total
  } catch (err) {
    usersError.value = err instanceof Error ? err.message : 'failed to load users'
  } finally {
    usersLoading.value = false
  }
}

async function loadMoreUsers() {
  if (usersLoadingMore.value || usersLoading.value || !usersHasMore.value) return
  listGeneration++
  usersPage.value++
  usersLoadingMore.value = true
  try {
    const res = await apiRequest<UsersResponse>('/admin/users', { params: buildUsersParams() })
    users.value = [...users.value, ...res.users]
    usersTotal.value = res.total
  } finally {
    usersLoadingMore.value = false
  }
}

// Background refresh: re-fetch every page loaded so far (keeping the
// infinite-scroll position) without the "Loading..." placeholder. Any
// foreground fetch bumps listGeneration, so a refresh that resolves after one
// started is dropped instead of overwriting newer data.
let listGeneration = 0

async function refreshList() {
  const generation = listGeneration
  if (pageTab.value === 'profiles') {
    if (loading.value || loadingMore.value) return
    try {
      const pages = await Promise.all(
        Array.from({ length: page.value }, (_, i) =>
          apiRequest<ProfilesResponse>('/admin/profiles', { params: buildParams(i + 1) })
        )
      )
      const last = pages[pages.length - 1]
      if (!last || generation !== listGeneration) return
      profiles.value = pages.flatMap((r) => r.profiles)
      total.value = last.total
      error.value = null
    } catch (err) {
      if (generation === listGeneration) {
        error.value = err instanceof Error ? err.message : 'failed to refresh profiles'
      }
    }
  } else {
    if (usersLoading.value || usersLoadingMore.value) return
    try {
      const pages = await Promise.all(
        Array.from({ length: usersPage.value }, (_, i) =>
          apiRequest<UsersResponse>('/admin/users', { params: buildUsersParams(i + 1) })
        )
      )
      const last = pages[pages.length - 1]
      if (!last || generation !== listGeneration) return
      users.value = pages.flatMap((r) => r.users)
      usersTotal.value = last.total
      usersError.value = null
    } catch (err) {
      if (generation === listGeneration) {
        usersError.value = err instanceof Error ? err.message : 'failed to refresh users'
      }
    }
  }
}

const REFRESH_INTERVAL_MS = 10_000
const visibility = useDocumentVisibility()
const refreshTimer = useIntervalFn(refreshList, REFRESH_INTERVAL_MS, { immediate: false })

// Poll only while the browser tab is visible; refresh right away when it
// becomes visible again.
watch(visibility, (state) => {
  if (state === 'visible') {
    refreshList()
    refreshTimer.resume()
  } else {
    refreshTimer.pause()
  }
})

function switchTab(tab: 'profiles' | 'users') {
  if (pageTab.value === tab) return
  pageTab.value = tab
  resetAndFetch()
}

const segmentColors: Record<string, string> = {
  new: 'bg-primary',
  returning: 'bg-success',
  frequent: 'bg-info',
  dormant: 'bg-secondary',
}

function segmentBadgeClass(segment: string) {
  return `badge ${segmentColors[segment] ?? 'bg-secondary'}`
}

const selectedProfileDetail = ref<AdminProfileDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const detailTab = ref<'profile' | 'activity' | 'user'>('profile')

interface AdminProfileActivity {
  conversations: { participating: number; initiated: number }
  messages: { sent: number; received: number }
  likes: { sent: number; received: number }
  matches: number
  daily: {
    conversations: { date: string; initiated: number; joined: number }[]
    messages: { date: string; sent: number; received: number }[]
    likes: { date: string; sent: number; received: number }[]
    matches: { date: string; count: number }[]
  }
}

const profileActivity = ref<AdminProfileActivity | null>(null)
const activityLoading = ref(false)
const activityError = ref<string | null>(null)
let activityFetchToken = 0

function resetProfileActivity() {
  activityFetchToken++ // invalidate any in-flight fetch
  profileActivity.value = null
  activityError.value = null
  activityLoading.value = false
}

async function fetchProfileActivity(profileId: string) {
  const token = ++activityFetchToken
  activityLoading.value = true
  activityError.value = null
  try {
    const res = await apiRequest<{ success: true; activity: AdminProfileActivity }>(
      `/admin/profiles/${profileId}/activity`
    )
    if (token === activityFetchToken) profileActivity.value = res.activity
  } catch (err) {
    if (token === activityFetchToken) {
      activityError.value = err instanceof Error ? err.message : 'failed to load activity'
    }
  } finally {
    if (token === activityFetchToken) activityLoading.value = false
  }
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

// 7-day tiles: the week's total, its split, and a daily sparkline stacked by
// the same split (solid = first part).
const activityCards = computed(() => {
  const a = profileActivity.value
  if (!a) return []
  const { conversations, messages, likes, matches } = a.daily
  const stack = <T,>(rows: T[], parts: { label: string; pick: (r: T) => number }[]) =>
    parts.map(({ label, pick }) => ({ label, values: rows.map(pick) }))
  const conv = stack(conversations, [
    { label: 'initiated', pick: (d) => d.initiated },
    { label: 'joined', pick: (d) => d.joined },
  ])
  const msg = stack(messages, [
    { label: 'sent', pick: (d) => d.sent },
    { label: 'received', pick: (d) => d.received },
  ])
  const lik = stack(likes, [
    { label: 'sent', pick: (d) => d.sent },
    { label: 'received', pick: (d) => d.received },
  ])
  const splitSubtitle = (stacks: { label: string; values: number[] }[]) =>
    stacks.map((s) => `${sum(s.values)} ${s.label}`).join(' · ')
  const total = (stacks: { values: number[] }[]) => sum(stacks.map((s) => sum(s.values)))
  const matchSeries = matches.map((d) => d.count)
  return [
    {
      key: 'conversations',
      title: 'Conversations',
      value: total(conv),
      subtitle: splitSubtitle(conv),
      color: '#198754',
      seriesLabels: conversations.map((d) => d.date),
      stacks: conv,
    },
    {
      key: 'messages',
      title: 'Messages',
      value: total(msg),
      subtitle: splitSubtitle(msg),
      color: '#fd7e14',
      seriesLabels: messages.map((d) => d.date),
      stacks: msg,
    },
    {
      key: 'likes',
      title: 'Likes',
      value: total(lik),
      subtitle: splitSubtitle(lik),
      color: '#6f42c1',
      seriesLabels: likes.map((d) => d.date),
      stacks: lik,
    },
    {
      key: 'matches',
      title: 'Matches',
      value: sum(matchSeries),
      subtitle: 'mutual likes',
      color: '#d63384',
      seriesLabels: matches.map((d) => d.date),
      series: matchSeries,
    },
  ]
})

// All-time figures, shown as plain KPIs below the 7-day tiles.
const activityTotals = computed(() => {
  const a = profileActivity.value
  if (!a) return []
  const joined = a.conversations.participating - a.conversations.initiated
  return [
    {
      title: 'Conversations',
      value: a.conversations.participating,
      subtitle: `${a.conversations.initiated} initiated · ${joined} joined`,
    },
    {
      title: 'Messages',
      value: a.messages.sent + a.messages.received,
      subtitle: `${a.messages.sent} sent · ${a.messages.received} received`,
    },
    {
      title: 'Likes',
      value: a.likes.sent + a.likes.received,
      subtitle: `${a.likes.sent} sent · ${a.likes.received} received`,
    },
    { title: 'Matches', value: a.matches, subtitle: 'mutual likes' },
  ]
})

// Keep the list row's face icon in sync with an edit made in the detail modal.
function onDetailHasFaceChange(hasFace: boolean) {
  const row = profiles.value.find((p) => p.id === selectedProfileDetail.value?.id)
  if (row) row.hasFace = hasFace
}

const userDetail = ref<AdminUserDetail | null>(null)

const userOptIns = computed(() => {
  const u = userDetail.value
  if (!u) return []
  const devices = u.pushSubscriptionCount
  return [
    { label: 'Newsletter', value: u.newsletterOptIn },
    { label: 'Email notifications', value: u.emailNotificationsOptIn },
    {
      label: 'Push notifications',
      value: u.isPushNotificationEnabled,
      note: `${devices} subscribed device${devices === 1 ? '' : 's'}`,
    },
  ]
})
const userLoading = ref(false)
const userError = ref<string | null>(null)
const editUserActive = ref(false)
const editUserLanguage = ref('')
const editUserOrigin = ref('')
const userSaving = ref(false)
const userBlocking = ref(false)
const userSaveError = ref<string | null>(null)

const languageOptions = Object.entries(appLocales).map(([code, label]) => ({ code, label }))
const originOptions = ref<string[]>([])

async function fetchOrigins() {
  const res = await call<{ success: boolean; origins: string[] }>('/admin/users/origins')
  if (res) originOptions.value = res.origins
}

// The dropdown only ever offers values the API returned, but a user's
// current origin might not be among them yet (e.g. fetchOrigins hasn't
// resolved, or the value was just saved) — keep it selectable regardless.
function ensureOriginOption(origin: string) {
  if (origin && !originOptions.value.includes(origin)) {
    originOptions.value = [...originOptions.value, origin].sort()
  }
}

// Guards against a stale response overwriting state (and the User tab
// PATCHing the wrong account) when another profile is opened mid-flight.
let userFetchToken = 0

function resetUserDetail() {
  userFetchToken++ // invalidate any in-flight fetch
  userDetail.value = null
  userError.value = null
  userSaveError.value = null
  userLoading.value = false
}

async function fetchUserDetail(userId: string) {
  const token = ++userFetchToken
  userDetail.value = null
  userError.value = null
  userSaveError.value = null
  userLoading.value = true
  try {
    const res = await apiRequest<{ success: boolean; user: AdminUserDetail }>(
      `/admin/users/${userId}`
    )
    if (token !== userFetchToken) return
    userDetail.value = res.user
    editUserActive.value = res.user.isActive
    editUserLanguage.value = res.user.language
    editUserOrigin.value = res.user.originDomain
    ensureOriginOption(res.user.originDomain)
  } catch (err) {
    if (token !== userFetchToken) return
    userError.value = err instanceof Error ? err.message : 'failed to load user'
  } finally {
    if (token === userFetchToken) userLoading.value = false
  }
}

async function saveUser() {
  if (!userDetail.value) return
  const originDomain = editUserOrigin.value.trim()
  userSaving.value = true
  userSaveError.value = null
  try {
    await apiRequest(`/admin/users/${userDetail.value.id}`, {
      method: 'PATCH',
      body: {
        isActive: editUserActive.value,
        language: editUserLanguage.value,
        originDomain,
      },
    })
    userDetail.value = {
      ...userDetail.value,
      isActive: editUserActive.value,
      language: editUserLanguage.value,
      originDomain,
    }
    const idx = users.value.findIndex((u) => u.id === userDetail.value?.id)
    const row = idx >= 0 ? users.value[idx] : undefined
    if (row) {
      users.value[idx] = {
        ...row,
        isActive: editUserActive.value,
        originDomain,
      }
    }
    ensureOriginOption(originDomain)
  } catch (err) {
    userSaveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    userSaving.value = false
  }
}

// Applied immediately, separately from Save. Blocking also logs the user out
// everywhere (the backend bumps tokenVersion and deletes their sessions).
async function toggleUserBlocked() {
  if (!userDetail.value) return
  const id = userDetail.value.id
  const isBlocked = !userDetail.value.isBlocked
  userBlocking.value = true
  userSaveError.value = null
  try {
    await apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: { isBlocked } })
    if (userDetail.value?.id === id) userDetail.value = { ...userDetail.value, isBlocked }
    const idx = users.value.findIndex((u) => u.id === id)
    const row = idx >= 0 ? users.value[idx] : undefined
    if (row) users.value[idx] = { ...row, isBlocked }
  } catch (err) {
    userSaveError.value = err instanceof Error ? err.message : 'Failed to update block status'
  } finally {
    userBlocking.value = false
  }
}

// User-only detail modal, opened from the "Not onboarded" tab where no
// profile exists.
const userModalOpen = ref(false)

function viewUser(user: AdminUserRow) {
  userModalOpen.value = true
  detailTab.value = 'user'
  fetchUserDetail(user.id)
}

function closeDetail() {
  selectedProfile.value = null
  userModalOpen.value = false
}

// The User and Activity tabs' data is fetched lazily on first switch, not on row click.
watch(detailTab, (tab) => {
  if (tab === 'user' && selectedProfile.value && !userDetail.value && !userLoading.value) {
    fetchUserDetail(selectedProfile.value.userId)
  }
  if (
    tab === 'activity' &&
    selectedProfile.value &&
    !profileActivity.value &&
    !activityLoading.value
  ) {
    fetchProfileActivity(selectedProfile.value.id)
  }
})

async function viewProfile(profile: AdminProfile) {
  selectedProfile.value = profile
  selectedProfileDetail.value = null
  detailError.value = null
  detailTab.value = 'profile'
  resetUserDetail()
  resetProfileActivity()
  detailLoading.value = true
  try {
    const res = await apiRequest<{ success: true; profile: AdminProfileDetail }>(
      `/admin/profiles/${profile.id}`
    )
    selectedProfileDetail.value = res.profile
  } catch (err) {
    detailError.value = err instanceof Error ? err.message : 'failed to load profile'
  } finally {
    detailLoading.value = false
  }
}

async function viewProfileById(id: string) {
  const inList = profiles.value.find((p) => p.id === id)
  if (inList) return viewProfile(inList)

  detailLoading.value = true
  detailError.value = null
  detailTab.value = 'profile'
  resetUserDetail()
  resetProfileActivity()
  try {
    const res = await apiRequest<{ success: true; profile: AdminProfileDetail }>(
      `/admin/profiles/${id}`
    )
    selectedProfile.value = res.profile
    selectedProfileDetail.value = res.profile
  } catch (err) {
    detailError.value = err instanceof Error ? err.message : 'failed to load profile'
  } finally {
    detailLoading.value = false
  }
}

const activeFlags = computed(() => selectedProfileDetail.value?.trustFlags ?? [])
// System and heuristic flags clear themselves; an admin flag is the only hold
// automation never lifts, so it can be added whatever else is active.
const hasAdminFlag = computed(() =>
  activeFlags.value.some((f) => flagOrigin(f.flaggedBy) === 'admin')
)

// Admin flag flow (write an admin:manual flag with a note)
const quarantineOpen = ref(false)
const quarantineNote = ref('')
const quarantineSubmitting = ref(false)
const quarantineError = ref<string | null>(null)

function openQuarantineForm() {
  quarantineOpen.value = true
  quarantineNote.value = ''
  quarantineError.value = null
}

function cancelQuarantine() {
  quarantineOpen.value = false
}

async function submitQuarantine() {
  if (!selectedProfile.value || quarantineNote.value.trim().length === 0) return
  quarantineSubmitting.value = true
  quarantineError.value = null
  try {
    const current = selectedProfile.value
    const res = await flagProfile(current.id, quarantineNote.value.trim())
    selectedProfile.value = { ...current, hasActiveTrustFlag: true }
    const idx = profiles.value.findIndex((p) => p.id === current.id)
    const row = idx >= 0 ? profiles.value[idx] : undefined
    if (row) {
      profiles.value[idx] = { ...row, hasActiveTrustFlag: true }
    }
    if (selectedProfileDetail.value) {
      selectedProfileDetail.value = {
        ...selectedProfileDetail.value,
        hasActiveTrustFlag: true,
        // The endpoint returns the existing admin flag when one is already active.
        trustFlags: [
          ...selectedProfileDetail.value.trustFlags.filter((f) => f.id !== res.flag.id),
          res.flag,
        ],
      }
    }
    quarantineOpen.value = false
  } catch (err) {
    quarantineError.value = err instanceof Error ? err.message : 'failed to add admin flag'
  } finally {
    quarantineSubmitting.value = false
  }
}

// Per-flag clear flow. The confirm modal targets one flag at a time.
const pendingClearFlagId = ref<string | null>(null)
const pendingClearFlag = computed(
  () =>
    selectedProfileDetail.value?.trustFlags.find((f) => f.id === pendingClearFlagId.value) ?? null
)
const clearSubmitting = ref(false)
const clearErrorDetail = ref<string | null>(null)

function askClearFlag(flagId: string) {
  pendingClearFlagId.value = flagId
  clearErrorDetail.value = null
}

async function confirmClearFlag() {
  const flagId = pendingClearFlagId.value
  if (!flagId || !selectedProfile.value) return
  clearSubmitting.value = true
  clearErrorDetail.value = null
  try {
    await clearTrustFlag(flagId)
    if (selectedProfileDetail.value) {
      const remaining = selectedProfileDetail.value.trustFlags.filter((f) => f.id !== flagId)
      selectedProfileDetail.value = {
        ...selectedProfileDetail.value,
        trustFlags: remaining,
        hasActiveTrustFlag: remaining.length > 0,
      }
      if (remaining.length === 0) {
        const current = selectedProfile.value
        selectedProfile.value = { ...current, hasActiveTrustFlag: false }
        const idx = profiles.value.findIndex((p) => p.id === current.id)
        const row = idx >= 0 ? profiles.value[idx] : undefined
        if (row) {
          profiles.value[idx] = { ...row, hasActiveTrustFlag: false }
        }
      }
    }
    pendingClearFlagId.value = null
  } catch (err) {
    clearErrorDetail.value = err instanceof Error ? err.message : 'clear failed'
  } finally {
    clearSubmitting.value = false
  }
}

function resetAndFetch() {
  if (pageTab.value === 'profiles') {
    page.value = 1
    profiles.value = []
    fetchProfiles()
  } else {
    usersPage.value = 1
    users.value = []
    fetchUsers()
  }
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(resetAndFetch, 300)
}

function toggleSegment(segment: string) {
  const idx = selectedSegments.value.indexOf(segment)
  if (idx >= 0) {
    selectedSegments.value.splice(idx, 1)
  } else {
    selectedSegments.value.push(segment)
  }
  resetAndFetch()
}

function onCountryChange() {
  resetAndFetch()
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.dropdown')) {
    segmentDropdownOpen.value = false
  }
}

function toggleProfileSelection(profile: AdminProfile) {
  const next = new Map(selectedProfiles.value)
  if (next.has(profile.id)) next.delete(profile.id)
  else next.set(profile.id, profile)
  selectedProfiles.value = next
}

const allVisibleSelected = computed(
  () => profiles.value.length > 0 && profiles.value.every((p) => selectedProfileIds.value.has(p.id))
)

const someVisibleSelected = computed(
  () => !allVisibleSelected.value && profiles.value.some((p) => selectedProfileIds.value.has(p.id))
)

function toggleSelectAllVisible() {
  const next = new Map(selectedProfiles.value)
  if (allVisibleSelected.value) {
    for (const p of profiles.value) next.delete(p.id)
  } else {
    for (const p of profiles.value) next.set(p.id, p)
  }
  selectedProfiles.value = next
}

const selectedProfilesList = computed(() => Array.from(selectedProfiles.value.values()))

function openSendMessageModal() {
  if (selectedProfiles.value.size === 0) return
  messageContent.value = ''
  sendError.value = null
  sendResult.value = null
  showSendMessageModal.value = true
}

function closeSendMessageModal() {
  if (sending.value) return
  showSendMessageModal.value = false
}

async function sendBulkMessage() {
  if (!messageContent.value.trim() || selectedProfiles.value.size === 0) return
  sending.value = true
  sendError.value = null
  try {
    const res = await apiRequest<{ success: boolean; sent: number; failed: number }>(
      '/admin/messages',
      {
        method: 'POST',
        body: {
          profileIds: Array.from(selectedProfiles.value.keys()),
          content: messageContent.value.trim(),
        },
      }
    )
    sendResult.value = { sent: res.sent, failed: res.failed }
    selectedProfiles.value = new Map()
    messageContent.value = ''
  } catch (err) {
    sendError.value = err instanceof Error ? err.message : 'Failed to send messages'
  } finally {
    sending.value = false
  }
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

watch(selectedSort, resetAndFetch)

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  fetchCountries()
  fetchOrigins()
  fetchProfiles()
  fetchUsers()
  if (visibility.value === 'visible') refreshTimer.resume()

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        if (pageTab.value === 'profiles') loadMore()
        else loadMoreUsers()
      }
    },
    { rootMargin: '200px' }
  )
  if (sentinel.value) observer.observe(sentinel.value)

  if (typeof route.query.profileId === 'string') {
    viewProfileById(route.query.profileId)
  }
})

watch(
  () => route.query.profileId,
  (id) => {
    if (typeof id === 'string') viewProfileById(id)
  }
)

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  observer?.disconnect()
})
</script>

<template>
  <div>
    <div class="d-flex align-items-baseline mb-4">
      <h2 class="mb-0">Profiles</h2>
      <span class="text-muted ms-auto">
        {{ pageTab === 'profiles' ? total : usersTotal }} result{{
          (pageTab === 'profiles' ? total : usersTotal) === 1 ? '' : 's'
        }}
      </span>
    </div>

    <ul class="nav nav-pills mb-3">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: pageTab === 'profiles' }"
          @click="switchTab('profiles')"
        >
          Profiles
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: pageTab === 'users' }"
          @click="switchTab('users')"
        >
          Not onboarded ({{ usersTotal }})
        </button>
      </li>
    </ul>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div class="mb-3 d-flex flex-wrap gap-2">
      <input
        v-model="search"
        type="text"
        class="form-control"
        :placeholder="
          pageTab === 'profiles'
            ? 'Search by name, city, email, phone, or ID...'
            : 'Search by email, phone, or user ID...'
        "
        @input="onSearchInput"
      />
      <div
        v-if="pageTab === 'profiles'"
        class="dropdown"
        style="max-width: 200px"
      >
        <button
          class="btn btn-outline-secondary dropdown-toggle w-100 text-start"
          type="button"
          @click="segmentDropdownOpen = !segmentDropdownOpen"
        >
          {{
            selectedSegments.length === 0
              ? 'All Segments'
              : `${selectedSegments.length} Segment${selectedSegments.length > 1 ? 's' : ''}`
          }}
        </button>
        <ul
          v-if="segmentDropdownOpen"
          class="dropdown-menu show"
          style="min-width: 180px"
        >
          <li
            v-for="seg in allSegments"
            :key="seg"
            class="dropdown-item"
            style="cursor: pointer"
            @click="toggleSegment(seg)"
          >
            <input
              type="checkbox"
              class="form-check-input me-2"
              :checked="selectedSegments.includes(seg)"
              @click.stop="toggleSegment(seg)"
            />
            {{ seg }}
          </li>
        </ul>
      </div>
      <select
        v-if="pageTab === 'profiles'"
        v-model="selectedCountry"
        class="form-select"
        style="max-width: 200px"
        @change="onCountryChange"
      >
        <option value="">All Countries</option>
        <option
          v-for="c in countries"
          :key="c"
          :value="c"
        >
          {{ c }}
        </option>
      </select>
      <select
        v-if="pageTab === 'profiles'"
        v-model="selectedSort"
        class="form-select"
        style="max-width: 200px"
        aria-label="Sort profiles"
        data-testid="profile-sort"
      >
        <option
          v-for="opt in sortOptions"
          :key="opt.value"
          :value="opt.value"
        >
          Sort: {{ opt.label }}
        </option>
      </select>
      <button
        v-if="pageTab === 'profiles'"
        type="button"
        class="btn btn-primary ms-auto"
        :disabled="selectedProfileIds.size === 0"
        @click="openSendMessageModal"
      >
        Send message{{ selectedProfileIds.size > 0 ? ` (${selectedProfileIds.size})` : '' }}
      </button>
    </div>

    <div class="table-container p-3">
      <template v-if="pageTab === 'profiles'">
        <div
          v-if="loading"
          class="text-muted"
        >
          Loading...
        </div>
        <table
          v-else
          class="table table-hover mb-0"
        >
          <thead>
            <tr>
              <th style="width: 2.5rem">
                <input
                  type="checkbox"
                  class="form-check-input"
                  aria-label="Select all visible profiles"
                  :checked="allVisibleSelected"
                  :indeterminate="someVisibleSelected"
                  @change="toggleSelectAllVisible"
                />
              </th>
              <th>Name</th>
              <th>Location</th>
              <th>Last active</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="profile in profiles"
              :key="profile.id"
              :class="{ 'table-warning': profile.hasActiveTrustFlag }"
              style="cursor: pointer"
              @click="viewProfile(profile)"
            >
              <td @click.stop>
                <input
                  type="checkbox"
                  class="form-check-input"
                  :aria-label="`Select profile ${profile.publicName || profile.id}`"
                  :checked="selectedProfileIds.has(profile.id)"
                  @change="toggleProfileSelection(profile)"
                />
              </td>
              <td>
                {{ profile.publicName || '-' }}
                <span
                  v-if="profile.hasFace"
                  class="badge text-bg-light border ms-1"
                  title="Has face photo"
                  role="img"
                  aria-label="Has face photo"
                  data-testid="has-face-icon"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="align-baseline"
                    aria-hidden="true"
                  >
                    <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                    <path
                      fill-rule="evenodd"
                      d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"
                    />
                  </svg>
                </span>
                <span
                  v-if="profile.activitySummary?.segment"
                  :class="segmentBadgeClass(profile.activitySummary.segment)"
                  class="ms-1"
                >
                  {{ profile.activitySummary.segment }}
                </span>
                <svg
                  v-if="profile.isDatingActive"
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  class="text-danger ms-1 align-baseline"
                  role="img"
                  aria-label="Dating active"
                  data-testid="dating-icon"
                >
                  <title>Dating active</title>
                  <path
                    fill-rule="evenodd"
                    d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"
                  />
                </svg>
              </td>
              <td>{{ [profile.cityName, profile.country].filter(Boolean).join(', ') || '-' }}</td>
              <td
                v-if="profile.activitySummary"
                :title="new Date(profile.activitySummary.lastSeenAt).toLocaleString()"
              >
                {{ formatRelative(profile.activitySummary.lastSeenAt) }}
              </td>
              <td v-else>—</td>
              <td :title="new Date(profile.createdAt).toLocaleString()">
                {{ formatRelative(profile.createdAt) }}
              </td>
              <td @click.stop>
                <PublicProfileLink :profile-id="profile.id" />
              </td>
            </tr>
            <tr v-if="profiles.length === 0">
              <td
                colspan="6"
                class="text-center text-muted"
              >
                No profiles found
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else>
        <div
          v-if="usersError"
          class="alert alert-danger"
        >
          {{ usersError }}
        </div>
        <div
          v-if="usersLoading"
          class="text-muted"
        >
          Loading...
        </div>
        <table
          v-else
          class="table table-hover mb-0"
        >
          <thead>
            <tr>
              <th>Email / Phone</th>
              <th>Confirmed</th>
              <th>Active</th>
              <th>Blocked</th>
              <th>Newsletter</th>
              <th>Created</th>
              <th>Origin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
              style="cursor: pointer"
              @click="viewUser(user)"
            >
              <td>{{ user.email || user.phonenumber || '-' }}</td>
              <td>
                <span
                  :class="user.isRegistrationConfirmed ? 'badge bg-success' : 'badge bg-warning'"
                >
                  {{ user.isRegistrationConfirmed ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <span :class="user.isActive ? 'badge bg-success' : 'badge bg-secondary'">
                  {{ user.isActive ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <span :class="user.isBlocked ? 'badge bg-danger' : 'badge bg-secondary'">
                  {{ user.isBlocked ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <span :class="user.newsletterOptIn ? 'badge bg-success' : 'badge bg-secondary'">
                  {{ user.newsletterOptIn ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>{{ new Date(user.createdAt).toLocaleDateString() }}</td>
              <td>{{ user.originDomain || '-' }}</td>
              <td>
                <button
                  class="btn btn-sm btn-outline-primary"
                  @click.stop="viewUser(user)"
                >
                  View
                </button>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td
                colspan="8"
                class="text-center text-muted"
              >
                No users found
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <div
        ref="sentinel"
        class="text-center text-muted py-2"
      >
        <span v-if="loadingMore || usersLoadingMore">Loading more...</span>
      </div>
    </div>

    <!-- Detail Modal (profile + user tabs, or user-only from the Not onboarded tab) -->
    <div v-if="selectedProfile || userModalOpen">
      <div
        v-modal-focus
        class="modal d-block"
        tabindex="-1"
        @click.self="closeDetail"
        @keydown.escape="closeDetail"
        @keydown.enter.prevent="detailTab === 'user' ? saveUser() : closeDetail()"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ selectedProfile ? 'Profile Detail' : 'User Detail' }}</h5>
              <button
                type="button"
                class="btn-close"
                @click="closeDetail"
              ></button>
            </div>
            <div class="modal-body">
              <ul
                v-if="selectedProfile"
                class="nav nav-tabs mb-3"
              >
                <li class="nav-item">
                  <button
                    type="button"
                    class="nav-link"
                    :class="{ active: detailTab === 'profile' }"
                    @click="detailTab = 'profile'"
                  >
                    Profile
                  </button>
                </li>
                <li class="nav-item">
                  <button
                    type="button"
                    class="nav-link"
                    :class="{ active: detailTab === 'activity' }"
                    @click="detailTab = 'activity'"
                  >
                    Activity
                  </button>
                </li>
                <li class="nav-item">
                  <button
                    type="button"
                    class="nav-link"
                    :class="{ active: detailTab === 'user' }"
                    @click="detailTab = 'user'"
                  >
                    User
                  </button>
                </li>
              </ul>

              <template v-if="detailTab === 'profile' && selectedProfile">
                <dl class="row mb-0">
                  <template v-if="selectedProfileDetail">
                    <dt class="col-sm-4">Photos</dt>
                    <dd class="col-sm-8">
                      <ProfileImageReview
                        v-model:has-face="selectedProfileDetail.hasFace"
                        @update:has-face="onDetailHasFaceChange"
                        :profile-id="selectedProfileDetail.id"
                        :images="selectedProfileDetail.profileImages"
                      />
                    </dd>
                  </template>
                  <dt class="col-sm-4">ID</dt>
                  <dd class="col-sm-8 d-flex align-items-center gap-2">
                    <code>{{ selectedProfile.id }}</code>
                    <PublicProfileLink :profile-id="selectedProfile.id" />
                  </dd>
                  <dt class="col-sm-4">Name</dt>
                  <dd class="col-sm-8">{{ selectedProfile.publicName || '-' }}</dd>
                  <dt class="col-sm-4">User Email</dt>
                  <dd class="col-sm-8">{{ selectedProfile.user?.email ?? '-' }}</dd>
                  <dt class="col-sm-4">Country</dt>
                  <dd class="col-sm-8">{{ selectedProfile.country || '-' }}</dd>
                  <dt class="col-sm-4">City</dt>
                  <dd class="col-sm-8">{{ selectedProfile.cityName || '-' }}</dd>
                  <dt class="col-sm-4">Social Active</dt>
                  <dd class="col-sm-8">{{ selectedProfile.isSocialActive ? 'Yes' : 'No' }}</dd>
                  <dt class="col-sm-4">Dating Active</dt>
                  <dd class="col-sm-8">{{ selectedProfile.isDatingActive ? 'Yes' : 'No' }}</dd>
                  <dt class="col-sm-4">Onboarded</dt>
                  <dd class="col-sm-8">{{ selectedProfile.isOnboarded ? 'Yes' : 'No' }}</dd>
                  <dt class="col-sm-4">Active</dt>
                  <dd class="col-sm-8">{{ selectedProfile.isActive ? 'Yes' : 'No' }}</dd>
                  <dt class="col-sm-4">Reported</dt>
                  <dd class="col-sm-8">{{ selectedProfile.isReported ? 'Yes' : 'No' }}</dd>
                  <dt class="col-sm-4">Activity Segment</dt>
                  <dd class="col-sm-8">{{ selectedProfile.activitySummary?.segment || '—' }}</dd>
                </dl>

                <div class="mt-3">
                  <h6 class="mb-2">Trust</h6>
                  <div
                    v-if="detailLoading"
                    class="text-muted small"
                  >
                    Loading trust info...
                  </div>
                  <div
                    v-else-if="detailError"
                    class="alert alert-danger small mb-0"
                  >
                    {{ detailError }}
                  </div>
                  <template v-else>
                    <div
                      v-if="activeFlags.length === 0"
                      class="text-muted small"
                    >
                      No active trust flags.
                    </div>
                    <div
                      v-for="f in activeFlags"
                      v-else
                      :key="f.id"
                      class="border rounded p-2 mb-2 d-flex align-items-start gap-2"
                    >
                      <div class="flex-grow-1">
                        <div>
                          <span :class="flagOriginBadgeClass[flagOrigin(f.flaggedBy)]">{{
                            flagOrigin(f.flaggedBy)
                          }}</span>
                          <strong class="ms-2">{{ f.reason }}</strong>
                          <code class="ms-2 small">{{ f.flaggedBy }}</code>
                        </div>
                        <div class="small text-muted">
                          {{ new Date(f.flaggedAt).toLocaleString() }}
                        </div>
                        <div
                          v-if="f.evidence"
                          class="small"
                        >
                          {{ f.evidence }}
                        </div>
                      </div>
                      <button
                        class="btn btn-sm btn-outline-primary"
                        @click="askClearFlag(f.id)"
                      >
                        Clear
                      </button>
                    </div>
                  </template>
                </div>
              </template>

              <template v-else-if="detailTab === 'activity'">
                <div
                  v-if="activityLoading"
                  class="text-muted"
                >
                  Loading activity...
                </div>
                <div
                  v-else-if="activityError"
                  class="alert alert-danger mb-0"
                >
                  {{ activityError }}
                </div>
                <div
                  v-else-if="profileActivity"
                  data-testid="profile-activity"
                >
                  <div class="d-grid gap-2">
                    <KpiCard
                      v-for="card in activityCards"
                      :key="card.key"
                      :title="card.title"
                      :subtitle="card.subtitle"
                      :value="card.value"
                      :series="card.series"
                      :stacks="card.stacks"
                      :series-labels="card.seriesLabels"
                      :color="card.color"
                    />
                  </div>
                  <div class="small text-body-secondary mt-2">
                    Last 7 days (solid: sent / initiated, light: received / joined).
                  </div>
                  <h6 class="mt-4 mb-2">All time</h6>
                  <div
                    class="row row-cols-2 g-2"
                    data-testid="profile-activity-totals"
                  >
                    <div
                      v-for="kpi in activityTotals"
                      :key="kpi.title"
                      class="col"
                    >
                      <div class="border rounded px-3 py-2 h-100">
                        <div class="small fw-semibold">{{ kpi.title }}</div>
                        <div class="fs-5 fw-bold lh-sm">{{ kpi.value }}</div>
                        <div class="small text-body-secondary">{{ kpi.subtitle }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-if="userLoading"
                  class="text-muted"
                >
                  Loading user...
                </div>
                <div
                  v-else-if="userError"
                  class="alert alert-danger mb-0"
                >
                  {{ userError }}
                </div>
                <template v-else-if="userDetail">
                  <div
                    v-if="userSaveError"
                    class="alert alert-danger mb-3"
                  >
                    {{ userSaveError }}
                  </div>
                  <dl class="row mb-0">
                    <dt class="col-sm-4">ID</dt>
                    <dd class="col-sm-8">
                      <code>{{ userDetail.id }}</code>
                    </dd>
                    <dt class="col-sm-4">Email</dt>
                    <dd class="col-sm-8">{{ userDetail.email }}</dd>
                    <dt class="col-sm-4">Active</dt>
                    <dd class="col-sm-8">
                      <div class="form-check">
                        <input
                          id="editUserActive"
                          v-model="editUserActive"
                          class="form-check-input"
                          type="checkbox"
                        />
                        <label
                          class="form-check-label"
                          for="editUserActive"
                          >Active</label
                        >
                      </div>
                    </dd>
                    <dt class="col-sm-4">Blocked</dt>
                    <dd class="col-sm-8 d-flex align-items-center gap-2">
                      <span
                        :class="userDetail.isBlocked ? 'badge bg-danger' : 'badge bg-secondary'"
                      >
                        {{ userDetail.isBlocked ? 'Yes' : 'No' }}
                      </span>
                      <button
                        class="btn btn-sm"
                        :class="
                          userDetail.isBlocked ? 'btn-outline-secondary' : 'btn-outline-danger'
                        "
                        :disabled="userBlocking"
                        @keydown.enter.stop
                        @click="toggleUserBlocked"
                      >
                        {{ userDetail.isBlocked ? 'Unblock' : 'Block' }}
                      </button>
                    </dd>
                    <dt class="col-sm-4">Created</dt>
                    <dd class="col-sm-8">{{ new Date(userDetail.createdAt).toLocaleString() }}</dd>
                    <dt class="col-sm-4">Last Seen</dt>
                    <dd class="col-sm-8">
                      {{
                        userDetail.lastSeenAt
                          ? new Date(userDetail.lastSeenAt).toLocaleString()
                          : 'Never'
                      }}
                    </dd>
                    <dt class="col-sm-4">Language</dt>
                    <dd class="col-sm-8">
                      <select
                        id="editUserLanguage"
                        v-model="editUserLanguage"
                        class="form-select form-select-sm"
                        style="max-width: 200px"
                      >
                        <option
                          v-for="opt in languageOptions"
                          :key="opt.code"
                          :value="opt.code"
                        >
                          {{ opt.label }}
                        </option>
                      </select>
                    </dd>
                    <dt class="col-sm-4">Origin</dt>
                    <dd class="col-sm-8">
                      <select
                        id="editUserOrigin"
                        v-model="editUserOrigin"
                        class="form-select form-select-sm"
                        style="max-width: 200px"
                      >
                        <option
                          v-for="o in originOptions"
                          :key="o"
                          :value="o"
                        >
                          {{ o }}
                        </option>
                      </select>
                    </dd>
                  </dl>
                  <h6 class="mt-3 mb-2">Opt-in</h6>
                  <dl
                    class="row mb-0"
                    data-testid="user-optins"
                  >
                    <template
                      v-for="optIn in userOptIns"
                      :key="optIn.label"
                    >
                      <dt class="col-sm-4">{{ optIn.label }}</dt>
                      <dd class="col-sm-8">
                        <span :class="optIn.value ? 'badge bg-success' : 'badge bg-secondary'">
                          {{ optIn.value ? 'Yes' : 'No' }}
                        </span>
                        <span
                          v-if="optIn.note"
                          class="small text-body-secondary ms-2"
                          >{{ optIn.note }}</span
                        >
                      </dd>
                    </template>
                  </dl>
                </template>
              </template>
            </div>
            <div class="modal-footer flex-wrap">
              <template v-if="detailTab === 'user'">
                <button
                  class="btn btn-secondary"
                  @click="closeDetail"
                >
                  Close
                </button>
                <button
                  class="btn btn-primary"
                  :disabled="userSaving || !userDetail"
                  @click="saveUser"
                >
                  {{ userSaving ? 'Saving...' : 'Save' }}
                </button>
              </template>
              <div
                v-else-if="quarantineOpen"
                class="w-100"
              >
                <div
                  v-if="quarantineError"
                  class="alert alert-danger small"
                >
                  {{ quarantineError }}
                </div>
                <textarea
                  v-model="quarantineNote"
                  class="form-control mb-2"
                  rows="3"
                  placeholder="Reason for the admin hold (1–1000 chars)"
                  :disabled="quarantineSubmitting"
                  @keydown.enter.stop
                ></textarea>
                <div class="d-flex justify-content-end gap-2">
                  <button
                    class="btn btn-secondary"
                    :disabled="quarantineSubmitting"
                    @click="cancelQuarantine"
                  >
                    Cancel
                  </button>
                  <button
                    class="btn btn-warning"
                    :disabled="quarantineSubmitting || quarantineNote.trim().length === 0"
                    @click="submitQuarantine"
                  >
                    {{ quarantineSubmitting ? 'Submitting...' : 'Confirm admin flag' }}
                  </button>
                </div>
              </div>
              <template v-else>
                <button
                  v-if="!hasAdminFlag && !detailLoading && !detailError"
                  class="btn btn-warning me-auto"
                  @click="openQuarantineForm"
                >
                  Add admin flag
                </button>
                <button
                  class="btn btn-secondary"
                  @click="closeDetail"
                >
                  Close
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </div>

    <!-- Confirm clear quarantine modal -->
    <div v-if="pendingClearFlagId">
      <div
        class="modal d-block"
        tabindex="-1"
        @click.self="pendingClearFlagId = null"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Clear trust flag?</h5>
            </div>
            <div class="modal-body">
              <p class="mb-2">
                Profile:
                <strong>{{ selectedProfile?.publicName || selectedProfile?.id }}</strong>
              </p>
              <p class="mb-2">
                Flag: <strong>{{ pendingClearFlag?.reason }}</strong>
                <code class="ms-2 small">{{ pendingClearFlag?.flaggedBy }}</code>
              </p>
              <p class="text-muted small mb-0">
                Held messages on this profile will be released once no active flags remain. Clearing
                a SPAM_BURST flag does <em>not</em> revive its discarded conversations.
              </p>
              <div
                v-if="clearErrorDetail"
                class="alert alert-danger mt-2 mb-0"
              >
                {{ clearErrorDetail }}
              </div>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-secondary"
                :disabled="clearSubmitting"
                @click="pendingClearFlagId = null"
              >
                Cancel
              </button>
              <button
                class="btn btn-primary"
                :disabled="clearSubmitting"
                @click="confirmClearFlag"
              >
                {{ clearSubmitting ? 'Clearing...' : 'Clear flag' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </div>

    <!-- Send Message Modal -->
    <div v-if="showSendMessageModal">
      <div
        v-modal-focus
        class="modal d-block"
        tabindex="-1"
        @click.self="closeSendMessageModal"
        @keydown.escape="closeSendMessageModal"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Send message</h5>
              <button
                type="button"
                class="btn-close"
                :disabled="sending"
                @click="closeSendMessageModal"
              ></button>
            </div>
            <div class="modal-body">
              <div
                v-if="sendResult"
                class="alert alert-success"
              >
                Sent to {{ sendResult.sent }} profile{{ sendResult.sent === 1 ? '' : 's' }}.
                <span v-if="sendResult.failed > 0"> {{ sendResult.failed }} failed. </span>
              </div>
              <div
                v-if="sendError"
                class="alert alert-danger"
              >
                {{ sendError }}
              </div>
              <template v-if="!sendResult">
                <div class="mb-3">
                  <label class="form-label fw-semibold">
                    Recipients ({{ selectedProfilesList.length }})
                  </label>
                  <div
                    class="border rounded p-2 bg-light"
                    style="max-height: 150px; overflow-y: auto"
                  >
                    <span
                      v-for="p in selectedProfilesList"
                      :key="p.id"
                      class="badge bg-secondary me-1 mb-1"
                    >
                      {{ p.publicName || p.id }}
                    </span>
                  </div>
                </div>
                <div class="mb-0">
                  <label
                    for="bulk-message-content"
                    class="form-label fw-semibold"
                  >
                    Message
                  </label>
                  <textarea
                    id="bulk-message-content"
                    v-model="messageContent"
                    class="form-control"
                    rows="6"
                    :disabled="sending"
                    placeholder="Write your message..."
                  ></textarea>
                </div>
              </template>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-secondary"
                :disabled="sending"
                @click="closeSendMessageModal"
              >
                {{ sendResult ? 'Close' : 'Cancel' }}
              </button>
              <button
                v-if="!sendResult"
                class="btn btn-primary"
                :disabled="sending || !messageContent.trim() || selectedProfilesList.length === 0"
                @click="sendBulkMessage"
              >
                {{ sending ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </div>
  </div>
</template>
