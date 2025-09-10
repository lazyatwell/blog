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
</script>

## 文字排版

<Poem />

## 代码编辑预览

<Sandpack :theme="theme" :files="files" template="vue3" :options="options" />
