<template>
  <div class="word-cloud-example">
    <h2>词云组件使用示例</h2>

    <!-- 基本使用 -->
    <div class="example-section">
      <h3>基本使用（固定颜色 + 旋转效果）</h3>
      <div class="responsive-container">
        <WordCloud 
          :wordCloud="basicWords" 
          :autoResize="true"
          @wordClick="onWordClick" 
          @wordHover="onWordHover" 
          :padding="responsivePadding"
          :maxRotation="30"
          :minFontSize="responsiveMinFont"
          :maxFontSize="responsiveMaxFont"
        />
      </div>
      <p class="description">注意：相同的词汇会始终显示相同的颜色和旋转角度</p>
      <p class="description">可点击显示词汇信息</p>
    </div>

    <!-- 点击信息显示 -->
    <div v-if="clickedWord" class="clicked-info">
      <h4>点击的词汇信息：</h4>
      <p>标签: {{ clickedWord.label }}</p>
      <p>值: {{ clickedWord.value }}</p>
      <p>字体大小: {{ clickedWord.fontSize }}px</p>
      <p>颜色: {{ clickedWord.color }}</p>
      <p>旋转角度: {{ clickedWord.rotation }}°</p>
    </div>

    <!-- 自适应容器示例 -->
    <div class="example-section">
      <h3>调整容器大小</h3>
      <div class="adaptive-container" :style="{ width: adaptiveWidth + 'px', height: adaptiveHeight + 'px' }">
        <WordCloud 
          :wordCloud="basicWords" 
          :autoResize="true"
          :maxRotation="45"
          :padding="6"
        />
      </div>
      <div class="adaptive-controls">
        <div class="control-group">
          <label>容器宽度: {{ adaptiveWidth }}px</label>
          <input v-model.number="adaptiveWidth" type="range" min="300" max="900" step="50" />
        </div>
        <div class="control-group">
          <label>容器高度: {{ adaptiveHeight }}px</label>
          <input v-model.number="adaptiveHeight" type="range" min="200" max="600" step="50" />
        </div>
      </div>
    </div>

    <!-- 旋转防碰撞示例 -->
    <div class="example-section">
      <h3>旋转防碰撞效果对比</h3>
      <div class="comparison-container">
        <div class="comparison-item">
          <h4>大旋转角度 (60°)</h4>
          <WordCloud 
            :wordCloud="mobileRotationWords" 
            :width="comparisonWidth" 
            :height="comparisonHeight" 
            :minFontSize="comparisonMinFont" 
            :maxFontSize="comparisonMaxFont" 
            :padding="responsivePadding"
            :maxRotation="60"
          />
        </div>
        <div class="comparison-item">
          <h4>中等旋转角度 (30°)</h4>
          <WordCloud 
            :wordCloud="mobileRotationWords" 
            :width="comparisonWidth" 
            :height="comparisonHeight" 
            :minFontSize="comparisonMinFont" 
            :maxFontSize="comparisonMaxFont" 
            :padding="responsivePadding"
            :maxRotation="30"
          />
        </div>
      </div>
      <p class="description">注意：旋转后的元素不会重叠，且不会超出容器边界</p>
    </div>

    <!-- 大型数据集 -->
    <div class="example-section">
      <h3>大型数据集（无旋转）</h3>
      <div class="responsive-container">
        <WordCloud 
          :wordCloud="mobileLargeWords" 
          :width="largeWidth" 
          :height="largeHeight" 
          :minFontSize="largeMinFont" 
          :maxFontSize="largeMaxFont" 
          :padding="responsivePadding"
          :maxRotation="0"
        />
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="controls">
      <h3>参数控制</h3>
      <div v-if="!autoResize" class="control-group">
        <label>宽度: {{ width }}px</label>
        <input v-model.number="width" type="range" min="400" max="1000" step="50" />
      </div>
      <div v-if="!autoResize" class="control-group">
        <label>高度: {{ height }}px</label>
        <input v-model.number="height" type="range" min="300" max="800" step="50" />
      </div>
      <div class="control-group">
        <label>最小字体: {{ minFontSize }}px</label>
        <input v-model.number="minFontSize" type="range" min="8" max="20" step="1" />
      </div>
      <div class="control-group">
        <label>最大字体: {{ maxFontSize }}px</label>
        <input v-model.number="maxFontSize" type="range" min="30" max="80" step="5" />
      </div>
      <div class="control-group">
        <label>间距: {{ padding }}px</label>
        <input v-model.number="padding" type="range" min="2" max="15" step="1" />
      </div>
      <div class="control-group">
        <label>最大旋转角度: {{ maxRotation }}°</label>
        <input v-model.number="maxRotation" type="range" min="0" max="90" step="5" />
      </div>
      <div class="control-group">
        <label>
          <input v-model="autoResize" type="checkbox" />
          自适应父容器
        </label>
      </div>
      <button @click="regenerateWords" class="regenerate-btn">重新生成数据</button>
    </div>

    <!-- 动态词云 -->
    <div class="example-section">
      <h3>动态词云（可控制参数）</h3>
      <div :style="{ width: autoResize ? '100%' : width + 'px', height: autoResize ? '400px' : height + 'px', border: '2px dashed #ccc' }">
        <WordCloud
          :wordCloud="dynamicWords"
          :width="width"
          :height="height"
          :minFontSize="minFontSize"
          :maxFontSize="maxFontSize"
          :padding="padding"
          :maxRotation="maxRotation"
          :autoResize="autoResize"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import WordCloud from './index.vue'

