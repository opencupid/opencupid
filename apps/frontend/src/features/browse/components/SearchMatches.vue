<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PostSummary } from '@zod/post/post.dto'
import type { EventSummary } from '@zod/event/event.dto'
import type { CommunitySummary } from '@zod/community/community.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'

import ProfileChipList from './ProfileChipList.vue'
import IconPostIt from '@/assets/icons/interface/post-it.svg'
import IconCalendar from '@/assets/icons/interface/calendar.svg'
import IconCommunity from '@/assets/icons/interface/community.svg'

const props = defineProps<{
  profiles: ProfileSummary[]
  posts: PostSummary[]
  events: EventSummary[]
  communities: CommunitySummary[]
}>()

defineEmits<{
  'post:select': [post: PostSummary]
  'event:select': [event: EventSummary]
  'community:select': [community: CommunitySummary]
  'profile:select': [profile: ProfileSummary]
}>()

const { locale } = useI18n()

// One formatter instance, cached against the active locale — Intl.DateTimeFormat
// construction is non-trivial and event lists can carry many rows.
const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
)

function formatStartsAt(d: Date): string {
  return dateFormatter.value.format(d)
}
</script>

<template>
  <div class="search-matches d-flex flex-column">
    <section
      v-if="profiles.length"
      class="px-2 pt-2"
    >
      <ProfileChipList
        :profiles="profiles"
        @select:profile="(profile: ProfileSummary) => $emit('profile:select', profile)"
      />
    </section>

    <section
      v-if="posts.length"
      class="px-2 pt-2 d-flex align-items-start"
    >
      <IconPostIt
        width="24"
        height="24"
        class="mt-1 mx-2 text-secondary flex-shrink-0"
      />
      <BListGroup
        flush
        class="flex-grow-1 min-w-0"
      >
        <BListGroupItem
          v-for="post in posts"
          class="small px-1"
          button
          :key="post.id"
          @click="$emit('post:select', post)"
        >
          <div class="small lh-sm text-truncate">
            {{ post.content }}
          </div>
        </BListGroupItem>
      </BListGroup>
    </section>

    <section
      v-if="events.length"
      class="px-2 pt-2 d-flex align-items-start"
    >
      <IconCalendar
        width="24"
        height="24"
        class="mt-1 mx-2 text-secondary flex-shrink-0"
      />
      <BListGroup
        flush
        class="flex-grow-1 min-w-0"
      >
        <BListGroupItem
          v-for="event in events"
          class="small px-1"
          button
          :key="event.id"
          @click="$emit('event:select', event)"
        >
          <div class="small lh-sm text-truncate">
            {{ event.content }}
          </div>
          <div class="small text-secondary fw-semibold">
            {{ formatStartsAt(event.startsAt) }}
          </div>
        </BListGroupItem>
      </BListGroup>
    </section>

    <section
      v-if="communities.length"
      class="px-2 pt-2 d-flex align-items-start"
    >
      <IconCommunity
        width="24"
        height="24"
        class="mt-1 mx-2 text-secondary flex-shrink-0"
      />
      <BListGroup
        flush
        class="flex-grow-1 min-w-0"
      >
        <BListGroupItem
          v-for="community in communities"
          class="small px-1"
          button
          :key="community.id"
          @click="$emit('community:select', community)"
        >
          <div class="small lh-sm text-truncate">
            {{ community.content }}
          </div>
          <div
            v-if="community.yearFounded !== null"
            class="small text-secondary fw-semibold"
          >
            {{ community.yearFounded }}
          </div>
        </BListGroupItem>
      </BListGroup>
    </section>
  </div>
</template>
