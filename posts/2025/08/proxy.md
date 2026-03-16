---
date: 2025-08-31
title: 科学上网
category:
  - 工具
tags:
  - proxy
---

自建科学上网备忘

<!--more-->

## 什么是科学上网

科学上网，即通过一些技术手段，突破墙的限制，可以访问到海外的网站，如谷歌等。

## 为什么需要科学上网

如果你不知道为什么需要科学上网，那么你就不需要科学上网。

## 如何科学上网

方法有很多，主要来说是两种方案：

- 自建科学上网，俗称 “搭梯子”
- 使用第三方服务，俗称“买梯子”，“买机场”，

无技术基础 建议直接使用第三方服务即可，花钱买服务，操作比较简单，卖家包教包会。  
值得注意的是，这种卖家和健身房的套路差不多，店大即跑路，所以不建议一次买太久，做好他们随时跑路的准备。

### 自建科学上网

1. 购买海外服务器，推荐[搬瓦工](https://bandwagonhost.com/aff.php?aff=63939)或[DMIT](https://www.dmit.io/aff.php?aff=19154)，建议选美国节点。
2. 服务器上安装科学上网服务
   1. 参考[xray_docker](https://github.com/wulabing/xray_docker)或者其它各种一键安装脚本
3. 在本机电脑，手机等终端上安装客户端软件（桌面端推荐[clash verge](https://github.com/clash-verge-rev/clash-verge-rev/releases)），配置代理指向你的服务器
4. 使用科学上网服务
   


<details>
<summary>http2 协议代理节点配置</summary>

::: warning
旧方案不推荐，建议使用 vless 协议
:::

::: code-group

```sh [安装域名证书]
# 使用python3安装 certbot
sudo python3 -m venv /opt/certbot/
sudo /opt/certbot/bin/pip install --upgrade pip
sudo /opt/certbot/bin/pip install certbot
sudo ln -s /opt/certbot/bin/certbot /usr/bin/certbot

# 按照提示按照域名证书
sudo certbot certonly --standalone

# 也可以参考 https://github.com/acmesh-official/acme.sh 安装域名证书
```

```sh [启动gost转发服务]
#!/bin/bash

# 下面的三个参数需要改成你的
# 域名
DOMAIN="proxy.domain.com"
# 用户名
USER="xxx"
# 密码
PASS="xxxxx"

# 端口
PORT=443
AUTH=$(echo -n ${USER}:${PASS} | base64)

BIND_IP=0.0.0.0
CERT_DIR=/etc/letsencrypt
CERT=${CERT_DIR}/live/${DOMAIN}/fullchain.pem
KEY=${CERT_DIR}/live/${DOMAIN}/privkey.pem
sudo docker run -d --name gost \
    -v ${CERT_DIR}:${CERT_DIR}:ro \
    --net=host ginuerzh/gost \
    -L "http2://${BIND_IP}:${PORT}?auth=${AUTH}&cert=${CERT}&key=${KEY}&probe_resist=code:404&knock=www.google.com"
```

```sh [配置定时任务]
# 每月1号0点0分更新证书
0 0 1 * * /usr/bin/certbot renew --force-renewal
# 每天1点5分重启gost转发服务
5 0 1 * * /usr/bin/docker restart gost
```

:::

##### 443端口复用
使用上述方式，服务器的443端口会被科学上网的gost转发代理服务占用，如果同时还有其他的https服务，则需要进行端口复用。

原理如下：
```
客户端(curl -v -x https://proxy.domain.com https://www.google.com --proxy-user user:pass)
   |
   | HTTPS CONNECT proxy.domain.com:443
   ↓
[Nginx stream layer] --- SNI检测 ---
   ├── domain.com → 127.0.0.1:1443 → Nginx http{} → 静态网页
   └── proxy.domain.com → 127.0.0.1:8443 → gost代理
```
准备工作：
- 需要配置两个域名A记录指向当前服务器IP
  - eg: `proxy.domain.com` 和 `domain.com`
- 需要配置两个证书
  - eg: 一个用于 `domain.com`，一个用于 `proxy.domain.com`
- 需要额外配置两个端口
  - 一个用于 `domain.com`，eg: 端口为1443, 用于静态网页
  - 一个用于 `proxy.domain.com`，eg: 端口为8443, 用于gost代理
  - 443 端口仅用于分发

::: code-group

```nginx [nginx 配置]
stream {
    map $ssl_preread_server_name $backend {
        proxy.domain.com 127.0.0.1:8443; # gost代理
        domain.com  127.0.0.1:1443;  # domain.com 静态网站
    }

    server {
        listen 443 reuseport;
        ssl_preread on;

        proxy_pass $backend;
    }
}

http {
    server {
        listen 1443 ssl http2;
        server_name domain.com;

        ssl_certificate     /etc/ssl/domain.com/fullchain.pem;
        ssl_certificate_key /etc/ssl/domain.com/privkey.pem;

        root /var/www/html;
        index index.html;
    }
}
```

```sh {12,15} [启动gost转发服务]
#!/bin/bash

# 下面的三个参数需要改成你的
# 域名
DOMAIN="proxy.domain.com"
# 用户名
USER="xxx"
# 密码
PASS="xxxxx"

# 端口
PORT=8443
AUTH=$(echo -n ${USER}:${PASS} | base64)

BIND_IP=127.0.0.1
CERT_DIR=/etc/letsencrypt
CERT=${CERT_DIR}/live/${DOMAIN}/fullchain.pem
KEY=${CERT_DIR}/live/${DOMAIN}/privkey.pem
sudo docker run -d --name gost \
    -v ${CERT_DIR}:${CERT_DIR}:ro \
    --net=host ginuerzh/gost \
    -L "http2://${BIND_IP}:${PORT}?auth=${AUTH}&cert=${CERT}&key=${KEY}&probe_resist=code:404&knock=www.google.com"
```
:::

</details>