// 响应式数据
const width = ref(700)
const height = ref(500)
const minFontSize = ref(12)
const maxFontSize = ref(48)
const padding = ref(5)
const maxRotation = ref(30)
const autoResize = ref(true)
const clickedWord = ref<any>(null)

// 屏幕尺寸检测
const screenWidth = ref(window.innerWidth)
const screenHeight = ref(window.innerHeight)
const isMobile = computed(() => screenWidth.value < 768)
const isLandscape = computed(() => screenWidth.value > screenHeight.value)

// 响应式尺寸计算
const responsiveWidth = computed(() => {
  if (isMobile.value) {
    return isLandscape.value ? Math.min(screenWidth.value - 40, 600) : screenWidth.value - 40
  }
  return 600
})

const responsiveHeight = computed(() => {
  if (isMobile.value) {
    return isLandscape.value ? Math.min(screenHeight.value - 200, 300) : 350
  }
  return 400
})

const comparisonWidth = computed(() => {
  if (isMobile.value) {
    return isLandscape.value ? Math.min((screenWidth.value - 80) / 2, 280) : screenWidth.value - 40
  }
  return 400
})

const comparisonHeight = computed(() => {
  if (isMobile.value) {
    return isLandscape.value ? Math.min(screenHeight.value - 250, 200) : 250
  }
  return 300
})

const largeWidth = computed(() => {
  if (isMobile.value) {
    return isLandscape.value ? Math.min(screenWidth.value - 40, 700) : screenWidth.value - 40
  }
  return 800
})

const largeHeight = computed(() => {
  if (isMobile.value) {
    return isLandscape.value ? Math.min(screenHeight.value - 200, 400) : 450
  }
  return 600
})

// 响应式字体大小
const responsiveMinFont = computed(() => isMobile.value ? 10 : 12)
const responsiveMaxFont = computed(() => isMobile.value ? (isLandscape.value ? 28 : 32) : 48)
const comparisonMinFont = computed(() => isMobile.value ? 8 : 14)
const comparisonMaxFont = computed(() => isMobile.value ? (isLandscape.value ? 20 : 24) : 32)
const largeMinFont = computed(() => isMobile.value ? 8 : 10)
const largeMaxFont = computed(() => isMobile.value ? (isLandscape.value ? 35 : 40) : 60)

// 响应式间距
const responsivePadding = computed(() => isMobile.value ? 3 : 8)

// 自适应容器尺寸
const adaptiveWidth = ref(600)
const adaptiveHeight = ref(400)

// 移动端优化的旋转测试数据
const mobileRotationWords = ref([
  { label: 'Vue', value: 90 },
  { label: 'React', value: 85 },
  { label: 'JS', value: 80 },
  { label: 'TS', value: 75 },
  { label: 'CSS', value: 70 },
  { label: 'HTML', value: 65 }
])

// 旋转测试数据（保留原有的，用于桌面端）
const rotationTestWords = ref([
  { label: 'JavaScript', value: 90 },
  { label: 'TypeScript', value: 85 },
  { label: 'Vue.js', value: 80 },
  { label: 'React', value: 75 },
  { label: 'Angular', value: 70 },
  { label: 'Node.js', value: 65 },
  { label: 'Express', value: 60 },
  { label: 'MongoDB', value: 55 },
  { label: 'MySQL', value: 50 },
  { label: 'Redis', value: 45 }
])

