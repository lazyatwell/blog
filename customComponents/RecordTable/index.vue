<template>
  <div class="record-table-container">
    <div class="calendar-wrapper">
      <!-- 星期标签列 -->
      <div class="weekday-column">
        <div class="month-spacer"></div>
        <div class="weekday-labels">
          <span
            v-for="(label, index) in weekdayLabels"
            :key="index"
            class="weekday-label"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="calendar-content">
        <!-- 月份标签行 -->
        <div class="month-labels">
          <span
            v-for="(month, index) in monthLabels"
            :key="index"
            class="month-label"
            :style="{ left: `${month.offset}px` }"
          >
            {{ month.name }}
          </span>
        </div>

        <!-- 日历格子（使用 CSS Grid） -->
        <div class="calendar-grid">
          <div
            v-for="dayOfWeek in 7"
            :key="dayOfWeek"
            class="calendar-row"
          >
            <div
              v-for="week in weeks"
              :key="week.weekIndex"
              class="cell-wrapper"
            >
              <!-- 有效日期的单元格 -->
              <div
                v-if="week.days[dayOfWeek - 1]"
                class="cell"
                :class="getCellClass(week.days[dayOfWeek - 1])"
                @mouseenter="handleMouseEnter($event, week.days[dayOfWeek - 1])"
                @mouseleave="handleMouseLeave"
              ></div>
              <!-- 无效日期不渲染 -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-show="tooltip.visible"
        class="record-tooltip"
        :style="tooltipPositionStyle"
        @mouseenter="handleTooltipEnter"
        @mouseleave="handleTooltipLeave"
      >
        <div class="tooltip-date">{{ tooltip.date }}</div>
        <div class="tooltip-count">{{ tooltip.count }} {{ i18n.records }}</div>
        <ul v-if="tooltip.items.length > 0" class="tooltip-list">
          <li v-for="(item, index) in tooltip.items" :key="index">
            <a
              v-if="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="tooltip-link"
              @click.stop
            >
              {{ item.text }}
            </a>
            <span v-else class="tooltip-text">{{ item.text }}</span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, PropType, ref, watch, onUnmounted } from 'vue'

// 数据类型定义
interface RecordItem {
  text: string
  url?: string
}

interface RecordData {
  [date: string]: RecordItem[]
}

interface DayCell {
  date: string
  dayOfWeek: number
  items: RecordItem[]
  count: number
}

interface WeekData {
  weekIndex: number
  days: (DayCell | null)[]
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  date: string
  count: number
  items: RecordItem[]
}

// 语言类型
type Locale = 'en' | 'zh'

// 国际化配置
const i18nConfig = {
  en: {
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    records: 'records',
    dateLocale: 'en-US'
  },
  zh: {
    weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    records: '条记录',
    dateLocale: 'zh-CN'
  }
}

// Props 定义
const props = defineProps({
  data: {
    type: Object as PropType<RecordData>,
    default: () => ({})
  },
  cellSize: {
    type: Number,
    default: 11
  },
  gap: {
    type: Number,
    default: 3
  },
  locale: {
    type: String as PropType<Locale>,
    default: 'en'
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  }
})

// 获取当前语言的国际化配置
const i18n = computed(() => i18nConfig[props.locale] || i18nConfig.en)

// 星期标签
const weekdayLabels = computed(() => i18n.value.weekdays)

// Tooltip 状态
const tooltip = reactive<TooltipState>({
  visible: false,
  x: 0,
  y: 0,
  date: '',
  count: 0,
  items: []
})

// 用于延迟隐藏 tooltip 的定时器
const hideTimeout = ref<number | null>(null)
// 标记鼠标是否在 tooltip 上
const isHoveringTooltip = ref(false)

// 计算单元格尺寸（包含 gap）
const cellTotalSize = computed(() => props.cellSize + props.gap)

// 计算 tooltip 位置样式（动态调整确保不超出视口，尽量靠近触发 cell）
const tooltipPositionStyle = computed(() => {
  const tooltipWidth = 280
  const tooltipMaxHeight = 250
  const offset = 8
  const margin = 10
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080

  let left = tooltip.x + offset
  let top = tooltip.y + offset

  // 计算可用空间
  const spaceRight = viewportWidth - tooltip.x - margin
  const spaceLeft = tooltip.x - margin
  const spaceBottom = viewportHeight - tooltip.y - margin
  const spaceTop = tooltip.y - margin

  // 水平定位：优先右侧，空间不够则左侧
  if (spaceRight >= tooltipWidth + offset) {
    left = tooltip.x + offset
  } else if (spaceLeft >= tooltipWidth + offset) {
    left = tooltip.x - tooltipWidth - offset
  } else {
    // 两侧空间都不够，贴近较大的一侧边缘
    left = spaceRight > spaceLeft ? viewportWidth - tooltipWidth - margin : margin
  }

  // 垂直定位：优先下方，空间不够则上方，都不够则贴近边缘
  if (spaceBottom >= tooltipMaxHeight + offset) {
    top = tooltip.y + offset
  } else if (spaceTop >= tooltipMaxHeight + offset) {
    top = tooltip.y - tooltipMaxHeight - offset
  } else {
    // 上下空间都不够，让 tooltip 尽量靠近 cell 并贴近边缘
    if (spaceBottom > spaceTop) {
      top = viewportHeight - tooltipMaxHeight - margin
    } else {
      top = margin
    }
  }

  // 最终边界检查
  left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin))
  top = Math.max(margin, top)

  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

