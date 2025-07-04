<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { onMounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBootstrap } from '@/lib/bootstrap'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { type PublicProfile } from '@zod/profile/profile.dto'

import ReceivedLikesCount from '@/features/interaction/components/ReceivedLikesCount.vue'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import ProfileCardGrid from '@/features/browse/components/ProfileCardGrid.vue'

const profileStore = useOwnerProfileStore()
const viewerProfile = ref(profileStore.profile)
const router = useRouter()
// Line removed as it is unused.
const newProfiles = ref([] as PublicProfile[])

onMounted(async () => {
  await useBootstrap().bootstrap()

  const findProfileStore = useFindProfileStore()

  const result = await findProfileStore.fetchNewSocial()
  console.log('New profiles fetched:', result)
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

provide('viewerProfile', viewerProfile.value)
</script>

<template>
  <main class="container overflow-auto">
    <h2 class="mt-3">Welcome to Gaians.</h2>
    <ReceivedLikesCount class="my-3" />

    <div v-if="newProfiles.length > 0" class="mb-4">
      <h5>New people nearby</h5>
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
  </main>
</template>
