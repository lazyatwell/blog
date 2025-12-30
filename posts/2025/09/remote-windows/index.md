---
date: 2025-09-28
title: windows机器的远程管理
category:
  - 最佳实践
tags:
  - 运维
description: 总有一些小公司喜欢使用 Windows 当服务器，图形界面虽然方便，但无限重复的手动操作，并且还不能多人同时使用也是很大的弊端。本文记录一个可行的解决方案。
---

远程操作 windows 机器有成熟的解决方案，如 [ansible](https://docs.ansible.com/ansible/latest/installation_guide/index.html)等，但我都没用过……  
原因主要是：
1. 太重了，有些场景没有外网还用不了
2. 自身需求很简单，能远程传文件，执行命令即可

因此，其实只需要在对应机器上安装 `sshd`服务和`cygwin`等使 windows 支持 unix命令 的工具，然后从本地 ssh 连接即可。  

## 执行步骤
1. 本地安装 `ssh`客户端
2. 远程机器上安装 `sshd`服务端， 配置自启动, 开防火墙端口，配置无密码登录
3. 本地及远程安装 `Git`或`cygwin`, 使得本地及远程 windows 机器支持执行 unix 命令

### 安装 ssh 客户端
- 下载最新安装包 [https://github.com/PowerShell/Win32-OpenSSH/releases](https://github.com/PowerShell/Win32-OpenSSH/releases)
- 选中对应的 msi 文件下载
- 双击安装
- 验证：打开命令行，能运行`ssh`命令则说明安装成功
  
### 安装 sshd 服务端
- 和客户端是同一个安装包
- 双击安装
- 配置自启动
  - 使用管理员权限运行 powershell命令  
    `Set-Service -Name sshd -StartupType 'Automatic'`
- 修改配置文件，默认位置在 `%programdata%\ssh\sshd_config`
  - Port, 修改默认端口
  - PasswordAuthentication 修改为 `no`，即禁止密码登录
  - 注释最后两行 `Match Group administrators`
  - 修改后重启生效
    - 运行 powershell命令 `Restart-Service -Name sshd` 重启服务
- 开防火墙端口，eg: 22端口
  - 使用管理员权限运行 powershell命令  
    `netsh advfirewall firewall add rule name=sshd dir=in action=allow protocol=TCP localport=22`
- 配置无密码登录
  - 将本地 ssh 公钥添加到远程机器的 `~/.ssh/authorized_keys`文件中
  - 配置完成后，本地 ssh 连接远程机器时，无需输入密码

### 安装 Git
- 官网下载最新客户端 [https://git-scm.com/downloads/win](https://git-scm.com/downloads/win)
- 默认步骤安装
- 安装完成后，配置环境变量
  - 将 `Git` 的安装目录及`usr\bin`目录添加到环境变量 `PATH` 中
  - 验证：打开命令行，能运行`scp`, `grep` 等命令则说明安装成功

## 使用
- ssh 远程 windows机器，如同操作 linux机器一样操作 windows
- 可以让 AI 编写一些通用的 shell 脚本，使用 tar, scp， ssh等命令完成自动化操作

::: tip
tar 命令需使用 windows system32 目录下的 tar.exe，而不是 git 下的`/usr/bin/tar.exe`  
即环境变量的顺序，要求 `%SystemRoot%\System32` 在 `%ProgramFiles%\Git\usr\bin` 之前  
因为前者功能更全，支持 `tar -czf dist.tar.gz -C dist index.* static` 里的星号通配符，后者仅把星号当成普通字符处理
:::

::: details 前端部署脚本参考

```sh
#!/bin/bash

# deploy/deploy.sh
# usage
# cd deploy
# sh deploy.sh -e 10

# exit when error
set -e

# 显示使用说明
usage() {
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  -e, --env <环境>    指定部署环境(必填)"
    echo "                       10: xx测试环境"
    echo "                       11: xx测试环境"
    echo "                       12: xx生产环境"
    echo "  -f, --full         全量部署 (可选，默认为增量部署)"
    echo "  -b, --skip-build   跳过构建步骤 (可选)"
    echo "  -t, --skip-tar     跳过压缩步骤 (可选)"
    echo "  -u, --skip-upload  跳过上传步骤 (可选)"
    echo "  -h, --help         显示此帮助信息"
    exit 1
}

# 初始化变量
ENV=""
FULL=""
SKIPBUILD=""
SKIPTAR=""
SKIPUPLOAD=""
PUBLIC_DIR=()

# 解析命名参数
while getopts "e:fbtuh" opt; do
    case $opt in
        e)
            ENV="$OPTARG"
            ;;
        f)
            FULL="yes"
            ;;
        b)
            SKIPBUILD="yes"
            ;;
        t)
            SKIPTAR="yes"
            ;;
        u)
            SKIPUPLOAD="yes"
            ;;
        h)
            usage
            ;;
        \?)
            echo "无效的选项: -$OPTARG" >&2
            usage
            ;;
        :)
            echo "选项 -$OPTARG 需要参数." >&2
            usage
            ;;
    esac
done

echo "ENV: $ENV"
# 检查必需参数
if [ -z "$ENV" ]; then
    echo "错误: 必须指定环境参数 (-e)"
    usage
fi

# 根据环境设置配置
case $ENV in
    "10")
        host="admin@10.3.0.10"
        port="22"
        pathTo="/home/admin/server/nginx/html"
        ;;
    "11")
        host="administrator@10.3.0.11"
        port="6022"
        pathTo="E:\\server\\nginx\\html"
        ;;
    "12")
        host="administrator@10.3.0.12"
        port="22"
        pathTo="D:\\server\\nginx\\html"
        ;;
    *)
        echo "错误: 不支持的环境参数 '$ENV'"
        exit 1
        ;;
esac

echo "开始部署到 $ENV 环境，是否全量部署：${FULL:-NO}"

shift $((OPTIND - 1))

# 打包目录
distDir="../dist"
packName="dist.tar.gz"

if [ -z "$FULL" ]; then
    echo "开始增量部署..."
    # 需要打包的文件
    targetDistFp="index.* static"
else
    echo "开始全量部署..."
    targetDistFp="."
fi


# 根据是否跳过构建决定是否执行打包命令
if [ ${#PUBLIC_DIR[@]} -gt 0 ]; then
    echo "开始增量部署静态文件: ${targetDistFp}"
elif [ -z "$SKIPBUILD" ]; then
    npm run build
else
    echo "跳过构建步骤"
fi

# 压缩
if [ -z "$SKIPTAR" ]; then
    echo "开始压缩文件..."
    tar -czf ${packName} -C ${distDir} ${targetDistFp}
else
    echo "跳过压缩步骤"
fi


# 上传
if [ -z "$SKIPUPLOAD" ]; then
    echo "开始上传文件..."
    scp -P${port} ${packName} ${host}:${pathTo}
else
    echo "跳过上传步骤"
fi

# 远程执行命令
if [ -z "$FULL" ]; then
    # 增量部署：只更新特定文件
    remoteCmd="cd ${pathTo} && rm -rf ./${targetDistFp} && tar -xzf ${packName}"
else
    # 全量部署：更新所有文件
    remoteCmd="cd ${pathTo} && mv ${packName} ../ && rm -rf ./*  && tar -xzf ../${packName}"
fi

echo "remoteCmd: ${remoteCmd}"

if [[ $pathTo == *":"* ]] || [[ $pathTo == *"\\"* ]]; then
    # Windows系统
    echo "检测到Windows路径，执行Windows远程命令: ${remoteCmd}"
    # 提取盘符信息
    driveLetter=$(echo $pathTo | cut -c1)
    # 执行Windows远程命令
    if ssh -P${port} -t ${host} "cmd /c chcp 65001 && cd /d ${driveLetter}: && ${remoteCmd}"; then
        echo "部署成功!"
    else
        echo "部署失败! SSH远程命令执行出错，退出码: $?"
        exit 1
    fi
else
    # Linux系统
    echo "检测到Linux路径，执行普通远程命令: ${remoteCmd}"
    # 执行普通远程命令
    if ssh -P${port} -t ${host} "${remoteCmd}"; then
        echo "部署成功！"
    else
        echo "部署失败！SSH远程命令执行出错，退出码: $?"
        exit 1
    fi
fi

```

:::