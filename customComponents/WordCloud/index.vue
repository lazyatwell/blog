<template>
  <div 
    ref="containerRef" 
    class="word-cloud-container"
    :style="{ width: autoResize ? '100%' : `${containerWidth}px`, height: autoResize ? '100%' : `${containerHeight}px` }"
  >
    <div
      v-for="(word, index) in positionedWords"
      :key="index"
      class="word-cloud-item"
      :style="{
        position: 'absolute',
        left: `${word.x}px`,
        top: `${word.y}px`,
        fontSize: `${word.fontSize}px`,
        color: word.color,
        fontWeight: word.fontWeight,
        transform: `translate(-50%, -50%) rotate(${word.rotation}deg)`,
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.3s ease'
      }"
      @click="onWordClick(word)"
      @mouseover="onWordHover(word, true)"
      @mouseleave="onWordHover(word, false)"
    >
      {{ word.label }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { PropType, ref, computed, onMounted, onUnmounted, watch } from 'vue'

// 定义词汇接口
interface WordItem {
  value: number
  label: string
}

// 定义定位后的词汇接口
interface PositionedWord extends WordItem {
  x: number
  y: number
  fontSize: number
  color: string
  fontWeight: string
  width: number
  height: number
  rotation: number
  rotatedWidth: number
  rotatedHeight: number
}

// 定义组件属性
const props = defineProps({
  wordCloud: {
    type: Array as PropType<WordItem[]>,
    required: true
  },
  width: {
    type: Number,
    default: 800
  },
  height: {
    type: Number,
    default: 600
  },
  minFontSize: {
    type: Number,
    default: 12
  },
  maxFontSize: {
    type: Number,
    default: 48
  },
  padding: {
    type: Number,
    default: 5
  },
  autoResize: {
    type: Boolean,
    default: false
  },
  maxRotation: {
    type: Number,
    default: 45
  }
})

// 定义事件
const emit = defineEmits<{
  wordClick: [word: PositionedWord]
  wordHover: [word: PositionedWord, isHover: boolean]
}>()

const containerRef = ref<HTMLElement>()
const positionedWords = ref<PositionedWord[]>([])
const containerWidth = ref(props.width)
const containerHeight = ref(props.height)

// 基于字符串生成哈希值
const stringToHash = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return Math.abs(hash)
}

// 基于哈希值生成HSL颜色
const generateHashColor = (text: string): string => {
  const hash = stringToHash(text)
  // 使用哈希值生成色相(0-360)
  const hue = hash % 360
  // 饱和度固定在60-90%之间，保证颜色鲜艳
  const saturation = 60 + (hash % 30)
  // 亮度固定在45-65%之间，保证可读性
  const lightness = 45 + (hash % 20)
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// 基于哈希值生成随机旋转角度
const generateHashRotation = (text: string): number => {
  const hash = stringToHash(text)
  // 生成-maxRotation到+maxRotation之间的角度
  const rotation = ((hash % (props.maxRotation * 2 + 1)) - props.maxRotation)
  return rotation
}

// 计算字体大小
const calculateFontSize = (value: number, minValue: number, maxValue: number): number => {
  if (maxValue === minValue) return props.minFontSize
  const ratio = (value - minValue) / (maxValue - minValue)
  return props.minFontSize + ratio * (props.maxFontSize - props.minFontSize)
}

// 计算文本尺寸
const measureText = (text: string, fontSize: number): { width: number; height: number } => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  context.font = `${fontSize}px Arial`
  const metrics = context.measureText(text)
  return {
    width: metrics.width,
    height: fontSize
  }
}

// 计算旋转后的边界框尺寸
const calculateRotatedBounds = (width: number, height: number, rotation: number): { width: number; height: number } => {
  if (rotation === 0) {
    return { width, height }
  }
  
  const radians = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  
  // 计算旋转后的边界框
  const rotatedWidth = width * cos + height * sin
  const rotatedHeight = width * sin + height * cos
  
  return {
    width: rotatedWidth,
    height: rotatedHeight
  }
}

