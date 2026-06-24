/**
 * 把任意形式的路径/链接归一化，便于在“受保护路由集合”里做匹配。
 *
 * 同一篇文章可能出现多种写法：
 *   /posts/2026/02/foo.html  (列表里点击的链接)
 *   /posts/2026/02/foo       (cleanUrls 直达)
 *   /posts/2026/02/bar/      (index.md 生成的目录页)
 * 归一化后统一为：posts/2026/02/foo
 *
 * 注意：本文件不能引入任何 node 专属依赖，需同时被服务端与客户端代码引用。
 */
export function normalizeRoute(p: string): string {
  let s = p
  try {
    s = decodeURIComponent(p)
  } catch {
    // 保留原值
  }
  return s
    .replace(/[?#].*$/, '') // 去掉 query / hash
    .replace(/\.html$/, '') // 去掉 .html 后缀
    .replace(/\/index$/, '') // index 页等价于其所在目录
    .replace(/\/+$/, '') // 去掉结尾斜杠
    .replace(/^\/+/, '') // 去掉开头斜杠
}
