<template>
  <div class="flex flex-col items-center justify-center gap-4 h-screen">
    <h1 class="text-green-500">Colored Text</h1>
    <button class="bg-blue-500 text-white p-2 rounded-md" @click="count++">click</button>
    <p class="text-2xl">{{ count }}</p>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
const count = ref(0)
onMounted(() => {
  console.log('onMounted')
})
</script>
