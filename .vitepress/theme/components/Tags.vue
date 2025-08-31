<template>
  <div class="tags">
    <span @click="toggleTag(String(key))" v-for="(_, key) in tags" class="tag" :class="{ active: selectTag === key }">
      {{ key }} <sup>{{ tags[key].length }}</sup>
    </span>
  </div>
  <div class="tag-header">{{ selectTag }}</div>
  <a
    :href="withBase(article.regularPath)"
    v-for="(article, index) in selectTag ? tags[selectTag] : []"
    :key="index"
    class="posts"
  >
    <div class="post-container">
      <div class="post-dot"></div>
      {{ article.frontMatter.title }}
    </div>
    <div class="date">{{ article.frontMatter.date }}</div>
  </a>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useData, withBase, useRouter } from 'vitepress'
import { initTags } from '../functions'

const router = useRouter()

const selectTag = ref('')
const { theme } = useData()
const tags = computed(() => initTags(theme.value.posts))

const toggleTag = (tag: string) => {
  router.go(withBase(`/pages/tags?tag=${tag}`))
}

onMounted(() => {
  const url = location.href.split('?')[1]
  const params = new URLSearchParams(url)
  selectTag.value = params.get('tag') || ''
  if (!selectTag.value) {
    const defaultDisplayTag = Object.keys(tags.value)[0]
    toggleTag(defaultDisplayTag)
  }
})
</script>

<style lang="scss" scoped>
.tags {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 0 16px 4px 16px;
  margin: 6px 8px;
  font-size: 0.875rem;
  line-height: 25px;
  background-color: var(--vp-c-bg-alt);
  transition: 0.4s;
  border-radius: 2px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  sup {
    color: var(--vp-c-brand);
    font-weight: bold;
  }
  &.active {
    background-color: var(--vp-c-text-1);
    color: var(--vp-c-neutral-inverse);
    sup {
      color: var(--vp-c-neutral-inverse);
    }
  }
}

.tag-header {
  padding: 28px 0 10px 0;
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--bt-theme-title);
  font-family: var(--date-font-family);
}

@media screen and (max-width: 768px) {
  .date {
    font-size: 0.75rem;
  }
}
</style>
