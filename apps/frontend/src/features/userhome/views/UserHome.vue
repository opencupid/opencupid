<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { computed, onMounted, provide, ref, toRef, useTemplateRef } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useBootstrap } from '@/lib/bootstrap'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { type PublicProfile } from '@zod/profile/profile.dto'
import type { PopularTag } from '@zod/tag/tag.dto'

import ProfileCardGrid from '@/features/browse/components/ProfileCardGrid.vue'
import LikesAndMatchesBanner from '@/features/interaction/components/LikesAndMatchesBanner.vue'
import TagCloud from '@/features/shared/components/TagCloud.vue'
import IconSearch from '@/assets/icons/interface/search.svg'

defineOptions({ name: 'UserHome' })

const profileStore = useOwnerProfileStore()
const viewerProfile = computed(() => profileStore.profile)
const router = useRouter()
const newProfiles = ref([] as PublicProfile[])
const mainEl = useTemplateRef<HTMLElement>('mainEl')

onMounted(async () => {
  await useBootstrap().bootstrap()

  if (viewerProfile.value && !viewerProfile.value?.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return
  }

  const findProfileStore = useFindProfileStore()
  const result = await findProfileStore.fetchNewSocial()
  if (result.success && result.data) {
    newProfiles.value = result.data.result as PublicProfile[]
  }
})

const handleCardClick = async (profileId: string) => {
  router.push({
    name: 'PublicProfile',
    params: {
      profileId: profileId,
    },
  })
}

const handleTagSelect = async (tag: PopularTag) => {
  const findProfileStore = useFindProfileStore()
  if (findProfileStore.socialFilter) {
    findProfileStore.socialFilter.tags = [{ id: tag.id, name: tag.name, slug: tag.slug }]
    await findProfileStore.persistSocialFilter()
  }
  router.push({ path: '/browse', query: { tag: tag.slug } })
}

provide('viewerProfile', toRef(viewerProfile))
</script>

<template>
  <main class="overflow-auto hide-scrollbar">
    <div class="container-xl px-3">
      <!-- lg+: two-column layout -->
      <BRow class="d-flex mt-3">
        <BCol
          lg="6"
          class="pe-lg-3"
        >
          <LikesAndMatchesBanner
            class="clickable my-3"
            @click="router.push({ name: 'Messaging' })"
          />
          <div
            v-if="newProfiles.length > 0"
            class="mb-4"
          >
            <h5>{{ $t('home.meet_new_people') }}</h5>
            <ProfileCardGrid
              :profiles="newProfiles"
              @profile:select="handleCardClick"
              :showTags="false"
            />
            <RouterLink
              :to="{ name: 'SocialMatch' }"
              class="btn icon-link mt-2"
              role="button"
            >
              <IconSearch class="svg-icon me-1" />
              {{ $t('home.more_people') }}
            </RouterLink>
          </div>
        </BCol>
        <BCol lg="4">
          <div class="tag-cloud-sidebar">
            <h5>{{ $t('home.explore_interests') }}</h5>
            <TagCloud @tag:select="handleTagSelect" />
          </div>
        </BCol>
      </BRow>
    </div>
  </main>
</template>

<style scoped lang="scss"></style>
