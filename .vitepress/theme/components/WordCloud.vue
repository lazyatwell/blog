<template>
  <div class="word-cloud-container" ref="cloudContainer">
    <div class="word-cloud" ref="wordCloud">
      <!-- 标签词云 -->
      <span 
        v-for="(tagData, index) in processedTags" 
        :key="tagData.name"
        @click="handleTagClick(tagData.name)"
        class="cloud-tag" 
        :class="{ active: activeTag === tagData.name }"
        :style="getTagStyle(tagData)"
      >
        {{ tagData.name }}
        <sup>{{ tagData.count }}</sup>
      </span>
      
      <!-- 空状态占位符 -->
      <div v-if="processedTags.length === 0 && !isLayouting" class="empty-state">
        <div class="empty-icon">🏷️</div>
        <div class="empty-text">暂无标签数据</div>
        <div class="empty-hint">标签将在文章加载完成后显示</div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="isLayouting" class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在生成词云...</div>
      </div>
    </div>
    
    <!-- 调试信息和控制面板 -->
    <div v-if="showDebugPanel" class="debug-panel">
      <div class="debug-controls">
        <label class="debug-switch">
          <input 
            type="checkbox" 
            v-model="useMockData" 
            @change="toggleMockData"
          />
          <span class="switch-slider"></span>
          使用模拟数据测试
        </label>
        <div class="debug-info">
          <span>标签数量: {{ processedTags.length }}</span>
          <span>布局状态: {{ isLayouting ? '计算中' : '完成' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick, onUnmounted, watch } from 'vue'

// Props定义
const props = defineProps({
  // 标签数据：{ tagName: posts[] }
  tags: {
    type: Object,
    default: () => ({})
  },
  // 当前激活的标签
  activeTag: {
    type: String,
    default: ''
  },
  // 是否显示调试面板
  showDebugPanel: {
    type: Boolean,
    default: false
  },
  // 云形状类型
  shapeType: {
    type: String,
    default: 'cloud', // 'cloud', 'circle', 'ellipse', 'rectangle'
    validator: (value) => ['cloud', 'circle', 'ellipse', 'rectangle'].includes(value)
  },
  // 最小和最大字体大小
  minFontSize: {
    type: Number,
    default: 0.5
  },
  maxFontSize: {
    type: Number,
    default: 2.5
  }
})

// Emits定义
const emit = defineEmits(['tag-click', 'layout-complete'])

// 响应式数据
const cloudContainer = ref(null)
const wordCloud = ref(null)
const useMockData = ref(false)

// 布局控制变量
let layoutTimer = null
let isLayouting = ref(false)
let lastContainerWidth = 0
let resizeObserver = null

// 模拟数据生成
const mockTags = computed(() => {
  if (!useMockData.value) return {}
  
  const mockData = {}
  const tagNames = [
    'JavaScript', 'Vue.js', 'React', 'TypeScript', 'Node.js', 'Python', 'CSS', 'HTML',
    'Webpack', 'Vite', 'Docker', 'Kubernetes', 'AWS', 'MongoDB', 'MySQL', 'Redis',
    'GraphQL', 'REST API', 'WebSocket', 'PWA', 'SSR', 'SPA', 'Microservices',
    'DevOps', 'CI/CD', 'Git', 'GitHub', 'GitLab', 'Nginx', 'Apache', 'Linux',
    'Windows', 'macOS', 'Android', 'iOS', 'Flutter', 'React Native', 'Electron',
    'TensorFlow', 'PyTorch', 'Machine Learning', 'AI', 'Data Science', 'Analytics',
    'Security', 'Authentication', 'Authorization', 'JWT', 'OAuth', 'HTTPS',
    'Performance', 'Optimization', 'SEO', 'Accessibility', 'UX', 'UI Design'
  ]
  
  tagNames.forEach(name => {
    // 生成1-20之间的随机文章数量
    const count = Math.floor(Math.random() * 20) + 1
    const posts = Array(count).fill(null).map((_, i) => ({
      frontMatter: { title: `${name} 文章 ${i + 1}` }
    }))
    mockData[name] = posts
  })
  
  return mockData
})

// 处理后的标签数据
const processedTags = computed(() => {
  const sourceData = useMockData.value ? mockTags.value : props.tags
  const tagEntries = Object.entries(sourceData || {})
  
  // 添加调试信息（仅在开发环境）
  if (tagEntries.length === 0) {
    if (import.meta.env.DEV) {
      console.warn('WordCloud: 没有标签数据', {
        useMockData: useMockData.value,
        propsTagsType: typeof props.tags,
        propsTagsKeys: props.tags ? Object.keys(props.tags) : 'undefined',
        sourceData: sourceData
      })
    }
    return []
  }
  
  const maxCount = Math.max(...tagEntries.map(([_, posts]) => posts.length))
  
  const result = tagEntries.map(([name, posts], index) => ({
    name,
    count: posts.length,
    maxCount,
    index,
    x: 0,
    y: 0,
    fontSize: calculateFontSize(posts.length, maxCount),
    placed: false
  }))
  
  if (import.meta.env.DEV) {
    console.log('WordCloud: 处理后的标签数据', {
      totalTags: result.length,
      sampleTag: result[0],
      allTags: result.map(t => ({ name: t.name, count: t.count }))
    })
  }
  
  return result
})

// 根据标签名称生成颜色的哈希函数
function getColorFromName(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // 生成HSL颜色，确保颜色鲜艳且可读
  const hue = Math.abs(hash) % 360
  const saturation = 60 + (Math.abs(hash) % 40) // 60-100%
  const lightness = 45 + (Math.abs(hash) % 20)  // 45-65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// 根据数量计算字体大小
function calculateFontSize(count, maxCount) {
  if (maxCount === 1) return props.minFontSize
  const ratio = count / maxCount
  return props.minFontSize + (props.maxFontSize - props.minFontSize) * Math.pow(ratio, 0.7)
}

// 生成不同形状的点
function generateShapePoints(width, height, shapeType = 'cloud', numPoints = 180) {
  const points = []
  const centerX = width / 2
  const centerY = height / 2
  
  // 矩形形状使用网格布局，其他形状使用优化的圆形布局
  if (shapeType === 'rectangle') {
    // 矩形布局：创建网格点，最大化利用容器空间
    const padding = 20
    const gridCols = Math.ceil(Math.sqrt(numPoints * (width / height)))
    const gridRows = Math.ceil(numPoints / gridCols)
    const cellWidth = (width - 2 * padding) / gridCols
    const cellHeight = (height - 2 * padding) / gridRows
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (points.length >= numPoints) break
        
        // 在每个网格单元内添加一些随机偏移，避免过于规整
        const offsetX = (Math.random() - 0.5) * cellWidth * 0.3
        const offsetY = (Math.random() - 0.5) * cellHeight * 0.3
        
        const x = padding + col * cellWidth + cellWidth / 2 + offsetX
        const y = padding + row * cellHeight + cellHeight / 2 + offsetY
        
        points.push({ x, y, angle: 0, radius: 0 })
      }
      if (points.length >= numPoints) break
    }
  } else {
    // 优化的形状布局：减少上下留白，提高空间利用率
    const padding = 15 // 减少边距
    const effectiveWidth = width - 2 * padding
    const effectiveHeight = height - 2 * padding
    
    // 根据形状类型计算更紧凑的半径
    let baseRadiusX, baseRadiusY
    
    switch (shapeType) {
      case 'cloud':
        baseRadiusX = effectiveWidth * 0.42  // 增加水平半径
        baseRadiusY = effectiveHeight * 0.45 // 增加垂直半径
        break
      case 'circle':
        baseRadiusX = Math.min(effectiveWidth, effectiveHeight) * 0.45
        baseRadiusY = baseRadiusX
        break
      case 'ellipse':
        baseRadiusX = effectiveWidth * 0.45
        baseRadiusY = effectiveHeight * 0.35
        break
      default:
        baseRadiusX = effectiveWidth * 0.4
        baseRadiusY = effectiveHeight * 0.4
    }
    
    // 生成多层次的点分布，提高密度
    const layers = 3 // 增加层数
    const pointsPerLayer = Math.ceil(numPoints / layers)
    
    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = 0.3 + (layer / (layers - 1)) * 0.7 // 从30%到100%
      const layerPoints = layer === layers - 1 ? numPoints - points.length : pointsPerLayer
      
      for (let i = 0; i < layerPoints; i++) {
        const angle = (i / layerPoints) * 2 * Math.PI + (layer * 0.5) // 层间错位
        let radiusX = baseRadiusX * layerRadius
        let radiusY = baseRadiusY * layerRadius
        
        // 根据形状类型应用变形
        switch (shapeType) {
          case 'cloud':
            // 云朵形状：多个正弦波叠加，但保持更紧凑
            const variation = 1 + 
              0.25 * Math.sin(angle * 3) + 
              0.15 * Math.sin(angle * 7) + 
              0.08 * Math.sin(angle * 13) +
              0.04 * Math.sin(angle * 17)
            radiusX *= variation
            radiusY *= variation * 0.9 // 稍微压扁但不过度
            break
          case 'circle':
            // 圆形：保持圆形比例
            break
          case 'ellipse':
            // 椭圆形：水平拉伸
            radiusX *= (1 + 0.3 * Math.cos(angle * 2))
            break
        }
        
        const x = centerX + radiusX * Math.cos(angle)
        const y = centerY + radiusY * Math.sin(angle)
        
        // 确保点在有效范围内
        if (x >= padding && x <= width - padding && 
            y >= padding && y <= height - padding) {
          points.push({ x, y, angle, radius: Math.sqrt(radiusX * radiusX + radiusY * radiusY) })
        }
      }
    }
    
    // 在形状内部添加填充点，进一步减少空白
    const fillPoints = Math.min(60, numPoints * 0.3)
    for (let i = 0; i < fillPoints; i++) {
      const angle = Math.random() * 2 * Math.PI
      const radiusRatio = Math.random() * 0.6 // 内部区域
      const radiusX = baseRadiusX * radiusRatio
      const radiusY = baseRadiusY * radiusRatio
      
      let x = centerX + radiusX * Math.cos(angle)
      let y = centerY + radiusY * Math.sin(angle)
      
      // 应用形状变形
      if (shapeType === 'cloud') {
        const variation = 1 + 0.1 * Math.sin(angle * 5)
        x = centerX + (x - centerX) * variation
        y = centerY + (y - centerY) * variation * 0.95
      }
      
      if (x >= padding && x <= width - padding && 
          y >= padding && y <= height - padding) {
        points.push({ x, y, angle, radius: radiusRatio })
      }
    }
  }
  
  return points
}