// 基本词汇数据
const basicWords = ref([
  { label: 'Vue3', value: 95 },
  { label: 'TypeScript', value: 88 },
  { label: 'JavaScript', value: 92 },
  { label: 'React', value: 85 },
  { label: 'Node.js', value: 78 },
  { label: 'CSS', value: 75 },
  { label: 'HTML', value: 70 },
  { label: 'Python', value: 82 },
  { label: 'Java', value: 80 },
  { label: 'Go', value: 65 }
])

// 移动端优化的大型数据集（减少元素数量，使用更短的标签）
const mobileLargeWords = computed(() => {
  if (isMobile.value) {
    return [
      { label: 'Frontend', value: 100 },
      { label: 'Backend', value: 95 },
      { label: 'Database', value: 90 },
      { label: 'API', value: 85 },
      { label: 'DevOps', value: 80 },
      { label: 'Cloud', value: 88 },
      { label: 'Docker', value: 75 },
      { label: 'K8s', value: 70 },
      { label: 'GraphQL', value: 65 },
      { label: 'REST', value: 82 },
      { label: 'MongoDB', value: 72 },
      { label: 'PostgreSQL', value: 74 },
      { label: 'Redis', value: 68 },
      { label: 'Nginx', value: 66 },
      { label: 'AWS', value: 84 },
      { label: 'Azure', value: 76 },
      { label: 'ML', value: 87 },
      { label: 'AI', value: 89 }
    ]
  }
  return largeWords.value
})

// 大型数据集（桌面端完整版）
const largeWords = ref([
  { label: 'Frontend', value: 100 },
  { label: 'Backend', value: 95 },
  { label: 'Database', value: 90 },
  { label: 'API', value: 85 },
  { label: 'DevOps', value: 80 },
  { label: 'Cloud', value: 88 },
  { label: 'Docker', value: 75 },
  { label: 'Kubernetes', value: 70 },
  { label: 'Microservices', value: 78 },
  { label: 'GraphQL', value: 65 },
  { label: 'REST', value: 82 },
  { label: 'MongoDB', value: 72 },
  { label: 'PostgreSQL', value: 74 },
  { label: 'Redis', value: 68 },
  { label: 'Nginx', value: 66 },
  { label: 'AWS', value: 84 },
  { label: 'Azure', value: 76 },
  { label: 'GCP', value: 71 },
  { label: 'Serverless', value: 69 },
  { label: 'Machine Learning', value: 87 },
  { label: 'AI', value: 89 },
  { label: 'Deep Learning', value: 73 },
  { label: 'Neural Networks', value: 67 },
  { label: 'Data Science', value: 81 },
  { label: 'Analytics', value: 63 }
])

// 动态词汇数据
const dynamicWords = ref([...basicWords.value])

// 生成随机词汇
const generateRandomWords = () => {
  const techTerms = [
    'React',
    'Vue',
    'Angular',
    'Svelte',
    'Next.js',
    'Nuxt.js',
    'TypeScript',
    'JavaScript',
    'Python',
    'Java',
    'Go',
    'Rust',
    'Docker',
    'Kubernetes',
    'AWS',
    'Azure',
    'GCP',
    'Firebase',
    'MongoDB',
    'PostgreSQL',
    'MySQL',
    'Redis',
    'Elasticsearch',
    'GraphQL',
    'REST',
    'gRPC',
    'WebSocket',
    'HTTP',
    'HTTPS',
    'CSS',
    'SCSS',
    'Tailwind',
    'Bootstrap',
    'Material-UI',
    'Node.js',
    'Deno',
    'Express',
    'FastAPI',
    'Django',
    'Flask',
    'Git',
    'GitHub',
    'GitLab',
    'CI/CD',
    'DevOps',
    'Agile',
    'Machine Learning',
    'AI',
    'Deep Learning',
    'TensorFlow',
    'PyTorch'
  ]

  const count = Math.floor(Math.random() * 20) + 15 // 15-34个词汇
  const selectedTerms = techTerms.sort(() => 0.5 - Math.random()).slice(0, count)

  return selectedTerms.map((term) => ({
    label: term,
    value: Math.floor(Math.random() * 80) + 20 // 20-99的随机值
  }))
}

// 重新生成词汇数据
const regenerateWords = () => {
  dynamicWords.value = generateRandomWords()
}

// 事件处理
const onWordClick = (word: any) => {
  clickedWord.value = word
  console.log('点击词汇:', word)
}

