---
title: 本站特殊语法示例
description: 这是一个示例
date: 2025-08-31
tags:
  - demo
---

<script setup>
  import Poem from '@/poem.vue'
  import { Sandpack } from 'sandpack-vue3';
  import { computed } from 'vue';
  import { useData } from 'vitepress';
  const { isDark  } = useData();
  const theme = computed(() => isDark.value ? 'dark' : 'light');
  import codeSfcSetup from '@/test.vue?raw'
  const files= {
    '/src/App.vue': codeSfcSetup
  }
  const options={
    showConsoleButton: false,
    showInlineErrors: true,
    showNavigator: false,
    showLineNumbers: true,
    showTabs: true,
    closableTabs: false,
    editorHeight: 450, // default 300
    editorWidthPercentage: 75, // default 50
    autorun: true,
    wrapContent: true,
    showConsoleButton: true,
    externalResources: ["https://cdn.tailwindcss.com"]
  }

  // RecordTable 测试数据
  import RecordTable from '@/RecordTable/index.vue'
  const generateMockData = () => {
    const data = {}
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      if (Math.random() < 0.35) {
        const count = Math.floor(Math.random() * 8) + 1
        const items = []
        for (let j = 0; j < count; j++) {
          items.push({
            text: `活动记录 ${j + 1}`,
            url: Math.random() > 0.5 ? `https://example.com/record/${dateStr}/${j}` : undefined
          })
        }
        data[dateStr] = items
      }
    }
    return data
  }
  const recordData = generateMockData()
</script>

## 文字排版

<Poem />

## 代码编辑预览

<Sandpack :theme="theme" :files="files" template="vue3" :options="options" />

## 日历热力图

### English (Default)

<RecordTable :data="recordData" />

### 中文

<RecordTable :data="recordData" locale="zh" :cell-size="13" />
