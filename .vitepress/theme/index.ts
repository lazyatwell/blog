import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import NewLayout from './components/NewLayout.vue'
import Archives from './components/Archives.vue'
import Category from './components/Category.vue'
import Tags from './components/Tags.vue'
import Page from './components/Page.vue'
import Comment from './components/CommentGiscus.vue'
import { CalendarDays, Tag } from 'lucide-vue-next'
// import SanpackPlugin from 'sandpack-vue3';
import './css/index.css'
import './css/custom.scss'

export default {
  ...DefaultTheme,
  Layout: NewLayout,
  enhanceApp({ app }) {
    // app.use(SanpackPlugin())
    // register global compoment
    app.component('Tags', Tags)
    app.component('Category', Category)
    app.component('Archives', Archives)
    app.component('Page', Page)
    app.component('Comment', Comment)
    // 全局图标组件
    app.component('CalendarDays', CalendarDays)
    app.component('Tag', Tag)
  }
} satisfies Theme