// 改进的重叠检测算法
function isOverlapping(rect1, rect2, padding = 8) {
  return !(rect1.right + padding < rect2.left || 
           rect2.right + padding < rect1.left || 
           rect1.bottom + padding < rect2.top || 
           rect2.bottom + padding < rect1.top)
}

// 计算文本实际尺寸（更精确的估算）
function calculateTextDimensions(text, fontSize) {
  // 创建临时canvas来测量文本尺寸
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  context.font = `${fontSize * 16}px Inter, system-ui, sans-serif`
  
  const metrics = context.measureText(text)
  const width = metrics.width + 24 // 加上padding
  const height = fontSize * 16 * 1.4 // 行高
  
  return { width, height }
}

// 改进的布局算法 - 确保所有标签都能正确放置
function performLayout() {
  if (!cloudContainer.value || !wordCloud.value) {
    if (import.meta.env.DEV) {
      console.warn('WordCloud: 容器元素不可用')
    }
    return
  }
  
  // 检查是否有数据需要布局
  if (processedTags.value.length === 0) {
    if (import.meta.env.DEV) {
      console.warn('WordCloud: 没有标签数据需要布局')
    }
    isLayouting.value = false
    return
  }
  
  isLayouting.value = true
  if (import.meta.env.DEV) {
    console.log('WordCloud: 开始布局计算', { tagCount: processedTags.value.length })
  }
  
  try {
    // 确保容器已完全渲染，获取准确的尺寸
    const containerRect = cloudContainer.value.getBoundingClientRect()
    let width = containerRect.width
    
    // 如果容器宽度为0，可能是因为DOM还未完全渲染，使用回退方案
    if (width <= 0) {
      width = cloudContainer.value.offsetWidth || cloudContainer.value.clientWidth || 800
      if (import.meta.env.DEV) {
        console.warn('WordCloud: 容器宽度获取异常，使用回退值:', width)
      }
    }
    
    // 计算所有标签的尺寸，用于动态调整容器高度
    const tagDimensions = processedTags.value.map(tag => ({
      ...tag,
      dimensions: calculateTextDimensions(`${tag.name} ${tag.count}`, tag.fontSize)
    }))
    
    // 估算所需的最小高度
    const totalTagArea = tagDimensions.reduce((sum, tag) => 
      sum + tag.dimensions.width * tag.dimensions.height, 0)
    const estimatedHeight = Math.sqrt(totalTagArea * 2) // 考虑间距的粗略估算
    
    const minHeight = 350
    let height
    
    // 根据形状类型优化高度计算
    if (props.shapeType === 'rectangle') {
      // 矩形布局：使用更大的初始高度
      height = Math.max(minHeight, estimatedHeight * 1.2)
    } else {
      // 非矩形布局：减少高度以减少留白，更紧凑的布局
      const compactHeight = width * 0.5 // 减少高宽比
      height = Math.max(minHeight * 0.8, compactHeight, estimatedHeight * 0.9)
    }
    
    if (import.meta.env.DEV) {
      console.log('WordCloud: 容器尺寸', { 
        width, 
        height, 
        estimatedHeight, 
        totalTagArea, 
        containerRect 
      })
    }
    
    // 尝试布局，如果失败则增加高度重试
    let layoutSuccess = false
    let attempts = 0
    const maxAttempts = 3
    
    while (!layoutSuccess && attempts < maxAttempts) {
      attempts++
      
      // 设置容器高度
      if (wordCloud.value.style.height !== height + 'px') {
        wordCloud.value.style.height = height + 'px'
        // 强制重新计算布局
        wordCloud.value.offsetHeight
      }
      
      const shapePoints = generateShapePoints(width, height, props.shapeType)
      const placedRects = []
      
      // 按字体大小排序，大的先放置
      const sortedTags = [...tagDimensions]
        .sort((a, b) => b.fontSize - a.fontSize)
        .map(tag => ({ ...tag, placed: false }))
      
      // 重置所有标签位置
      sortedTags.forEach(tag => {
        tag.x = 0
        tag.y = 0
        tag.placed = false
      })
      
      let unplacedTags = 0
      
      // 放置每个标签
      for (const tagData of sortedTags) {
        const textDimensions = tagData.dimensions
        let placed = false
        
        // 第一轮：尝试在形状点上放置
        for (let i = 0; i < shapePoints.length && !placed; i++) {
          const point = shapePoints[i]
          const x = point.x - textDimensions.width / 2
          const y = point.y - textDimensions.height / 2
          
          const newRect = {
            left: x,
            top: y,
            right: x + textDimensions.width,
            bottom: y + textDimensions.height
          }
          
          // 检查边界和重叠
          if (newRect.left >= 10 && newRect.right <= width - 10 && 
              newRect.top >= 10 && newRect.bottom <= height - 10 &&
              !placedRects.some(rect => isOverlapping(newRect, rect))) {
            
            tagData.x = x
            tagData.y = y
            tagData.placed = true
            placedRects.push(newRect)
            placed = true
            break
          }
        }
        
        // 第二轮：使用改进的螺旋算法或网格填充
        if (!placed) {
          if (props.shapeType === 'rectangle') {
            // 矩形布局：使用网格填充剩余空间
            placed = tryGridPlacement(tagData, textDimensions, width, height, placedRects)
          } else {
            // 其他形状：使用螺旋算法
            placed = trySpiralPlacement(tagData, textDimensions, width, height, placedRects)
          }
        }
        
        // 第三轮：扩展搜索区域
        if (!placed) {
          placed = tryExtendedPlacement(tagData, textDimensions, width, height, placedRects)
        }
        
        if (!placed) {
          unplacedTags++
        }
      }
      
      // 如果所有标签都成功放置，或者是最后一次尝试，则完成布局
      if (unplacedTags === 0 || attempts >= maxAttempts) {
        layoutSuccess = true
        
        // 如果仍有未放置的标签，增加容器高度并启用滚动
        if (unplacedTags > 0) {
          height = height * 1.5 // 增加50%的高度
          wordCloud.value.style.height = height + 'px'
          
          // 启用滚动条
          cloudContainer.value.style.overflowY = 'auto'
          cloudContainer.value.style.maxHeight = Math.min(height, window.innerHeight * 0.8) + 'px'
          
          // 强制放置剩余标签
          for (const tagData of sortedTags) {
            if (!tagData.placed) {
              forceTagPlacement(tagData, tagData.dimensions, width, height, placedRects)
            }
          }
          
          if (import.meta.env.DEV) {
            console.warn(`WordCloud: 有 ${unplacedTags} 个标签需要强制放置，已启用滚动条`)
          }
        } else {
          // 所有标签都成功放置，禁用滚动条
          cloudContainer.value.style.overflowY = 'hidden'
          cloudContainer.value.style.maxHeight = 'none'
        }
      } else {
        // 增加高度重试
        height = height * 1.3
        if (import.meta.env.DEV) {
          console.log(`WordCloud: 第${attempts}次布局尝试，有${unplacedTags}个未放置标签，增加高度到${height}px`)
        }
      }
      
      // 更新原始数据
      sortedTags.forEach(sortedTag => {
        const originalTag = processedTags.value.find(t => t.name === sortedTag.name)
        if (originalTag) {
          originalTag.x = sortedTag.x
          originalTag.y = sortedTag.y
          originalTag.placed = sortedTag.placed
        }
      })
      
      // 对于非矩形布局，根据实际放置的标签优化容器高度
      if (layoutSuccess && unplacedTags === 0 && props.shapeType !== 'rectangle') {
        const actualBounds = calculateActualBounds(placedRects)
        const optimalHeight = actualBounds.maxY + 40 // 添加底部边距
        
        if (optimalHeight < height * 0.9 && optimalHeight >= minHeight * 0.8) {
          height = optimalHeight
          wordCloud.value.style.height = height + 'px'
          
          if (import.meta.env.DEV) {
            console.log(`WordCloud: 优化容器高度为 ${height}px，减少留白`)
          }
        }
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('WordCloud: 布局完成', {
        totalTags: processedTags.value.length,
        placedTags: processedTags.value.filter(t => t.placed).length,
        attempts,
        finalHeight: height,
        containerSize: { width, height }
      })
    }
    
    emit('layout-complete', {
      totalTags: processedTags.value.length,
      placedTags: processedTags.value.filter(t => t.placed).length,
      containerSize: { width, height },
      hasScrollbar: cloudContainer.value.style.overflowY === 'auto'
    })
    
  } finally {
    isLayouting.value = false
  }
}

// 计算已放置标签的实际边界
function calculateActualBounds(placedRects) {
  if (placedRects.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  
  const bounds = {
    minX: Math.min(...placedRects.map(rect => rect.left)),
    minY: Math.min(...placedRects.map(rect => rect.top)),
    maxX: Math.max(...placedRects.map(rect => rect.right)),
    maxY: Math.max(...placedRects.map(rect => rect.bottom))
  }
  
  return bounds
}

// 网格填充放置策略（用于矩形布局）
function tryGridPlacement(tagData, textDimensions, width, height, placedRects) {
  const padding = 10
  const stepX = 20
  const stepY = 20
  
  for (let y = padding; y <= height - textDimensions.height - padding; y += stepY) {
    for (let x = padding; x <= width - textDimensions.width - padding; x += stepX) {
      const newRect = {
        left: x,
        top: y,
        right: x + textDimensions.width,
        bottom: y + textDimensions.height
      }
      
      if (!placedRects.some(rect => isOverlapping(newRect, rect))) {
        tagData.x = x
        tagData.y = y
        tagData.placed = true
        placedRects.push(newRect)
        return true
      }
    }
  }
  return false
}

// 螺旋放置策略（用于圆形布局）
function trySpiralPlacement(tagData, textDimensions, width, height, placedRects) {
  const centerX = width / 2
  const centerY = height / 2
  let radius = 20 // 从更小的半径开始
  let angle = 0
  
  // 根据容器尺寸动态计算最大半径，减少留白
  const maxRadiusX = (width - textDimensions.width) * 0.45
  const maxRadiusY = (height - textDimensions.height) * 0.45
  const maxRadius = Math.min(maxRadiusX, maxRadiusY)
  
  const angleStep = 0.15 // 更密集的角度步长
  const radiusStep = 2   // 更小的半径步长
  
  while (radius < maxRadius) {
    // 椭圆形螺旋，更好地利用容器空间
    const radiusX = radius * (width / height > 1 ? 1.2 : 1)
    const radiusY = radius * (height / width > 1 ? 1.2 : 1)
    
    const x = centerX + radiusX * Math.cos(angle) - textDimensions.width / 2
    const y = centerY + radiusY * Math.sin(angle) - textDimensions.height / 2
    
    const newRect = {
      left: x,
      top: y,
      right: x + textDimensions.width,
      bottom: y + textDimensions.height
    }
    
    if (x >= 5 && x + textDimensions.width <= width - 5 && 
        y >= 5 && y + textDimensions.height <= height - 5 &&
        !placedRects.some(rect => isOverlapping(newRect, rect))) {
      
      tagData.x = x
      tagData.y = y
      tagData.placed = true
      placedRects.push(newRect)
      return true
    }
    
    angle += angleStep
    if (angle > 2 * Math.PI) {
      angle = Math.random() * 0.5 // 添加随机偏移避免死循环
      radius += radiusStep
    }
  }
  return false
}

// 扩展搜索区域放置策略
function tryExtendedPlacement(tagData, textDimensions, width, height, placedRects) {
  const centerX = width / 2 - textDimensions.width / 2
  const centerY = height / 2 - textDimensions.height / 2
  
  // 从中心开始，向外扩展搜索
  let offsetX = 0
  let offsetY = 0
  const step = 5
  const maxOffset = Math.max(width, height) / 4
  
  while (offsetX < maxOffset && offsetY < maxOffset) {
    // 尝试四个方向的偏移
    for (const [dx, dy] of [[offsetX, offsetY], [-offsetX, offsetY], [offsetX, -offsetY], [-offsetX, -offsetY]]) {
      const x = centerX + dx
      const y = centerY + dy
      
      const newRect = {
        left: x,
        top: y,
        right: x + textDimensions.width,
        bottom: y + textDimensions.height
      }
      
      if (x >= 0 && x + textDimensions.width <= width && 
          y >= 0 && y + textDimensions.height <= height &&
          !placedRects.some(rect => isOverlapping(newRect, rect, 5))) {
        
        tagData.x = x
        tagData.y = y
        tagData.placed = true
        placedRects.push(newRect)
        return true
      }
    }
    offsetX += step
    offsetY += step
  }
  return false
}

// 强制放置标签（确保所有标签都被放置）
function forceTagPlacement(tagData, textDimensions, width, height, placedRects) {
  // 计算已放置标签的最大Y坐标
  const maxY = placedRects.length > 0 
    ? Math.max(...placedRects.map(rect => rect.bottom)) 
    : 20
  
  // 在最后一行下方放置标签
  const x = 20
  const y = maxY + 20
  
  const newRect = {
    left: x,
    top: y,
    right: x + textDimensions.width,
    bottom: y + textDimensions.height
  }
  
  tagData.x = x
  tagData.y = y
  tagData.placed = true
  placedRects.push(newRect)
  
  if (import.meta.env.DEV) {
    console.log(`WordCloud: 强制放置标签 "${tagData.name}" 在位置 (${x}, ${y})`)
  }
}

// 防抖布局函数
function layoutTags() {
  if (!cloudContainer.value || !wordCloud.value || isLayouting.value) return
  
  if (layoutTimer) {
    clearTimeout(layoutTimer)
  }
  
  layoutTimer = setTimeout(() => {
    // 再次检查容器是否可用，确保布局时机正确
    if (!cloudContainer.value || !wordCloud.value) {
      setTimeout(() => layoutTags(), 100)
      return
    }
    
    // 检查容器是否已渲染完成
    const rect = cloudContainer.value.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      setTimeout(() => layoutTags(), 100)
      return
    }
    
    performLayout()
  }, 150)
}

// 获取标签样式
function getTagStyle(tagData) {
  return {
    position: 'absolute',
    left: tagData.x + 'px',
    top: tagData.y + 'px',
    fontSize: tagData.fontSize + 'rem',
    color: getColorFromName(tagData.name),
    transform: 'translate(0, 0)',
    transition: 'all 0.3s ease',
    opacity: tagData.placed !== false ? 1 : 0.5
  }
}

// 处理标签点击
function handleTagClick(tagName) {
  emit('tag-click', tagName)
}

// 切换模拟数据
function toggleMockData() {
  nextTick(() => {
    layoutTags()
  })
}

// 节流的resize处理函数
function handleResize() {
  if (!cloudContainer.value) return
  
  const currentWidth = cloudContainer.value.getBoundingClientRect().width
  
  if (Math.abs(currentWidth - lastContainerWidth) > 15) {
    lastContainerWidth = currentWidth
    layoutTags()
  }
}

// 监听数据变化
watch(() => props.tags, () => {
  nextTick(() => {
    layoutTags()
  })
}, { deep: true, immediate: true })

watch(() => props.shapeType, () => {
  layoutTags()
})

// 监听 processedTags 变化
watch(processedTags, (newTags, oldTags) => {
  if (newTags.length > 0 && newTags.length !== (oldTags ? oldTags.length : 0)) {
    nextTick(() => {
      layoutTags()
    })
  }
}, { deep: true })

// 生命周期
onMounted(() => {
  // 使用多重延迟确保DOM完全渲染
  nextTick(() => {
    // 第一次检查
    setTimeout(() => {
      if (cloudContainer.value) {
        const rect = cloudContainer.value.getBoundingClientRect()
        lastContainerWidth = rect.width
        
        // 如果容器还未渲染完成，再次延迟
        if (rect.width <= 0) {
          setTimeout(() => {
            if (cloudContainer.value) {
              lastContainerWidth = cloudContainer.value.getBoundingClientRect().width
              layoutTags()
            }
          }, 200)
        } else {
          layoutTags()
        }
      }
    }, 50)
  })
  
  // 监听容器大小变化
  nextTick(() => {
    if (cloudContainer.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect
          if (Math.abs(width - lastContainerWidth) > 15) {
            lastContainerWidth = width
            layoutTags()
            break
          }
        }
      })
      resizeObserver.observe(cloudContainer.value)
    }
  })
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (layoutTimer) {
    clearTimeout(layoutTimer)
    layoutTimer = null
  }
  
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
// 词云容器样式
.word-cloud-container {
  width: 100%;
  min-height: 350px;
  position: relative;
  overflow: hidden; // 默认隐藏滚动条，由JS动态控制
  border-radius: 12px;
  background: linear-gradient(135deg, 
    rgba(var(--vp-c-bg-alt-rgb, 248, 248, 248), 0.4) 0%, 
    rgba(var(--vp-c-bg-alt-rgb, 248, 248, 248), 0.1) 100%
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--vp-c-divider-rgb, 229, 229, 229), 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  
  // 确保容器在初始化时有稳定的尺寸
  contain: layout style;
  will-change: auto;
  
  // 滚动条样式优化
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(var(--vp-c-bg-alt-rgb, 248, 248, 248), 0.3);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(var(--vp-c-text-2-rgb, 100, 100, 100), 0.3);
    border-radius: 4px;
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(var(--vp-c-text-2-rgb, 100, 100, 100), 0.5);
    }
  }
  
  // 平滑滚动
  scroll-behavior: smooth;
}

