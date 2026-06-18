# mdsee

一款桌面版 Markdown 编辑器，使用 Electron + Vite 构建。支持实时预览、图表、LaTeX 公式、代码高亮、暗色主题和 PDF 导出。
<img width="1893" height="1137" alt="image" src="https://github.com/user-attachments/assets/bbfb8f57-dc67-4a2d-8556-8bcf9843256d" />

<img width="1886" height="1111" alt="image" src="https://github.com/user-attachments/assets/2fa1df1e-4105-404d-b894-5ef01f64600f" />



## 功能特性

- **即时渲染编辑** — 基于 Vditor IR（即时渲染）模式，所见即所得
- **Mermaid 图表** — 支持流程图、时序图、饼图等 Mermaid 语法的实时渲染
- **LaTeX 公式** — 支持 `$行内公式$` 和 `$$块级公式$$`，使用 KaTeX 渲染
- **代码高亮** — 支持多种编程语言的语法高亮（highlight.js）
- **文件夹模式** — 打开本地文件夹，在侧边栏浏览和编辑其中的 Markdown 文件
- **多文档管理** — 内置文档管理器，支持新建、重命名、删除、切换文档
- **亮/暗主题** — 一键切换 GitHub 风格亮色主题与暗色主题
- **导出 PDF** — 导出包含 Mermaid 图表、LaTeX 公式、代码高亮的 PDF 文件
- **导出 HTML** — 导出纯 HTML 文件
- **大纲导航** — 右侧大纲面板，快速定位标题章节
- **全屏模式** — F11 进入/退出全屏编辑
- **自动保存** — 输入内容自动保存到本地存储（防抖 800ms）


## 环境准备

### 系统要求

- **Node.js** >= 16（推荐 18+）
- **npm** >= 8

### 安装依赖

```bash
# 设置 Electron 国内镜像（推荐，加速下载）
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 安装项目依赖
npm install
```

> 如果 Electron 下载缓慢，确保 `ELECTRON_MIRROR` 环境变量已设置。

## 开发与测试

### 开发模式（热更新）

```bash
npm run electron:dev
```

该命令会同时启动 Vite 开发服务器（`http://localhost:5173`）和 Electron 窗口，前端代码修改后自动刷新。

### 仅启动前端（浏览器调试）

```bash
npm run dev
```

打开 `http://localhost:5173` 即可在浏览器中调试前端界面（文件操作等 Electron API 不可用）。

### 构建后预览

```bash
# 先构建前端，再启动 Electron
npm run electron:preview
```

### 使用 run.bat 快速运行（Windows）

```bash
run.bat
```

该脚本自动设置 Electron 镜像并启动应用（需先 `npm install` 和 `npx vite build`）。

## 编译打包

### 使用 build.bat（推荐，Windows）

```bash
build.bat
```

该脚本自动完成以下步骤：
1. 检查 Node.js 环境
2. 设置 Electron 和 electron-builder 国内镜像
3. 下载 NSIS 资源文件（如需）
4. 安装依赖（如 `node_modules` 不存在）
5. 使用 Vite 构建前端
6. 使用 electron-builder 打包为 Windows NSIS 安装程序

打包产物位于 `release/` 目录。

### 手动打包

```bash
# 构建 Windows 安装程序
npm run electron:build:win

# 构建 Linux 包（AppImage + deb）
npm run electron:build:linux

# 构建当前平台
npm run electron:build
```

### 打包配置说明

打包配置位于 `package.json` 的 `build` 字段：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `appId` | `com.nohaltsail.mdsee` | 应用唯一标识 |
| `productName` | `mdsee` | 应用显示名称 |
| `win.target` | `nsis (x64)` | Windows 安装程序格式 |
| `linux.target` | `AppImage + deb (x64)` | Linux 打包格式 |
| `nsis.oneClick` | `false` | 非一键安装，允许选择安装目录 |
| `nsis.allowToChangeInstallationDirectory` | `true` | 用户可自定义安装路径 |

> **NSIS 本地化**：如已安装 NSIS，可在 `build.bat` 中设置 `NSIS_DIR` 指向本地安装路径，避免重复下载。

## 功能用法

### 文件操作

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 新建文件 | `Ctrl+N` | 新建空白文档 |
| 打开文件 | `Ctrl+O` | 打开本地 `.md` / `.markdown` / `.txt` 文件 |
| 打开文件夹 | `Ctrl+Shift+O` | 打开文件夹，侧边栏列出其中所有 Markdown 文件 |
| 保存 | `Ctrl+S` | 保存当前文档（文件夹模式下保存回原文件） |

### 文件夹模式

1. 点击工具栏 **打开文件夹** 按钮或使用 `Ctrl+Shift+O`
2. 选择包含 Markdown 文件的文件夹
3. 侧边栏显示文件夹名称和其中所有 `.md` / `.markdown` / `.txt` 文件
4. 点击文件切换编辑内容，`Ctrl+S` 直接保存回磁盘原文件
5. 点击侧边栏文件夹名称旁的 **关闭** 按钮退出文件夹模式

### 导出 PDF

1. 点击工具栏 **导出 PDF** 按钮
2. 选择保存路径
3. 编辑器内容将渲染为包含 Mermaid 图表、LaTeX 公式和代码高亮的 A4 格式 PDF

> PDF 导出需要联网（首次加载 KaTeX 和 highlight.js CDN 资源）。

### 导出 HTML

点击工具栏 **导出 HTML** 按钮，直接下载 `.html` 文件。

### 主题切换

点击工具栏 **主题切换** 按钮（月亮/太阳图标），在亮色和暗色主题间切换。主题偏好保存在本地存储中。

### 文档管理

- **侧边栏** 显示所有内置文档，按更新时间排序
- 点击文档切换编辑
- 悬停文档项显示 **重命名** 和 **删除** 按钮
- 底部 **新建文档** 按钮创建空白文档
- 文档内容自动保存到浏览器 localStorage

### 应用菜单

Electron 桌面版提供完整的应用菜单：

- **文件** — 新建、打开、保存、另存为、退出
- **编辑** — 撤销、重做、剪切、复制、粘贴、全选
- **视图** — 全屏、缩放、开发者工具
- **帮助** — 关于信息

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | ^30.0.0 | 桌面应用框架 |
| Vite | ^5.4.0 | 前端构建工具 |
| Vditor | ^3.11.2 | Markdown 编辑器（IR 模式） |
| electron-builder | ^24.13.3 | 应用打包工具 |
| KaTeX | 0.16（CDN） | PDF 中 LaTeX 公式渲染 |
| highlight.js | 11.9（CDN） | PDF 中代码语法高亮 |

## 许可证

MIT License