// 生成云朵形状的坐标点
const generateCloudShape = (centerX: number, centerY: number, scale: number = 1): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = []
  const numPoints = 200
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI
    
    // 使用多个正弦波叠加创建云朵形状
    let radius = 80 * scale
    radius += 20 * scale * Math.sin(3 * angle)
    radius += 15 * scale * Math.sin(5 * angle)
    radius += 10 * scale * Math.sin(7 * angle)
    radius += 8 * scale * Math.cos(4 * angle)
    
    // 添加一些随机性使形状更自然
    radius += (Math.random() - 0.5) * 10 * scale
    
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle) * 0.8 // 稍微压扁一点
    
    points.push({ x, y })
  }
  
  return points
}

// 检查两个旋转后的矩形是否重叠
const isOverlapping = (
  word1: { x: number; y: number; rotatedWidth: number; rotatedHeight: number },
  word2: { x: number; y: number; rotatedWidth: number; rotatedHeight: number }
): boolean => {
  const padding = props.padding
  return !(
    word1.x + word1.rotatedWidth / 2 + padding < word2.x - word2.rotatedWidth / 2 ||
    word2.x + word2.rotatedWidth / 2 + padding < word1.x - word1.rotatedWidth / 2 ||
    word1.y + word1.rotatedHeight / 2 + padding < word2.y - word2.rotatedHeight / 2 ||
    word2.y + word2.rotatedHeight / 2 + padding < word1.y - word1.rotatedHeight / 2
  )
}

// 检查点是否在云朵形状内
const isPointInCloudShape = (x: number, y: number, centerX: number, centerY: number, scale: number = 1): boolean => {
  const dx = x - centerX
  const dy = (y - centerY) / 0.8 // 考虑压扁因子
  const distance = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)
  
  let maxRadius = 80 * scale
  maxRadius += 20 * scale * Math.sin(3 * angle)
  maxRadius += 15 * scale * Math.sin(5 * angle)
  maxRadius += 10 * scale * Math.sin(7 * angle)
  maxRadius += 8 * scale * Math.cos(4 * angle)
  maxRadius += 20 // 额外的容错空间
  
  return distance <= maxRadius
}

// 寻找合适的位置放置词汇
const findValidPosition = (
  word: PositionedWord,
  placedWords: PositionedWord[],
  cloudPoints: { x: number; y: number }[],
  centerX: number,
  centerY: number,
  scale: number
): { x: number; y: number } | null => {
  // 首先尝试在云朵形状内的随机点，旋转元素需要更多尝试
  const maxAttempts = word.rotation !== 0 ? 150 : 100
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const point = cloudPoints[Math.floor(Math.random() * cloudPoints.length)]
    const testWord = { ...word, x: point.x, y: point.y }
    
    // 检查是否在边界内（使用旋转后的尺寸）
    if (
      point.x - word.rotatedWidth / 2 < 0 ||
      point.x + word.rotatedWidth / 2 > containerWidth.value ||
      point.y - word.rotatedHeight / 2 < 0 ||
      point.y + word.rotatedHeight / 2 > containerHeight.value
    ) {
      continue
    }
    
    // 检查是否与其他词汇重叠
    const hasOverlap = placedWords.some(placedWord => isOverlapping(testWord, placedWord))
    
    if (!hasOverlap && isPointInCloudShape(point.x, point.y, centerX, centerY, scale)) {
      return { x: point.x, y: point.y }
    }
  }
  
  // 如果在云朵形状内找不到位置，尝试螺旋搜索，旋转元素需要更密集的搜索
  const spiralStep = word.rotation !== 0 ? 3 : 5
  const maxSpiral = word.rotation !== 0 ? 80 : 50
  
  for (let spiral = 1; spiral <= maxSpiral; spiral++) {
    const angle = spiral * 0.5
    const radius = spiral * spiralStep
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    
    if (
      x - word.rotatedWidth / 2 < 0 ||
      x + word.rotatedWidth / 2 > containerWidth.value ||
      y - word.rotatedHeight / 2 < 0 ||
      y + word.rotatedHeight / 2 > containerHeight.value
    ) {
      continue
    }
    
    const testWord = { ...word, x, y }
    const hasOverlap = placedWords.some(placedWord => isOverlapping(testWord, placedWord))
    
    if (!hasOverlap) {
      return { x, y }
    }
  }
  
  return null
}

