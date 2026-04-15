<script setup lang="ts">
import { computed } from 'vue'

import type { PostSummary } from '@zod/post/post.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'

import ProfileChipList from './ProfileChipList.vue'
import IconPostIt from '@/assets/icons/interface/post-it.svg'

const props = defineProps<{
  profiles: ProfileSummary[]
  posts: PostSummary[]
}>()

defineEmits<{
  'post:select': [post: PostSummary]
  'profile:select': [profile: ProfileSummary]
}>()
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
  </div>
</template>
