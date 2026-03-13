<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { computed, onMounted, provide, ref, toRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useBreakpoints } from '@vueuse/core'
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

const breakpoints = useBreakpoints({ md: 768, lg: 992 })
const isMdOrSmaller = breakpoints.smallerOrEqual('md')
const visibleProfiles = computed(() =>
  isMdOrSmaller.value ? newProfiles.value.slice(0, 6) : newProfiles.value
)

onMounted(async () => {
  await useBootstrap().bootstrap()

  if (viewerProfile.value && !viewerProfile.value?.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return
  }

  const findProfileStore = useFindProfileStore()
  const result = await findProfileStore.fetchNewProfiles(9)
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
    <BContainer
      fluid-sm
      fluid-md
      fluid-xl
    >
      <div class="banner-halo">
        <LikesAndMatchesBanner
          class="clickable my-3"
          @click="router.push({ name: 'Messaging' })"
        />
      </div>
      <!-- lg+: two-column layout -->
      <BRow class="d-flex mt-3 align-items-lg-center">
        <BCol lg="6">
          <div
            v-if="visibleProfiles.length > 0"
            class="mb-4"
          >
            <h6 class="display-6 text-center text-muted mb-2 mb-lg-4">
              {{ $t('home.meet_new_people') }}
            </h6>
            <ProfileCardGrid
              :profiles="visibleProfiles"
              @profile:select="handleCardClick"
              :showTags="false"
              cols="2"
              cols-sm="3"
              cols-md="3"
              cols-lg="3"
              cols-xl="3"
              gutter-y="4"
            />
            <div class="d-flex justify-content-center mt-3">
              <BButton
                :to="{ name: 'BrowseProfiles' }"
                variant="primary"
                class=""
              >
                <IconSearch class="svg-icon me-1" />
                {{ $t('home.more_people') }}
              </BButton>
            </div>
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
