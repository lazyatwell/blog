# 词云组件 (WordCloud)

一个基于 Vue3 + TypeScript 开发的高性能词云组件，支持云朵形状排列、元素防重叠、动态大小缩放和随机颜色等功能。

## 特性

- ✨ **云朵形状排列**: 元素按照云朵形状在2D平面内排列
- 🚫 **防重叠算法**: 确保所有元素不会重叠，保持清晰可读
- 📏 **动态大小**: 元素大小根据value值线性增长
- 🎨 **哈希颜色**: 基于词汇内容生成固定且唯一的颜色
- 🔄 **智能旋转**: 元素支持基于哈希值的固定旋转角度，旋转后不会重叠或超出边界
- 📐 **自适应布局**: 支持自动适应父容器尺寸变化
- 🎯 **交互支持**: 支持点击和悬停事件
- ⚡ **高性能**: 优化的布局算法，快速渲染
- 📱 **响应式**: 支持动态调整尺寸

## 安装使用

### 基本使用

```vue
<template>
  <WordCloud 
    :wordCloud="words"
    :width="800"
    :height="600"
    :maxRotation="45"
    :autoResize="false"
    @wordClick="handleWordClick"
    @wordHover="handleWordHover"
  />
</template>

<script setup>
import WordCloud from './components/WordCloud/index.vue'

const words = [
  { label: 'Vue3', value: 95 },
  { label: 'TypeScript', value: 88 },
  { label: 'JavaScript', value: 92 },
  // ... 更多词汇
]

const handleWordClick = (word) => {
  console.log('点击了词汇:', word)
}

const handleWordHover = (word, isHover) => {
  console.log('悬停状态:', word.label, isHover)
}
</script>
```

## Props 属性

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `wordCloud` | `Array<{value: number, label: string}>` | - | **必需**，词汇数据数组 |
| `width` | `number` | `800` | 组件宽度（像素） |
| `height` | `number` | `600` | 组件高度（像素） |
| `minFontSize` | `number` | `12` | 最小字体大小（像素） |
| `maxFontSize` | `number` | `48` | 最大字体大小（像素） |
| `padding` | `number` | `5` | 元素间距（像素） |
| `autoResize` | `boolean` | `false` | 是否自动适应父容器尺寸 |
| `maxRotation` | `number` | `45` | 最大旋转角度（度数，0表示无旋转） |

## Events 事件

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `wordClick` | `(word: PositionedWord)` | 点击词汇时触发 |
| `wordHover` | `(word: PositionedWord, isHover: boolean)` | 悬停状态改变时触发 |

## 数据格式

### WordItem 接口

```typescript
interface WordItem {
  value: number  // 词汇权重值，影响字体大小
  label: string  // 词汇文本内容
}
```

### PositionedWord 接口

```typescript
interface PositionedWord extends WordItem {
  x: number          // X坐标位置
  y: number          // Y坐标位置
  fontSize: number   // 计算后的字体大小
  color: string      // 基于哈希值生成的固定颜色
  fontWeight: string // 字体粗细
  width: number      // 元素宽度
  height: number     // 元素高度
  rotation: number   // 基于哈希值生成的旋转角度
  rotatedWidth: number   // 旋转后的边界框宽度
  rotatedHeight: number  // 旋转后的边界框高度
}
```

## 算法说明

### 1. 云朵形状生成

使用多个正弦波叠加生成自然的云朵轮廓：

```typescript
// 生成云朵形状的坐标点
const generateCloudShape = (centerX: number, centerY: number, scale: number = 1) => {
  const points = []
  const numPoints = 200
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI
    
    // 使用多个正弦波叠加创建云朵形状
    let radius = 80 * scale
    radius += 20 * scale * Math.sin(3 * angle)
    radius += 15 * scale * Math.sin(5 * angle)
    radius += 10 * scale * Math.sin(7 * angle)
    radius += 8 * scale * Math.cos(4 * angle)
    
    // 添加随机性使形状更自然
    radius += (Math.random() - 0.5) * 10 * scale
    
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle) * 0.8 // 稍微压扁
    
    points.push({ x, y })
  }
  
  return points
}
```

