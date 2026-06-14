#!/usr/bin/env bash
# ============================================
#  mdsee - Linux 打包脚本
#  作者: Nohaltsail
# ============================================

set -e

echo ""
echo "============================================"
echo "  mdsee Linux 打包工具"
echo "============================================"
echo ""

# 切换到项目根目录（脚本所在目录）
cd "$(dirname "$0")"

# 检查 Node.js（兼容 sudo 重置 PATH 的情况）
if ! command -v node &> /dev/null; then
    # 尝试常见安装路径
    for p in /usr/local/lib/nodejs/*/bin /usr/local/bin /opt/nodejs/bin "$HOME/.nvm/versions/node/*/bin"; do
        if [ -x "$p/node" ]; then
            export PATH="$p:$PATH"
            break
        fi
    done
    # 尝试 NODEJS_HOME 环境变量
    if ! command -v node &> /dev/null && [ -n "$NODEJS_HOME" ]; then
        export PATH="$NODEJS_HOME/bin:$PATH"
    fi
fi

if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装: https://nodejs.org/"
    echo "[提示] 请勿使用 sudo 运行此脚本（sudo 会重置 PATH 导致找不到 node）"
    echo "[提示] 正确用法: bash build.sh"
    exit 1
fi

echo "[信息] Node.js 版本: $(node -v)"
echo "[信息] npm 版本: $(npm -v)"
echo ""

# 设置 Electron 国内镜像（加速下载，如不需要可注释掉）
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

# 设置代理（用于下载 electron-builder 二进制文件，如不需要可注释掉）
# export HTTPS_PROXY="http://127.0.0.1:7890"
# export HTTP_PROXY="http://127.0.0.1:7890"

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "[步骤 1/3] 安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
else
    echo "[步骤 1/3] node_modules 已存在，跳过依赖安装"
fi
echo ""

# Vite 构建前端
echo "[步骤 2/3] 构建前端资源..."
npx vite build
if [ $? -ne 0 ]; then
    echo "[错误] 前端构建失败"
    exit 1
fi
echo ""

# electron-builder 打包
echo "[步骤 3/3] 打包 Linux 安装包 (AppImage + deb)..."
npx electron-builder --linux
if [ $? -ne 0 ]; then
    echo "[错误] 打包失败"
    exit 1
fi
echo ""

# 输出结果
echo "============================================"
echo "  打包成功！"
echo "  产物目录: release/"
echo "============================================"
echo ""

echo "生成的文件:"
ls -lh release/*.AppImage release/*.deb 2>/dev/null || echo "  (未找到产物文件)"
echo ""
