<template>
  <!-- 词云组件 -->
  <WordCloud :tags="tags" :active-tag="selectTag" @tag-click="toggleTag" />

  <!-- 标签头部和文章列表 -->
  <div class="tag-header">{{ selectTag }}</div>
  <a :href="withBase(article.regularPath)" v-for="(article, index) in selectTag ? tags[selectTag] : []" :key="index"
    class="posts">
    <div class="post-container">
      <div class="post-dot"></div>
      {{ article.frontMatter.title }}
    </div>
    <div class="date">{{ article.frontMatter.date }}</div>
  </a>
</template>
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useData, withBase } from 'vitepress'
import { initTags } from '../functions'
import WordCloud from './WordCloud.vue'

const { theme } = useData()
const tags = computed(() => initTags(theme.value.posts))
const selectTag = ref(Object.keys(tags.value)[0] || '')

// 处理标签点击
const toggleTag = (tag) => {
  selectTag.value = tag
  // 使用 History API 更新 URL 参数，避免页面刷新
  const newUrl = new URL(window.location)
  newUrl.searchParams.set('tag', tag)
  window.history.pushState({}, '', newUrl.toString())
  
  // 平滑滚动到标签头部
  scrollToTagHeader()
}

// 平滑滚动到标签头部的函数
const scrollToTagHeader = () => {
  // 使用 nextTick 确保 DOM 更新完成后再滚动
  nextTick(() => {
    const tagHeader = document.querySelector('.tag-header')
    if (tagHeader) {
      // 动态计算偏移量，适应不同的页面布局
      const headerOffset = getHeaderOffset()
      const elementPosition = tagHeader.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      
      // 平滑滚动
      window.scrollTo({
        top: Math.max(0, offsetPosition), // 确保不滚动到负值
        behavior: 'smooth'
      })
      
      // 添加视觉反馈：短暂高亮标签头部
      addScrollHighlight(tagHeader)
    }
  })
}

// 动态获取页面头部偏移量
const getHeaderOffset = () => {
  // 检查是否有固定的导航栏
  const navbar = document.querySelector('.VPNav')
  if (navbar) {
    const navHeight = navbar.getBoundingClientRect().height
    return navHeight + 20 // 导航栏高度 + 额外间距
  }
  
  // 默认偏移量
  return 80
}

// 添加滚动高亮效果
const addScrollHighlight = (element) => {
  // 添加高亮类
  element.classList.add('scroll-highlight')
  
  setTimeout(() => {
    element.classList.remove('scroll-highlight')
  }, 1000)
}

onMounted(() => {
  getCurrTag()

  // 监听浏览器返回/前进按钮事件
  window.addEventListener('popstate', getCurrTag)
})

onUnmounted(() => {
  window.removeEventListener('popstate', getCurrTag)
})

function getCurrTag() {
  const url = location.href
  const params = new URL(url).searchParams
  const currTag = params.get('tag') || ''
  if (currTag && currTag !== selectTag.value) {
    selectTag.value = currTag
  }
}
</script>

<style lang="scss" scoped>
// 标签头部样式
.tag-header {
  padding: 28px 0 10px 0;
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--bt-theme-title, var(--vp-c-text-1));
  font-family: var(--date-font-family, inherit);
  transition: all 0.3s ease;
  border-radius: 8px;
  
  // 滚动高亮效果
  &.scroll-highlight {
    display: inline-block;
    margin-top: 8px;
    background: linear-gradient(135deg, 
      rgba(var(--vp-c-brand-rgb, 60, 60, 60), 0.1) 0%, 
      rgba(var(--vp-c-brand-rgb, 60, 60, 60), 0.05) 100%
    );
    padding-left: 16px;
    padding-right: 16px;
    transform: translateX(4px);
    box-shadow: 0 2px 12px rgba(var(--vp-c-brand-rgb, 60, 60, 60), 0.15);
    
    // 动画效果
    animation: highlightPulse 1.5s ease-out;
  }
}

// 高亮脉冲动画
@keyframes highlightPulse {
  0% {
    transform: translateX(0) scale(1);
    background: rgba(var(--vp-c-brand-rgb, 60, 60, 60), 0.2);
  }
  50% {
    transform: translateX(4px) scale(1.02);
    background: rgba(var(--vp-c-brand-rgb, 60, 60, 60), 0.1);
  }
  100% {
    transform: translateX(4px) scale(1);
    background: rgba(var(--vp-c-brand-rgb, 60, 60, 60), 0.05);
  }
}

// 文章列表样式
.posts {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  text-decoration: none;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
  border-radius: 4px;

  &:hover {
    background-color: var(--vp-c-bg-alt);
    padding-left: 12px;
    transform: translateX(4px);
  }
}

.post-container {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.post-dot {
  width: 6px;
  height: 6px;
  background-color: var(--vp-c-brand);
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.posts:hover .post-dot {
  background-color: var(--vp-c-brand-light, var(--vp-c-brand));
  transform: scale(1.2);
}

.date {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  font-family: var(--date-font-family, monospace);
  font-weight: 400;
}

// 响应式设计
@media screen and (max-width: 768px) {
  .tag-header {
    padding: 20px 0 8px 0;
    font-size: 1.25rem;
  }

  .posts {
    padding: 10px 0;
  }

  .date {
    font-size: 0.75rem;
  }
}

@media screen and (max-width: 480px) {
  .tag-header {
    font-size: 1.125rem;
  }

  .posts {
    padding: 8px 0;

    &:hover {
      padding-left: 8px;
      transform: translateX(2px);
    }
  }

  .post-container {
    margin-bottom: 4px;
  }
}
</style>