.word-cloud {
  position: relative;
  width: 100%;
  min-height: 350px;
  padding: 20px;
  box-sizing: border-box;
}

// 词云标签样式
.cloud-tag {
  display: inline-block;
  padding: 6px 14px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  user-select: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-family: 'Inter', system-ui, sans-serif;
  
  // 悬停效果
  &:hover {
    transform: scale(1.05) translateZ(0);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    background-color: rgba(255, 255, 255, 0.95);
    z-index: 10;
  }
  
  // 激活状态
  &.active {
    background: linear-gradient(135deg, 
      var(--vp-c-brand) 0%, 
      var(--vp-c-brand-darker, #3451b2) 100%
    );
    color: white !important;
    transform: scale(1.08);
    box-shadow: 0 6px 25px rgba(var(--vp-c-brand-rgb, 60, 60, 60), 0.4);
    z-index: 20;
    
    sup {
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }
  
  sup {
    font-size: 0.7em;
    font-weight: bold;
    opacity: 0.8;
    margin-left: 3px;
  }
}

// 空状态样式
.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--vp-c-text-2);
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }
  
  .empty-text {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--vp-c-text-1);
  }
  
  .empty-hint {
    font-size: 0.9rem;
    opacity: 0.7;
  }
}

// 加载状态样式
.loading-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--vp-c-text-2);
  
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--vp-c-divider);
    border-top: 3px solid var(--vp-c-brand);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  .loading-text {
    font-size: 0.9rem;
    color: var(--vp-c-text-2);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 调试面板
.debug-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(var(--vp-c-bg-rgb, 255, 255, 255), 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(var(--vp-c-divider-rgb, 229, 229, 229), 0.3);
  font-size: 0.75rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.debug-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.debug-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--vp-c-text-1);
  
  input[type="checkbox"] {
    display: none;
  }
  
  .switch-slider {
    position: relative;
    width: 32px;
    height: 18px;
    background-color: var(--vp-c-bg-alt);
    border-radius: 18px;
    transition: 0.3s;
    border: 1px solid var(--vp-c-divider);
    
    &::before {
      content: '';
      position: absolute;
      height: 14px;
      width: 14px;
      left: 2px;
      top: 1px;
      background-color: white;
      border-radius: 50%;
      transition: 0.3s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }
  
  input:checked + .switch-slider {
    background-color: var(--vp-c-brand);
    
    &::before {
      transform: translateX(14px);
    }
  }
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
  
  span {
    white-space: nowrap;
  }
}

// 响应式设计
@media screen and (max-width: 768px) {
  .word-cloud-container {
    min-height: 280px;
    border-radius: 8px;
  }
  
  .word-cloud {
    min-height: 280px;
    padding: 15px;
  }
  
  .cloud-tag {
    padding: 4px 10px;
    
    &:hover {
      transform: scale(1.03) translateZ(0);
    }
    
    &.active {
      transform: scale(1.06);
    }
  }
  
  .debug-panel {
    top: 5px;
    right: 5px;
    padding: 8px;
  }
}

@media screen and (max-width: 480px) {
  .word-cloud-container {
    min-height: 240px;
  }
  
  .word-cloud {
    min-height: 240px;
    padding: 10px;
  }
  
  .cloud-tag {
    padding: 3px 8px;
  }
}

// 深色模式适配
@media (prefers-color-scheme: dark) {
  .word-cloud-container {
    background: linear-gradient(135deg, 
      rgba(var(--vp-c-bg-alt-rgb, 30, 30, 30), 0.5) 0%, 
      rgba(var(--vp-c-bg-alt-rgb, 30, 30, 30), 0.2) 100%
    );
    border-color: rgba(var(--vp-c-divider-rgb, 82, 82, 82), 0.4);
    
    // 深色模式滚动条样式
    &::-webkit-scrollbar-track {
      background: rgba(var(--vp-c-bg-alt-rgb, 30, 30, 30), 0.4);
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(var(--vp-c-text-2-rgb, 200, 200, 200), 0.3);
      
      &:hover {
        background: rgba(var(--vp-c-text-2-rgb, 200, 200, 200), 0.5);
      }
    }
  }
  
  .cloud-tag {
    background-color: rgba(var(--vp-c-bg-rgb, 26, 26, 26), 0.9);
    border-color: rgba(var(--vp-c-divider-rgb, 82, 82, 82), 0.4);
    
    &:hover {
      background-color: rgba(var(--vp-c-bg-rgb, 26, 26, 26), 0.95);
    }
  }
  
  .debug-panel {
    background: rgba(var(--vp-c-bg-rgb, 26, 26, 26), 0.95);
    border-color: rgba(var(--vp-c-divider-rgb, 82, 82, 82), 0.4);
  }
}
</style>
