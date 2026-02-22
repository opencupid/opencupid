<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import {
  computed,
  onActivated,
  onMounted,
  provide,
  ref,
  toRef,
  useTemplateRef,
  nextTick,
} from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useBootstrap } from '@/lib/bootstrap'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { type PublicProfile } from '@zod/profile/profile.dto'

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
let savedScrollTop = 0

onBeforeRouteLeave(() => {
  if (mainEl.value) {
    savedScrollTop = mainEl.value.scrollTop
  }
})

onMounted(async () => {
  await useBootstrap().bootstrap()

  if (viewerProfile.value && !viewerProfile.value?.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return
  }
})

onActivated(async () => {
  const findProfileStore = useFindProfileStore()
  const result = await findProfileStore.fetchNewSocial()
  if (result.success && result.data) {
    newProfiles.value = result.data.result as PublicProfile[]
  }

  if (mainEl.value && savedScrollTop > 0) {
    await nextTick()
    mainEl.value.scrollTop = savedScrollTop
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
</script>

<template>
  <main
    ref="mainEl"
    class="overflow-auto hide-scrollbar"
  >
    <div class="container-xl px-3">
      <!-- sm/xs: stacked single column -->
      <div class="d-lg-none col-12 col-sm-10 mx-auto mt-3">
        <LikesAndMatchesBanner class="my-3" />
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
            class="more-people-link mt-2"
            role="button"
          >
            <IconSearch class="svg-icon-sm me-1" />
            {{ $t('home.more_people') }}
          </RouterLink>
        </div>
        <h5>{{ $t('home.explore_interests') }}</h5>
        <div class="mb-4">
          <TagCloud />
        </div>
      </div>

      <!-- lg+: two-column layout -->
      <BRow class="d-none d-lg-flex mt-3">
        <BCol
          lg="9"
          class="pe-lg-3"
        >
          <LikesAndMatchesBanner class="mb-3" />
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
              class="more-people-link mt-2"
              role="button"
            >
              <IconSearch class="svg-icon-sm me-1" />
              {{ $t('home.more_people') }}
            </RouterLink>
          </div>
        </BCol>
        <BCol lg="3">
          <div class="tag-cloud-sidebar">
            <h5>{{ $t('home.explore_interests') }}</h5>
            <TagCloud />
          </div>
        </BCol>
      </BRow>
    </div>
  </main>
</template>

<style scoped lang="scss">
.more-people-link {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  color: var(--bs-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.tag-cloud-sidebar {
  position: sticky;
  top: 1rem;
}
</style>
