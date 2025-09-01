<template>
  <div v-show="!$frontmatter.page" class="post-body">
    <div class="post-title">{{ $frontmatter.title }}</div>
    <div class="post-info">
      <div class="post-info-item"><CalendarDays :size="12" />{{ convertDateV2($frontmatter.date) }}</div>
      <div class="post-info-item tags">
        <Tag :size="12" />
        <span v-for="item in $frontmatter.tags"
          ><a :href="withBase(`/pages/tags.html?tag=${item}`)"> {{ item }}</a></span
        >
      </div>
    </div>
  </div>
</template>
<script setup>
import { withBase } from 'vitepress'
import { convertDateV2 } from '../date'
</script>
<style lang="scss" scoped>
.post-body {
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  .post-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--vp-c-text-1);
  }
}
</style>
