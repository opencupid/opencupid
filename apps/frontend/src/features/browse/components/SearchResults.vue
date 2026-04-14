<script setup lang="ts">
import type { SearchResponse } from '@shared/zod/search/search.dto'

import SelectableTagList from './SelectableTagList.vue'
import ProfileChipList from '@/features/shared/components/ProfileChipList.vue'

defineProps<{ results: SearchResponse }>()

defineEmits<{
  'select:profile': [profileId: string]
}>()
</script>

<template>
  <div class="search-results d-flex flex-column gap-2">
    <section
      v-if="results.tags.length"
      class="search-results__group"
    >
      <SelectableTagList
        :tags="results.tags"
        selectable
      />
      <hr class="my-1" />
    </section>

    <section
      v-if="results.profiles.length"
      class="search-results__group"
    >
      <ProfileChipList
        :profiles="results.profiles"
        @select:profile="(id) => $emit('select:profile', id)"
      />
    </section>

    <section
      v-if="results.posts.length"
      class="search-results__group"
    >
      <h6 class="search-results__group-title text-uppercase small text-secondary mb-1">Posts</h6>
      <ul class="list-unstyled m-0">
        <li
          v-for="post in results.posts"
          :key="post.id"
          class="search-results__post py-1"
        >
          <div class="small text-secondary">{{ post.postedBy.publicName }}</div>
          <div class="text-truncate">{{ post.content }}</div>
        </li>
      </ul>
    </section>

    <section
      v-if="results.locations.length"
      class="search-results__group"
    >
      <h6 class="search-results__group-title text-uppercase small text-secondary mb-1">
        Locations
      </h6>
      <ul class="list-unstyled m-0">
        <li
          v-for="(loc, i) in results.locations"
          :key="`${loc.country}-${loc.cityName ?? ''}-${i}`"
          class="search-results__location py-1 text-truncate"
        >
          {{ loc.cityName ? `${loc.cityName}, ${loc.country}` : loc.country }}
        </li>
      </ul>
    </section>

    <div
      v-if="
        !results.tags.length &&
        !results.profiles.length &&
        !results.posts.length &&
        !results.locations.length
      "
      class="text-center text-secondary small py-3"
    >
      No results
    </div>
  </div>
</template>