// 获取滚动条宽度
const getScrollbarWidth = (): number => {
  if (typeof document === 'undefined') return 0
  return window.innerWidth - document.documentElement.clientWidth
}

// 需要补偿 padding-right 的 fixed 元素选择器
const FIXED_ELEMENTS_SELECTORS = [
  '.VPNav',
  'header[style*="fixed"]',
  '[style*="position: fixed"]'
]

// 保存原始 padding-right 值
let originalBodyPaddingRight = ''
const originalFixedPaddings = new Map<Element, string>()

// 锁定/解锁 body 滚动（补偿滚动条宽度，避免页面闪烁）
const lockBodyScroll = () => {
  if (typeof document === 'undefined') return

  const scrollbarWidth = getScrollbarWidth()
  if (scrollbarWidth <= 0) {
    document.body.style.overflow = 'hidden'
    return
  }

  // 保存并设置 body padding-right
  originalBodyPaddingRight = document.body.style.paddingRight
  document.body.style.overflow = 'hidden'
  document.body.style.paddingRight = `${scrollbarWidth}px`

  // 给所有 fixed 定位的元素添加 padding-right 补偿
  FIXED_ELEMENTS_SELECTORS.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const htmlEl = el as HTMLElement
      const computedStyle = getComputedStyle(htmlEl)
      if (computedStyle.position === 'fixed') {
        originalFixedPaddings.set(el, htmlEl.style.paddingRight)
        const currentPadding = parseInt(computedStyle.paddingRight) || 0
        htmlEl.style.paddingRight = `${currentPadding + scrollbarWidth}px`
      }
    })
  })
}

const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return

  // 恢复 body
  document.body.style.overflow = ''
  document.body.style.paddingRight = originalBodyPaddingRight

  // 恢复所有 fixed 元素的 padding-right
  originalFixedPaddings.forEach((originalPadding, el) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.paddingRight = originalPadding
  })
  originalFixedPaddings.clear()
}

// 监听 tooltip 显示状态，控制 body 滚动
watch(
  () => tooltip.visible,
  (visible) => {
    if (visible) {
      lockBodyScroll()
    } else {
      unlockBodyScroll()
    }
  }
)

// 组件卸载时恢复 body 滚动
onUnmounted(() => {
  unlockBodyScroll()
})

// 格式化日期为 YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化日期为显示格式
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }
  return date.toLocaleDateString(i18n.value.dateLocale, options)
}

// 获取周一作为一周开始时的星期几（0=周一, 6=周日）
const getMondayBasedDay = (date: Date): number => {
  const day = date.getDay()
  // 周日(0) -> 6, 周一(1) -> 0, 周二(2) -> 1, ...
  return day === 0 ? 6 : day - 1
}