### 2. 旋转感知的防重叠算法

采用旋转后边界框的碰撞检测，确保旋转元素不重叠：

```typescript
// 计算旋转后的边界框尺寸
const calculateRotatedBounds = (width: number, height: number, rotation: number) => {
  if (rotation === 0) return { width, height }
  
  const radians = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos
  }
}

// 使用旋转后的边界框进行碰撞检测
const isOverlapping = (word1, word2) => {
  const padding = props.padding
  return !(
    word1.x + word1.rotatedWidth / 2 + padding < word2.x - word2.rotatedWidth / 2 ||
    word2.x + word2.rotatedWidth / 2 + padding < word1.x - word1.rotatedWidth / 2 ||
    word1.y + word1.rotatedHeight / 2 + padding < word2.y - word2.rotatedHeight / 2 ||
    word2.y + word2.rotatedHeight / 2 + padding < word1.y - word1.rotatedHeight / 2
  )
}
```

### 3. 智能位置搜索策略

1. **优先云朵形状内**: 首先在云朵形状内随机搜索位置
2. **自适应搜索密度**: 旋转元素使用更密集的搜索策略
3. **螺旋搜索备选**: 如果云朵内无法放置，使用螺旋搜索算法
4. **重要性排序**: 按value值排序，优先放置重要词汇

```typescript
// 旋转元素需要更多尝试次数和更密集的搜索
const maxAttempts = word.rotation !== 0 ? 150 : 100
const spiralStep = word.rotation !== 0 ? 3 : 5
const maxSpiral = word.rotation !== 0 ? 80 : 50
```

### 4. 哈希颜色生成

基于词汇内容生成固定且唯一的颜色：

```typescript
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
  const hue = hash % 360
  const saturation = 60 + (hash % 30)
  const lightness = 45 + (hash % 20)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
```

### 5. 旋转角度生成

基于词汇内容生成固定的旋转角度：

```typescript
const generateHashRotation = (text: string): number => {
  const hash = stringToHash(text)
  // 生成-maxRotation到+maxRotation之间的角度
  const rotation = ((hash % (props.maxRotation * 2 + 1)) - props.maxRotation)
  return rotation
}
```

### 6. 大小计算

基于value值线性缩放字体大小：

```typescript
const calculateFontSize = (value: number, minValue: number, maxValue: number) => {
  if (maxValue === minValue) return props.minFontSize
  const ratio = (value - minValue) / (maxValue - minValue)
  return props.minFontSize + ratio * (props.maxFontSize - props.minFontSize)
}
```

### 7. 自适应布局

支持自动适应父容器尺寸变化：

```typescript
const updateContainerSize = () => {
  if (props.autoResize && containerRef.value) {
    const parent = containerRef.value.parentElement
    if (parent) {
      containerWidth.value = parent.clientWidth
      containerHeight.value = parent.clientHeight
    }
  }
}
```

## 样式定制

组件提供了基础样式，你可以通过CSS覆盖来定制外观：

```css
.word-cloud-container {
  /* 容器样式 */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.word-cloud-item {
  /* 词汇元素样式 */
  transition: all 0.3s ease;
  white-space: nowrap;
}

.word-cloud-item:hover {
  /* 悬停效果 */
  transform: translate(-50%, -50%) scale(1.1);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}
```

## 性能优化

- 使用Canvas API精确计算文本尺寸
- 优化的碰撞检测算法
- 响应式数据更新，避免不必要的重新计算
- 合理的搜索次数限制，防止无限循环
- 基于哈希值的颜色和旋转生成，确保一致性
- ResizeObserver监听容器变化，高效响应尺寸调整

## 示例

查看 `example.vue` 文件获取完整的使用示例，包括：

- 基本使用方法（固定颜色和旋转）
- 自适应父容器大小示例
- 大型数据集处理
- 动态参数控制（包括旋转角度控制）
- 事件处理示例

## 浏览器支持

- Chrome >= 60
- Firefox >= 55
- Safari >= 12
- Edge >= 79

## 许可证

MIT License
