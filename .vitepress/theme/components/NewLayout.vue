<template>
  <Layout>
    <template #doc-before>
      <PostHeader />
    </template>
    <template #doc-bottom>
      <Comment />
    </template>
  </Layout>
  <Copyright />
</template>
<script setup>
import DefaultTheme from 'vitepress/theme'
import Copyright from './Copyright.vue'
import { useRouter } from 'vitepress'
import PostHeader from './PostHeader.vue'
import mediumZoom from 'medium-zoom'
import { onMounted } from 'vue'

const { Layout } = DefaultTheme
const router = useRouter()

// Setup medium zoom with the desired options
const setupMediumZoom = () => {
  mediumZoom('[data-zoomable]', {
    background: 'transparent'
  })
}

// Apply medium zoom on load
onMounted(setupMediumZoom)

// Subscribe to route changes to re-apply medium zoom effect
router.onAfterRouteChange = setupMediumZoom
</script>
<style>
.medium-zoom-overlay {
  backdrop-filter: blur(5rem);
}

.medium-zoom-overlay,
.medium-zoom-image--opened {
  z-index: 999;
}
</style>
