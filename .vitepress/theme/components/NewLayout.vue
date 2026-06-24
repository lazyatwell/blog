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
import { useRouter, useData } from 'vitepress'
import PostHeader from './PostHeader.vue'
import mediumZoom from 'medium-zoom'
import { onMounted } from 'vue'
import { normalizeRoute } from '../../utils/protectedRoute'

const { Layout } = DefaultTheme
const router = useRouter()
const { theme } = useData()

// 受密码保护的文章不能走 SPA 路由：SPA 会直接用 JS chunk 渲染原文，绕过静态加密页。
// 这里拦截前往受保护路由的导航，改为整页加载，从而加载 staticrypt 加密后的 html，
// 立即显示密码页；解密后才显示原文。同时整页加载也修复了加密页下回退按钮无效的问题。
const protectedSet = new Set((theme.value.protectedPaths || []).map(normalizeRoute))
const prevBeforeRouteChange = router.onBeforeRouteChange
router.onBeforeRouteChange = (to) => {
  if (typeof window !== 'undefined' && protectedSet.has(normalizeRoute(to))) {
    window.location.assign(to)
    return false // 取消 SPA 导航
  }
  return prevBeforeRouteChange ? prevBeforeRouteChange(to) : undefined
}

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
