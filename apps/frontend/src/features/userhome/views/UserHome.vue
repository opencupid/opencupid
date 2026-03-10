<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { computed, onMounted, provide, ref, toRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useBootstrap } from '@/lib/bootstrap'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { type PublicProfile } from '@zod/profile/profile.dto'
import type { PopularTag } from '@zod/tag/tag.dto'

import ProfileCardGrid from '@/features/browse/components/ProfileCardGrid.vue'
import LikesAndMatchesBanner from '@/features/interaction/components/LikesAndMatchesBanner.vue'
import TagCloud from '@/features/shared/components/TagCloud.vue'
import IconSearch from '@/assets/icons/interface/search.svg'

const profileStore = useOwnerProfileStore()
const viewerProfile = computed(() => profileStore.profile)
const router = useRouter()
const newProfiles = ref([] as PublicProfile[])

onMounted(async () => {
  await useBootstrap().bootstrap()

  if (viewerProfile.value && !viewerProfile.value?.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return
  }

  const findProfileStore = useFindProfileStore()
  const result = await findProfileStore.fetchNewProfiles()
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
  router.push({ name: 'BrowseProfiles' })
}

provide('viewerProfile', toRef(viewerProfile))
</script>

<template>
  <main class="overflow-auto hide-scrollbar">
    <BContainer fluid>
      <LikesAndMatchesBanner
        class="clickable my-3"
        @click="router.push({ name: 'Messaging' })"
      />
      <!-- lg+: two-column layout -->
      <BRow class="d-flex mt-3">
        <BCol lg="6">
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
              :to="{ name: 'BrowseProfiles' }"
              class="btn icon-link mt-2"
              role="button"
            >
              <IconSearch class="svg-icon me-1" />
              {{ $t('home.more_people') }}
            </RouterLink>
          </div>
        </BCol>
        <BCol lg="6">
          <TagCloud @tag:select="handleTagSelect" />
        </BCol>
      </BRow>
    </BContainer>
  </main>
</template>

<style scoped lang="scss"></style>
