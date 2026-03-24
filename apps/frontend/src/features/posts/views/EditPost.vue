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

const defaultLocation = computed(() => LocationSchema.parse(ownerProfile.value?.location ?? {}))

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
      const result = await postStore.fetchPost(postId.value)
      if (result.success && result.data) {
        post.value = result.data.post
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
  <main>
    <MiddleColumn class="h-100 d-flex flex-column">
      <SecondaryNav>
        <template #items-center>
          <span v-if="isEdit">{{ $t('posts.edit_title') }}</span>
          <span v-else>{{ $t('posts.create_title') }}</span>
        </template>
      </SecondaryNav>
      <div class="py-md-3 flex-grow-1 d-flex flex-column justify-content-center">
        <div
          v-if="isLoading"
          class="text-center py-5"
        >
          <SpinnerComponent />
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
