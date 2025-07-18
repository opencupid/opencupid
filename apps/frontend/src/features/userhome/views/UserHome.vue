<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { computed, onMounted, provide, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useBootstrap } from '@/lib/bootstrap'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { type PublicProfile } from '@zod/profile/profile.dto'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import ProfileCardGrid from '@/features/browse/components/ProfileCardGrid.vue'
import LikesAndMatchesBanner from '@/features/interaction/components/LikesAndMatchesBanner.vue'
import { bus } from '@/lib/bus'

const profileStore = useOwnerProfileStore()
const viewerProfile = computed(() => profileStore.profile)
const router = useRouter()
const newProfiles = ref([] as PublicProfile[])

onMounted(async () => {
  await useBootstrap().bootstrap()

  if (!viewerProfile.value?.isOnboarded) {
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

provide('viewerProfile', toRef(viewerProfile))

const siteName = __APP_CONFIG__.SITE_NAME
</script>

<template>
  <main class="overflow-auto">
    <div class="container">
      <MiddleColumn>
        <h2 class="mt-3">
          <!-- Welcome to site_name -->
          <!-- {{ $t('home.welcome_title', { siteName: siteName }) }} -->
        </h2>
        <LikesAndMatchesBanner class="my-3" />

        <div v-if="newProfiles.length > 0" class="mb-4">
          <h5>
            <!-- Meet new people -->
            {{ $t('home.meet_new_people') }}
          </h5>
          <BRow>
            <ProfileCardGrid
              :profiles="newProfiles"
              @profile:select="handleCardClick"
              :showTags="false"
              cols="2"
              gutter="2"
              gap="2"
            />
          </BRow>
        </div>
      </MiddleColumn>
    </div>
  </main>
</template>
