import { defineConfig } from 'vitepress'
import { getPosts } from './theme/serverUtils'
import lightbox from 'vitepress-plugin-lightbox'

//每页的文章数量
const pageSize = 10

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  title: 'BluePen',
  lang: 'zh-CN',
  base: '/',
  cacheDir: './node_modules/vitepress_cache',
  description: 'vitepress-blog',
  outDir: './dist',
  ignoreDeadLinks: true,
  lastUpdated: true,
  cleanUrls: true,
  metaChunk: true,
  themeConfig: {
    logo: { src: '/logo.png', width: 24, height: 24 },
    posts: await getPosts(pageSize),
    website: 'https://github.com/lazyatwell/blog',
    // 评论的仓库地址 https://giscus.app/ 请按照这个官方初始化后覆盖
    comment: {
      repo: 'lazyatwell/blog',
      repoId: 'R_kgDOPm-RmQ',
      cate: 'General',
      categoryId: 'DIC_kwDOPm-Rmc4CuyUp'
    },
    search: {
      provider: 'local'
    }
  } as any,
  srcExclude: isProd
    ? [
        '**/trash/**/*.md', // 排除所有 trash 目录
        '**/draft/**/*.md', // 递归排除子目录
        '**/private-notes/*.md', // 排除特定文件
        'README.md'
      ]
    : ['README.md'],
  vite: {
    //build: { minify: false }
    server: { port: 5000 }
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'BluePen',
      themeConfig: {
        nav: [
          { text: '主页', link: '/' },
          { text: '分类', link: '/pages/category' },
          { text: '归档', link: '/pages/archives' },
          { text: '标签', link: '/pages/tags' },
          { text: '关于', link: '/pages/about' }
        ],
        docFooter: {
          prev: '上一页',
          next: '下一页'
        },
        lastUpdated: {
          text: '最后更新于'
        },
        outline: {
          label: '导航',
          level: [2, 4]
        },
        notFound: {
          title: '页面未找到',
          quote: '但如果你不改变方向，并且继续寻找，你可能最终会到达你所前往的地方。',
          linkLabel: '前往首页',
          linkText: '带我回首页'
        },

        langMenuLabel: '多语言',
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        skipToContentLabel: '跳转到内容'
      }
    }
    // en: {
    //     label: 'English',
    //     lang: 'en-US',
    //     title: 'BluePen',
    //     themeConfig: {
    //         nav: [
    //             { text: 'Home', link: '/en' },
    //             { text: 'Category', link: '/en/pages/category' },
    //             { text: 'Archives', link: '/en/pages/archives' },
    //             { text: 'Tags', link: '/en/pages/tags' },
    //             { text: 'About', link: '/en/pages/about' }
    //         ]
    //     }
    // }
  },
  markdown: {
    lineNumbers: true,
    config: (md) => {
      // Use lightbox plugin
      md.use(lightbox, {})
    },
    image: {
      // image lazy loading is disabled by default
      lazyLoading: true
    }
  }
})