// 计算指定年份的周数据（周一开始）
const weeks = computed<WeekData[]>(() => {
  const result: WeekData[] = []
  
  // 显示指定年份的 1月1日 到 12月31日
  const rangeStart = new Date(props.year, 0, 1)
  const rangeEnd = new Date(props.year, 11, 31)
  
  rangeStart.setHours(0, 0, 0, 0)
  rangeEnd.setHours(0, 0, 0, 0)

  // 调整到该周的周一
  const startDate = new Date(rangeStart)
  const dayOfWeekMondayBased = getMondayBasedDay(startDate)
  startDate.setDate(startDate.getDate() - dayOfWeekMondayBased)

  let currentDate = new Date(startDate)
  let weekIndex = 0

  while (currentDate <= rangeEnd) {
    const week: WeekData = {
      weekIndex,
      days: []
    }

    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(currentDate)

      // 超出年份范围的日期不渲染
      if (currentDate > rangeEnd || currentDate < rangeStart) {
        week.days.push(null)
      }
      // 年份范围内正常显示
      else {
        const items = props.data[dateStr] || []
        week.days.push({
          date: dateStr,
          dayOfWeek: d,
          items,
          count: items.length
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    result.push(week)
    weekIndex++
  }

  return result
})

// 计算月份标签
const monthLabels = computed(() => {
  const labels: { name: string; offset: number }[] = []
  const monthNames = i18n.value.months

  let lastMonth = -1

  weeks.value.forEach((week, weekIndex) => {
    // 找到该周的第一个有效日期
    const firstValidDay = week.days.find(day => day !== null)
    if (firstValidDay) {
      const date = new Date(firstValidDay.date)
      const month = date.getMonth()

      if (month !== lastMonth) {
        // 月份标签位置 = 周索引 * 单元格总宽度
        labels.push({
          name: monthNames[month],
          offset: weekIndex * cellTotalSize.value
        })
        lastMonth = month
      }
    }
  })
  
  if(labels.length > 0) {
    labels[0].offset = 0
  }

  return labels
})

// 根据记录数量获取颜色等级
const getCellClass = (day: DayCell | null): string => {
  if (!day) return 'level-0'

  const count = day.count
  if (count === 0) return 'level-0'
  if (count <= 2) return 'level-1'
  if (count <= 4) return 'level-2'
  if (count <= 6) return 'level-3'
  return 'level-4'
}

// 清除隐藏定时器
const clearHideTimeout = () => {
  if (hideTimeout.value !== null) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
}

// 鼠标进入单元格
const handleMouseEnter = (event: MouseEvent, day: DayCell | null) => {
  if (!day) return

  clearHideTimeout()

  tooltip.visible = true
  tooltip.x = event.clientX
  tooltip.y = event.clientY
  tooltip.date = formatDisplayDate(day.date)
  tooltip.count = day.count
  tooltip.items = day.items
}

// 鼠标离开单元格
const handleMouseLeave = () => {
  // 延迟隐藏，给用户时间移动到 tooltip 上
  hideTimeout.value = window.setTimeout(() => {
    if (!isHoveringTooltip.value) {
      tooltip.visible = false
    }
  }, 500)
}

// 鼠标进入 tooltip
const handleTooltipEnter = () => {
  clearHideTimeout()
  isHoveringTooltip.value = true
}

// 鼠标离开 tooltip
const handleTooltipLeave = () => {
  isHoveringTooltip.value = false
  tooltip.visible = false
}
</script>

<style lang="scss" scoped>
.record-table-container {
  display: inline-block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  margin-top: .5rem;

  // 蓝色主题颜色变量
  --color-level-0: #ebedf0;
  --color-level-1: #c6e0f5;
  --color-level-2: #79b8f8;
  --color-level-3: #3b82f6;
  --color-level-4: #1d4ed8;
  --cell-size: v-bind('cellSize + "px"');
  --cell-total-size: v-bind('cellTotalSize + "px"');
}

// 暗色模式适配
:root.dark .record-table-container,
.dark .record-table-container {
  --color-level-0: #2c2f34;
  --color-level-1: #0e4429;
  --color-level-2: #006d32;
  --color-level-3: #26a641;
  --color-level-4: #39d353;
}

.calendar-wrapper {
  display: flex;
  align-items: flex-start;
}

.weekday-column {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  margin-right: 8px;
}

// 月份标签占位，高度与月份标签行一致（加上下方间隙）
.month-spacer {
  height: 18px;
}

.weekday-labels {
  display: flex;
  flex-direction: column;
  gap: v-bind('gap + "px"');
}

.weekday-label {
  // 高度与单元格尺寸一致
  height: var(--cell-size);
  line-height: var(--cell-size);
  color: var(--vp-c-text-2, #57606a);
  font-size: 10px;
  text-align: right;
  white-space: nowrap;
  box-sizing: border-box;
}

.calendar-content {
  display: flex;
  flex-direction: column;
}

.month-labels {
  position: relative;
  height: 13px;
  margin-bottom: 5px;
}

.month-label {
  position: absolute;
  color: var(--vp-c-text-2, #57606a);
  font-size: 11px;
  white-space: nowrap;
  line-height: 13px;
}

// 使用 CSS Grid 替代 table
.calendar-grid {
  display: flex;
  flex-direction: column;
  gap: v-bind('gap + "px"');
}

.calendar-row {
  display: flex;
  gap: v-bind('gap + "px"');
}

.cell-wrapper {
  width: var(--cell-size);
  height: var(--cell-size);
  flex-shrink: 0;
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border-radius: 2px;
  cursor: pointer;
  transition: transform 0.1s ease;

  &:hover {
    transform: scale(1.2);
  }
}

.level-0 {
  background-color: var(--color-level-0);
}

.level-1 {
  background-color: var(--color-level-1);
}

.level-2 {
  background-color: var(--color-level-2);
}

.level-3 {
  background-color: var(--color-level-3);
}

.level-4 {
  background-color: var(--color-level-4);
}
</style>

<style lang="scss">
// Tooltip 样式（全局，因为使用 Teleport）
.record-tooltip {
  position: fixed;
  z-index: 9999;
  width: 280px;
  max-width: calc(100vw - 20px);
  padding: 10px 12px;
  background-color: #24292f;
  color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
  font-size: 12px;
  pointer-events: auto;
  box-sizing: border-box;

  .tooltip-date {
    font-weight: 600;
    margin-bottom: 4px;
    word-break: break-word;
  }

  .tooltip-count {
    color: #8b949e;
    margin-bottom: 8px;
  }

  .tooltip-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;

    // 默认隐藏滚动条，hover 时显示
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 3px;
      transition: background 0.2s ease;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    // Firefox 滚动条样式
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;

    &:hover {
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    li {
      padding: 4px 0;

      &:not(:first-child) {
        border-top: 1px solid #30363d;
      }
    }
  }

  .tooltip-link {
    color: #58a6ff;
    text-decoration: none;
    word-break: break-word;

    &:hover {
      text-decoration: underline;
    }
  }

  .tooltip-text {
    color: #c9d1d9;
    word-break: break-word;
  }
}

</style>