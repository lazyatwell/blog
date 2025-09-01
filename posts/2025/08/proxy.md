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

1. 购买海外服务器
2. 准备一个二级域名
   1. 配置A记录，指向服务器IP
3. 服务器上安装科学上网服务
   1. 使用 gost 转发服务
4. 本机电脑，手机等终端上安装客户端软件，配置代理指向你的服务器
5. 使用科学上网服务

::: code-group

```sh [安装域名证书]
# 使用python3安装 certbot
sudo python3 -m venv /opt/certbot/
sudo /opt/certbot/bin/pip install --upgrade pip
sudo /opt/certbot/bin/pip install certbot
sudo ln -s /opt/certbot/bin/certbot /usr/bin/certbot

# 按照提示按照域名证书
sudo certbot certonly --standalone
```

```sh [启动gost转发服务]
#!/bin/bash

# 下面的s三个参数需要改成你的
# 域名
DOMAIN="xx.xxx.com"
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