// 更新容器尺寸
const updateContainerSize = () => {
  if (props.autoResize && containerRef.value) {
    const parent = containerRef.value.parentElement
    if (parent) {
      containerWidth.value = parent.clientWidth
      containerHeight.value = parent.clientHeight
    }
  } else {
    containerWidth.value = props.width
    containerHeight.value = props.height
  }
}

// 布局算法
const layoutWords = () => {
  if (!props.wordCloud.length) return
  
  updateContainerSize()
  
  const centerX = containerWidth.value / 2
  const centerY = containerHeight.value / 2
  const scale = Math.min(containerWidth.value, containerHeight.value) / 400
  
  // 生成云朵形状的坐标点
  const cloudPoints = generateCloudShape(centerX, centerY, scale)
  
  // 计算值的范围用于字体大小缩放
  const values = props.wordCloud.map(item => item.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  
  // 按value排序，优先放置重要的词汇
  const sortedWords = [...props.wordCloud].sort((a, b) => b.value - a.value)
  
  const newPositionedWords: PositionedWord[] = []
  
  for (const wordItem of sortedWords) {
    const fontSize = calculateFontSize(wordItem.value, minValue, maxValue)
    const { width, height } = measureText(wordItem.label, fontSize)
    const color = generateHashColor(wordItem.label)
    const rotation = generateHashRotation(wordItem.label)
    const fontWeight = wordItem.value > (minValue + maxValue) / 2 ? 'bold' : 'normal'
    
    // 计算旋转后的边界框
    const { width: rotatedWidth, height: rotatedHeight } = calculateRotatedBounds(width, height, rotation)
    
    const word: PositionedWord = {
      ...wordItem,
      x: 0,
      y: 0,
      fontSize,
      color,
      fontWeight,
      width,
      height,
      rotation,
      rotatedWidth,
      rotatedHeight
    }
    
    const position = findValidPosition(word, newPositionedWords, cloudPoints, centerX, centerY, scale)
    
    if (position) {
      word.x = position.x
      word.y = position.y
      newPositionedWords.push(word)
    }
  }
  
  positionedWords.value = newPositionedWords
}

// 事件处理
const onWordClick = (word: PositionedWord) => {
  emit('wordClick', word)
}

const onWordHover = (word: PositionedWord, isHover: boolean) => {
  emit('wordHover', word, isHover)
}

// 监听窗口大小变化
const handleResize = () => {
  if (props.autoResize) {
    layoutWords()
  }
}

// 监听数据变化
watch(() => props.wordCloud, layoutWords, { deep: true })
watch([() => props.width, () => props.height], layoutWords)
watch(() => props.autoResize, () => {
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
  } else {
    window.removeEventListener('resize', handleResize)
  }
  layoutWords()
})

// 组件挂载后执行布局
onMounted(() => {
  layoutWords()
  
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
    // 使用 ResizeObserver 监听父容器大小变化
    if (containerRef.value?.parentElement) {
      const resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(containerRef.value.parentElement)
    }
  }
})

onUnmounted(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
  }
})
</script>

<style scoped>
.word-cloud-container {
  min-height: 350px;
  min-width: 310px;
  position: relative;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
}

.word-cloud-item {
  transition: all 0.3s ease;
  white-space: nowrap;
}

.word-cloud-item:hover {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
  filter: brightness(1.2);
}
</style>
