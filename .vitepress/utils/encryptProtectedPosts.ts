import { globby } from 'globby'
import matter from 'gray-matter'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { normalizeRoute } from './protectedRoute'

const require = createRequire(import.meta.url)

// staticrypt 的 CLI 入口，通过 node 直接调用以保证跨平台（Windows 无需 .cmd 包装）
const staticryptCli = require.resolve('staticrypt/cli/index.js')

export interface ProtectedPost {
  /** 源 md 路径，如 posts/2026/02/foo.md */
  mdPath: string
  /** 相对 outDir 的 html 路径，如 posts/2026/02/foo.html */
  htmlRel: string
  /** 归一化后的路由，用于客户端匹配，如 posts/2026/02/foo */
  route: string
  /** frontmatter 中的密码 */
  passwd: string
}

/**
 * 扫描所有文章，返回 frontmatter 中含有非空 passwd 字段的文章信息。
 * 生产构建会跳过 draft / private-notes / trash（这些目录不会生成 html）。
 */
export async function getProtectedPosts(): Promise<ProtectedPost[]> {
  const isProd = process.env.NODE_ENV === 'production'
  const ignore = isProd
    ? ['posts/draft/**/*.md', 'posts/private-notes/**/*.md', 'posts/trash/**/*.md']
    : []

  const mdPaths = await globby(['posts/**/*.md'], { ignore })

  const result: ProtectedPost[] = []
  for (const mdPath of mdPaths) {
    const content = fs.readFileSync(mdPath, 'utf-8')
    const { data } = matter(content)

    const passwd = data?.passwd
    if (passwd === undefined || passwd === null || String(passwd).trim() === '') {
      continue
    }

    const htmlRel = mdPath.replace(/\.md$/, '.html')
    result.push({
      mdPath,
      htmlRel,
      route: normalizeRoute('/' + htmlRel),
      passwd: String(passwd)
    })
  }
  return result
}

/**
 * 仅返回受保护文章的归一化路由列表，供 themeConfig 暴露给客户端使用。
 */
export async function getProtectedRoutes(): Promise<string[]> {
  return (await getProtectedPosts()).map((p) => p.route)
}

/**
 * 构建结束后，对受密码保护的文章生成的 html 文件，
 * 使用 staticrypt 进行 AES-256 密码加密（原地覆盖）。
 *
 * @param outDir vitepress 的输出目录（绝对或相对路径），如 ./dist
 */
export async function encryptProtectedPosts(outDir: string) {
  const posts = await getProtectedPosts()

  let encrypted = 0
  for (const { mdPath, htmlRel, passwd } of posts) {
    const htmlPath = path.resolve(outDir, htmlRel)

    if (!fs.existsSync(htmlPath)) {
      console.warn(`[staticrypt] 跳过 ${mdPath}：未找到对应的 html（${htmlPath}）`)
      continue
    }

    // -d 指向 html 所在目录即可原地覆盖；--short 允许短密码（绕过 14 位强制提示）
    execFileSync(
      process.execPath,
      [
        staticryptCli,
        htmlPath,
        '-p',
        passwd,
        '-d',
        path.dirname(htmlPath),
        '--short',
        '--remember',
        'false'
      ],
      { stdio: 'pipe' }
    )

    encrypted++
    console.log(`[staticrypt] 已加密：${htmlRel}`)
  }

  if (encrypted > 0) {
    console.log(`[staticrypt] 共加密 ${encrypted} 个受密码保护的页面`)
  }
}

/**
 * 删除受保护文章「携带正文」的完整 js chunk（保留空正文的 .lean.js）。
 *
 * 为什么只删完整 chunk、保留 lean：
 *  - 正文明文只存在于完整 chunk（`t('<正文HTML>',N)`）；lean 是 `t("",N)`，不含正文。
 *  - 首屏/整页加载时 VitePress 用的是 .lean.js（见 client/app/index.js 的 isInitialPageLoad），
 *    staticrypt 解密 document.write 出原文后，靠 lean 的静态 vnode「认领」已存在的 DOM 完成 hydration，
 *    SPA 正常启动、交互不受影响；若把 lean 也删了，import 404 → 会挂载 404 组件盖掉正文。
 *  - 完整 chunk 只在「SPA 站内跳进该页」时才需要，而该跳转已被路由拦截器改成整页加载，
 *    因此完整 chunk 在运行时不再被使用，可安全删除。
 *
 * 正文本就已内联在 SSR 生成的 .html 中（已被 staticrypt 加密），删完整 chunk 不会丢任何内容。
 */
export async function removeProtectedFullChunks(outDir: string) {
  const posts = await getProtectedPosts()
  if (posts.length === 0) return

  const hashmapPath = path.resolve(outDir, 'hashmap.json')
  if (!fs.existsSync(hashmapPath)) {
    console.warn(`[protect] 未找到 hashmap.json（${hashmapPath}），跳过 chunk 删除`)
    return
  }
  const hashmap = JSON.parse(fs.readFileSync(hashmapPath, 'utf-8')) as Record<string, string>

  let removed = 0
  for (const { mdPath } of posts) {
    // posts/2025/09/investment/index.md -> posts_2025_09_investment_index.md
    const key = mdPath.replace(/\//g, '_')
    const hash = hashmap[key]
    if (!hash) {
      console.warn(`[protect] hashmap 中未找到 ${key}，跳过`)
      continue
    }

    // 仅删完整 chunk，保留同 hash 的 .lean.js
    const fullChunk = path.resolve(outDir, 'assets', `${key}.${hash}.js`)
    if (fs.existsSync(fullChunk)) {
      fs.rmSync(fullChunk)
      removed++
      console.log(`[protect] 已删除完整 chunk：assets/${key}.${hash}.js（保留 .lean.js）`)
    }
  }

  if (removed > 0) {
    console.log(`[protect] 共删除 ${removed} 个含正文的完整 chunk`)
  }
}
