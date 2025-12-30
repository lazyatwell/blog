<template>
  <div class="example-container">
    <h2>日历热力图示例</h2>
    <RecordTable :data="mockData" :cell-size="12" :gap="3" />
  </div>
</template>

<script lang="ts" setup>
import RecordTable from './index.vue'

// 生成模拟数据
const generateMockData = () => {
  const data: Record<string, { text: string; url?: string }[]> = {}
  const today = new Date()

  // 生成最近一年的随机数据
  for (let i = 0; i < 365; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    // 随机决定是否有记录（约 40% 的日期有记录）
    if (Math.random() < 0.4) {
      const count = Math.floor(Math.random() * 8) + 1
      const items = []

      for (let j = 0; j < count; j++) {
        const hasUrl = Math.random() > 0.5
        items.push({
          text: `记录 ${j + 1} - ${dateStr}`,
          url: hasUrl ? `https://example.com/record/${dateStr}/${j}` : undefined
        })
      }

      data[dateStr] = items
    }
  }

  return data
}

const mockData = generateMockData()
</script>

<style scoped>
.example-container {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
}
</style>

