<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PostEdit from '../components/EditPostDialog.vue'
import { useBootstrap } from '@/lib/bootstrap'
import { usePostStore } from '../stores/postStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import type { OwnerPost } from '@zod/post/post.dto'
import { LocationSchema } from '@zod/dto/location.dto'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'
import SpinnerComponent from '@/features/shared/ui/SpinnerComponent.vue'

defineOptions({ name: 'EditPost' })

const route = useRoute()
const router = useRouter()
const postStore = usePostStore()
const profileStore = useOwnerProfileStore()
const ownerProfile = computed(() => profileStore.profile)
provide('ownerProfile', ownerProfile)

const defaultLocation = computed(() =>
  LocationSchema.parse(ownerProfile.value?.location ?? {})
)

const postId = computed(() => route.params.postId as string | undefined)
const isEdit = computed(() => !!postId.value)
const post = ref<OwnerPost>()
const isLoading = ref(false)
const isInitialized = ref(false)

onMounted(async () => {
  isLoading.value = true
  try {
    await useBootstrap().bootstrap()

    if (postId.value) {
      const fetched = await postStore.fetchPost(postId.value)
      if (fetched) {
        post.value = fetched as OwnerPost
      }
    }

    isInitialized.value = true
  } finally {
    isLoading.value = false
  }
})

function handleCancel() {
  router.back()
}

function handleSaved() {
  router.push({ name: 'Posts' })
}

</script>

<template>
  <main class="w-100 position-relative overflow-hidden container-fluid">
    <MiddleColumn class="h-100 d-flex flex-column">
      <SecondaryNav>
        <template #items-center>
          <span v-if="isEdit">{{ $t('posts.edit_title') }}</span>
          <span v-else>{{ $t('posts.create_title') }}</span>
        </template>
      </SecondaryNav>
      <div
        class="container py-md-3"
      >
        <div
          v-if="isLoading"
          class="text-center py-5"
        >
          <SpinnerComponent
            variant="primary"
            type="border"
          />
        </div>

        <PostEdit
          v-else
          :post="post"
          :is-edit="isEdit"
          :default-location="defaultLocation"
          @cancel="handleCancel"
          @saved="handleSaved"
        />
      </div>
    </MiddleColumn>
  </main>
</template>