const onWordHover = (word: any, isHover: boolean) => {
  console.log('悬停词汇:', word.label, '悬停状态:', isHover)
}

// 窗口大小变化监听
const handleResize = () => {
  screenWidth.value = window.innerWidth
  screenHeight.value = window.innerHeight
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 初始化动态数据
regenerateWords()
</script>

<style scoped>
.word-cloud-example {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.example-section {
  margin: 30px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fafafa;
}

.example-section h3 {
  margin-top: 0;
  color: #333;
}

.controls {
  margin: 30px 0;
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
}

.control-group {
  margin: 15px 0;
  display: flex;
  align-items: center;
  gap: 15px;
}

.control-group label {
  min-width: 120px;
  font-weight: 500;
}

.control-group input[type='range'] {
  flex: 1;
  max-width: 300px;
}

.regenerate-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
}

.regenerate-btn:hover {
  background: #0056b3;
}

.clicked-info {
  margin-top: 20px;
  padding: 15px;
  background: #e8f5e8;
  border: 1px solid #4caf50;
  border-radius: 5px;
}

.clicked-info h4 {
  margin-top: 0;
  color: #2e7d32;
}

.clicked-info p {
  margin: 5px 0;
  color: #1b5e20;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

h3 {
  color: #555;
  border-bottom: 2px solid #007bff;
  padding-bottom: 5px;
}

.description {
  font-style: italic;
  color: #666;
  margin-top: 10px;
  font-size: 14px;
}

.adaptive-container {
  border: 2px solid #007bff;
  border-radius: 8px;
  background: #f8f9fa;
  margin: 15px 0;
  transition: all 0.3s ease;
}

.adaptive-controls {
  margin-top: 15px;
  padding: 15px;
  background: #e9ecef;
  border-radius: 5px;
}

.control-group input[type="checkbox"] {
  margin-right: 8px;
}

.comparison-container {
  display: flex;
  gap: 20px;
  margin: 20px 0;
}

.comparison-item {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #fff;
}

.comparison-item h4 {
  margin: 0 0 15px 0;
  color: #333;
  text-align: center;
  font-size: 16px;
}

.responsive-container {
  width: 100%;
  overflow-x: auto;
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .word-cloud-example {
    padding: 10px;
  }
  
  .example-section {
    margin: 20px 0;
    padding: 15px;
  }
  
  .comparison-container {
    flex-direction: column;
    gap: 15px;
  }
  
  .comparison-item {
    padding: 10px;
  }
  
  .comparison-item h4 {
    font-size: 14px;
    margin-bottom: 10px;
  }
  
  .controls {
    padding: 15px;
  }
  
  .control-group {
    margin: 10px 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .control-group label {
    min-width: auto;
    font-size: 14px;
  }
  
  .control-group input[type="range"] {
    width: 100%;
    max-width: none;
  }
  
  .regenerate-btn {
    width: 100%;
    padding: 12px;
    font-size: 16px;
  }
  
  .clicked-info {
    margin: 15px 0;
    padding: 12px;
  }
  
  .clicked-info p {
    font-size: 14px;
  }
  
  .description {
    font-size: 13px;
  }
  
  h2 {
    font-size: 24px;
    margin-bottom: 20px;
  }
  
  h3 {
    font-size: 18px;
  }
}

/* 横屏移动端特殊优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .word-cloud-example {
    padding: 5px;
  }
  
  .example-section {
    margin: 10px 0;
    padding: 10px;
  }
  
  .comparison-container {
    flex-direction: row;
    gap: 10px;
  }
  
  .comparison-item {
    flex: 1;
    padding: 8px;
  }
  
  .comparison-item h4 {
    font-size: 12px;
    margin-bottom: 8px;
  }
  
  .controls {
    padding: 10px;
  }
  
  .control-group {
    margin: 8px 0;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  
  .control-group label {
    min-width: 120px;
    font-size: 12px;
  }
  
  .control-group input[type="range"] {
    flex: 1;
    max-width: 200px;
  }
  
  .regenerate-btn {
    width: auto;
    padding: 8px 16px;
    font-size: 14px;
  }
  
  .clicked-info {
    margin: 10px 0;
    padding: 8px;
  }
  
  .clicked-info p {
    font-size: 12px;
    margin: 2px 0;
  }
  
  .description {
    font-size: 12px;
    margin-top: 5px;
  }
  
  h2 {
    font-size: 20px;
    margin-bottom: 15px;
  }
  
  h3 {
    font-size: 16px;
    padding-bottom: 3px;
  }
}
</style>
