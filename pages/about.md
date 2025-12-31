---
page: true
title: About
comment: false
aside: false
---
又折腾了一个博客，2025，从头开始  
<script setup>
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import RecordTable from '@/RecordTable/index.vue'

const { theme } = useData()

// 按年份分组的文章数据
const yearlyRecords = computed(() => {
  const yearMap = {}
  
  // 遍历所有文章，按年份分组
  theme.value.posts.forEach(post => {
    const date = post.frontMatter.date?.split(' ')[0]
    if (date) {
      const year = date.split('-')[0]
      if (!yearMap[year]) yearMap[year] = {}
      if (!yearMap[year][date]) yearMap[year][date] = []
      yearMap[year][date].push({
        text: post.frontMatter.title,
        url: withBase(post.regularPath)
      })
    }
  })
  
  // 转换为数组并按年份降序排序
  return Object.entries(yearMap)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, data]) => ({ year, data }))
})
</script>

<div v-for="record in yearlyRecords" :key="record.year" class="yearly-record">
  <h2>{{ record.year }}</h2>
  <RecordTable :data="record.data" :year="Number(record.year)" locale="zh" />
</div>

<style>
.yearly-record {
  margin-bottom: 2rem;
}
.yearly-record h2 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}
</style>
