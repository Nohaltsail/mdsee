/**
 * Electron Main Process
 * Markdown Desktop Editor (mdsee) 主进程
 */
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

let mainWindow = null
const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'mdsee',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => { mainWindow.show() })
  mainWindow.on('closed', () => { mainWindow = null })
  setupMenu()
}

// ============ 应用菜单 ============
function setupMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-file') },
        { label: '打开文件...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open-file') },
        { label: '打开文件夹...', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow.webContents.send('menu-open-folder') },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save-file') },
        { label: '另存为...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-save-as') },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '全屏', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' }, { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 mdsee',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info', title: '关于', message: 'mdsee',
              detail: '基于 Vditor 的桌面版 Markdown 编辑器\n作者: Nohaltsail\n版本: 1.0.0',
            })
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ============ IPC 处理 ============

// 打开文件
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开 Markdown 文件',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = fs.readFileSync(filePath, 'utf-8')
  const name = path.basename(filePath).replace(/\.(md|markdown|txt)$/i, '')
  return { name, content, path: filePath }
})

// 打开文件夹 — 返回文件夹内所有 md 文件列表
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开文件夹',
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const folderPath = result.filePaths[0]
  const folderName = path.basename(folderPath)
  const files = []
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && /\.(md|markdown|txt)$/i.test(entry.name)) {
        const fullPath = path.join(folderPath, entry.name)
        const content = fs.readFileSync(fullPath, 'utf-8')
        files.push({
          name: entry.name.replace(/\.(md|markdown|txt)$/i, ''),
          content,
          path: fullPath,
        })
      }
    }
  } catch (e) {
    console.error('read folder error:', e)
  }
  return { folderName, folderPath, files }
})

// 读取单个文件内容（侧边栏点击文件夹内文件时调用）
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { content, path: filePath }
  } catch {
    return null
  }
})

// 保存文件（有 path 时直接保存，否则弹对话框另存为）
ipcMain.handle('save-file', async (event, { name, content, path: filePath }) => {
  // 文件夹模式：直接写入指定路径
  if (filePath) {
    try {
      fs.writeFileSync(filePath, content || '', 'utf-8')
      return { path: filePath }
    } catch (err) {
      console.error('save file error:', err)
      return false
    }
  }
  // 普通模式：弹出保存对话框
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存 Markdown 文件',
    defaultPath: (name || '未命名文档') + '.md',
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (result.canceled || !result.filePath) return false
  fs.writeFileSync(result.filePath, content || '', 'utf-8')
  return { path: result.filePath }
})

// 新建文件
ipcMain.handle('new-file', async () => {
  return { name: '未命名文档' }
})

// 导出 PDF — 从 Vditor 预览面板获取已渲染 HTML，在 PDF 窗口中二次渲染公式和代码高亮
ipcMain.handle('export-pdf', async (event, { title, html }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出 PDF',
    defaultPath: (title || 'export') + '.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (result.canceled || !result.filePath) return false

  let pdfWin = null
  let tmpFile = ''
  try {
    tmpFile = path.join(os.tmpdir(), `mdsee_pdf_${Date.now()}.html`)

    // 读取 Vditor CSS（含 .vditor-reset、代码块、Mermaid 等基础样式）
    const vditorCssPath = path.join(__dirname, '..', 'node_modules', 'vditor', 'dist', 'index.css')
    let vditorCss = ''
    try { vditorCss = fs.readFileSync(vditorCssPath, 'utf-8') } catch {}

    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  ${vditorCss}
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #24292e; }
  .vditor-reset { font-size: 14px; }
  h1,h2,h3,h4,h5,h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
  h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
  code { background: #f6f8fa; padding: .2em .4em; border-radius: 3px; font-size: 85%; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: .25em solid #dfe2e5; padding: 0 1em; color: #6a737d; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
  th { background: #f6f8fa; font-weight: 600; }
  img { max-width: 100%; }
  svg { max-width: 100%; height: auto; }
  a { color: #0366d6; text-decoration: none; }
  /* highlight.js GitHub 主题 */
  .hljs{color:#24292e}.hljs-comment,.hljs-quote{color:#6a737d;font-style:italic}
  .hljs-keyword,.hljs-selector-tag,.hljs-type{color:#d73a49}
  .hljs-string,.hljs-addition,.hljs-attr{color:#032f62}
  .hljs-number,.hljs-literal{color:#005cc5}
  .hljs-built_in,.hljs-builtin-name{color:#e36209}
  .hljs-title,.hljs-section{color:#6f42c1}
  .hljs-name,.hljs-selector-class{color:#22863a}
  .hljs-variable,.hljs-template-variable{color:#e36209}
  .hljs-deletion{color:#b31d28;background:#ffeef0}
  .hljs-meta{color:#6a737d}
  .hljs-symbol,.hljs-bullet{color:#005cc5}
  .hljs-link{color:#032f62}
  .hljs-emphasis{font-style:italic}
  .hljs-strong{font-weight:bold}
</style></head>
<body><div class="vditor-reset">${html}</div></body></html>`

    fs.writeFileSync(tmpFile, fullHtml, 'utf-8')

    pdfWin = new BrowserWindow({
      show: false,
      width: 900,
      height: 1200,
      webPreferences: {
        contextIsolation: true,
        offscreen: false,
        webSecurity: false,  // 允许 file:// 加载 CDN 资源
      },
    })

    await pdfWin.loadFile(tmpFile)

    // 在隐藏窗口中加载 KaTeX + highlight.js 并二次渲染
    await pdfWin.webContents.executeJavaScript(`
      new Promise(async (resolve) => {
        // 动态加载脚本
        function loadScript(url) {
          return new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = url; s.onload = res; s.onerror = res;
            document.head.appendChild(s);
          });
        }
        function loadCss(url) {
          return new Promise((res) => {
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = url; l.onload = res; l.onerror = res;
            document.head.appendChild(l);
          });
        }

        // 加载 KaTeX
        await Promise.all([
          loadCss('https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css'),
          loadScript('https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js'),
        ]);
        await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js');

        // 渲染公式（识别 $...$ 和 $$...$$ 分隔符）
        if (typeof renderMathInElement === 'function') {
          try {
            renderMathInElement(document.body, {
              delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\\\(', right: '\\\\)', display: false},
                {left: '\\\\[', right: '\\\\]', display: true},
              ],
              throwOnError: false,
            });
          } catch(e) { console.log('KaTeX error:', e); }
        }

        // 加载并运行 highlight.js 代码高亮
        await loadScript('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js');
        if (typeof hljs !== 'undefined') {
          document.querySelectorAll('pre code[class]').forEach((block) => {
            try { hljs.highlightElement(block); } catch(e) {}
          });
        }

        // 等待图片加载 + 渲染缓冲
        const imgs = document.querySelectorAll('img');
        await Promise.all(Array.from(imgs).map(img =>
          img.complete ? Promise.resolve() :
          new Promise(r => { img.onload = r; img.onerror = r; })
        ));
        setTimeout(resolve, 800);
      })
    `)

    const pdfData = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      printBackground: true,
    })

    pdfWin.close()
    pdfWin = null
    fs.writeFileSync(result.filePath, pdfData)
    return { path: result.filePath }
  } catch (err) {
    console.error('PDF export error:', err)
    if (pdfWin) pdfWin.close()
    return false
  } finally {
    if (tmpFile) { try { fs.unlinkSync(tmpFile) } catch {} }
  }
})

// ============ App Lifecycle ============
app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
