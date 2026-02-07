---
date: 2025-09-02
title: 前端跨域
category:
  - 前端
tags:
  - 前端常识
description: 跨域——前端 vs 后端
---
希望前端开发人员再遇到跨域问题和后端扯皮时能吵赢。  
希望后端开发人员遇到跨域问题时能主动承担起自己的责任，不要一脸茫然不知所措。

<!--more-->

## 什么是跨域
跨域是**浏览器**基于**同源策略**对脚本访问跨站资源的限制。
跨越请求通常能发出，也能收到响应，但会被浏览器限制，看起来像请求失败了，实则是被浏览器拦截了。  


### 为什么会出现跨域
为防止数据泄露与会话劫持，浏览器实施同源策略。
- 同源判定：协议 + 域名 + 端口 必须完全一致。
- 非简单请求或自定义头会触发预检（OPTIONS），服务端需用 `Access-Control-Allow-*` 明确放行。
- 凭证与存储隔离：第三方 Cookie 更严格，`SameSite` 策略提升跨站请求安全阈值。

## 如何解决跨域
优先在后端/网关层处理，前端**仅配合**：
- CORS：服务端/网关返回正确响应头。
  - 如果 `Access-Control-Allow-Credentials: true` 则 `Access-Control-Allow-Origin` 不能为 `*`，必须回显确切域名。（问就是安全规定！）
  - `Access-Control-Allow-Origin` **只能赋一个值，不能为多个**, 为多个时需要动态设置为当前请求的 origin。
  - 前端使用 `withCredentials=true`发送凭据， 但如果`Access-Control-Allow-Credentials`不为true，即使客户端设置了 withCredentials，
    浏览器也会忽略凭据，导致请求失败或不包含认证信息
  - 响应头 `Set-Cookie` 需 `SameSite=None; Secure`。
  - 预检优化：按需放开 `Methods/Headers`，并设置 `Access-Control-Max-Age`。

eg:   
```http
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 600
Vary: Origin
```

::: details SameSite

  SameSite 是 HTTP 响应头中的一个属性，用于指定 Cookie 在跨域请求中的行为。它有三个可选值：
  - `Strict`：仅允许同源请求访问 Cookie。
  - `Lax`：允许同源请求访问 Cookie，但限制在导航过程中（如点击链接、刷新页面）。
  - `None`：允许所有请求访问 Cookie，但需要同时设置 `Secure` 属性。
  
  默认值为 `Lax`，但在处理跨域 Cookie 时，应使用 `None` 并设置 `Secure` 属性。
  
  如果 `SameSite=None` 但未设置 `Secure`，浏览器会拒绝发送包含该 Cookie 的请求。

  加上 `Secure` 则意味着只能在 HTTPS 请求中发送。

  ```js
  app.get('/set-cookie', (req, res) => {
    res.cookie('username', 'john_doe', {
      maxAge: 900000,  // 15 分钟
      secure: true,    // 仅 HTTPS
      sameSite: 'None'
    });
    res.send('Cookie 已设置');
  });
  ```

::: 


::: details Vary
  Vary 是 HTTP 响应头中的一个属性，在 CORS 中，Vary 用于指示响应头可能因请求头中的 Origin 字段而有所不同。

  主要用于缓存控制，当响应头中包含 Vary 时，缓存系统会根据请求头中的 Origin 字段来缓存不同的响应。

  当 `Access-Control-Allow-Origin` 不为 `*` 且会根据请求头中的 Origin 字段返回不同的响应时，Vary 必须包含 `Origin`。
::: 

- 反向代理：开发期用本地代理（如 Vite `server.proxy`）走同源；生产期用网关/Nginx 统一域名。
- 规避预检（在合理前提下）：
  - 使用“简单请求”（如 `GET/POST` 且 `Content-Type` 为表单/纯文本，避免自定义头）。
- 其他：JSONP 仅 GET，能力与安全受限；`postMessage` 用于窗口通信；`WebSocket` 不受 CORS 限制但服务器可校验 `Origin`。

## 总结
跨域是浏览器安全边界，而非网络故障。  
最佳实践是在后端/网关开启正确的 CORS，开发期用代理，生产期统一同源域名。  
涉及 Cookie/鉴权时用凭证型 CORS，并注意 `SameSite=None; Secure` 与 `Vary: Origin`。  
无法避免预检就正确响应并缓存，减少不必要的自定义头与跨域次数。