/**
 * Markdown Desktop Editor (mdsee) - Main Frontend Logic
 * 功能：打开文件夹、Mermaid渲染、暗色主题、PDF导出
 */
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { DocManager } from './docManager.js'
import { defaultContent } from './defaultContent.js'

// ============ 全局状态 ============
let vditor = null
let docManager = null
let sidebarCollapsed = false
let saveTimer = null
const SAVE_DEBOUNCE_MS = 800

// 文件夹模式状态
let folderMode = false
let folderFiles = [] // { name, content, path }[]
let activeFilePath = null

// 主题状态
let isDark = localStorage.getItem('mde_theme') === 'dark'

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  docManager = new DocManager()
  if (isDark) document.documentElement.setAttribute('data-theme', 'dark')
  initSidebar()
  initHeader()
  initVditor()
  initKeyboardShortcuts()
  initElectronMenuListeners()
})

// ============ Vditor 编辑器初始化 ============
function initVditor() {
  const activeDoc = docManager.getActiveDoc()
  const theme = isDark ? 'dark' : 'classic'
  const options = {
    width: '100%',
    height: '100%',
    tab: '\t',
    typewriterMode: true,
    mode: 'ir',
    theme,
    cdn: 'https://unpkg.com/vditor@3.11.2',
    cache: { enable: false },
    placeholder: '开始书写 Markdown...',
    preview: {
      delay: 150,
      show: true,
      theme: { current: theme },
      hljs: { style: isDark ? 'github-dark' : 'github' },
      markdown: {
        mermaid: { enable: true },
      },
    },
    outline: { enable: true, position: 'right' }, // 启用大纲功能
    toolbar: [
      'headings', 'bold', 'italic', 'strike', '|',
      'list', 'ordered-list', 'check', '|',
      'quote', 'code', 'inline-code', '|',
      'link', 'table', '|',
      {
        name: 'image',
        tipPosition: 's',
        tip: '插入图片',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        click: () => {
          // 触发文件选择
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = async (e) => {
            const file = e.target.files[0]
            if (!file) return
            
            showToast('正在处理图片...')
            
            try {
              const base64Data = await fileToBase64(file)
              
              // 使用原始文件名，避免添加时间戳
              const originalName = file.name || `image_${Date.now()}`
              
              const result = await window.electronAPI.saveImage({
                base64Data,
                fileName: originalName // 直接使用原始文件名
              })
              
              if (result && result.path) {
                showToast('图片已保存', 'success')
                // 提取不带扩展名的文件名作为 alt 文本
                const altText = originalName.replace(/\.[^.]+$/, '')
                const imageMarkdown = `![${altText}](${result.path})`
                console.log('[图片插入] Markdown:', imageMarkdown)
                vditor.insertValue(imageMarkdown)
              } else {
                showToast('图片保存失败', 'error')
              }
            } catch (err) {
              console.error('图片上传错误:', err)
              showToast('图片上传失败', 'error')
            }
          }
          input.click()
        },
      },
      'undo', 'redo', '|',
      'edit-mode', 'both', 'preview', '|',
      'outline', // 保留大纲按钮
      // 移除 fullscreen，使用顶部工具栏的 F11 全屏功能
    ],
    // 图片上传配置（类似 Typora）
    upload: {
      accept: 'image/*',
      multiple: false,
      fieldName: 'file',
      max: 10 * 1024 * 1024, // 10MB
      url: '', // 不使用远程上传，使用本地 handler
      // 自定义上传处理器 - 返回标准响应格式
      handler: async (files) => {
        if (!window.electronAPI) {
          showToast('浏览器模式不支持自动保存图片', 'error')
          return JSON.stringify({
            code: 1,
            msg: '浏览器模式不支持自动保存图片'
          })
        }

        const file = files[0]
        if (!file) {
          return JSON.stringify({ code: 1, msg: '没有选择文件' })
        }

        // 检查文件大小
        if (file.size > 10 * 1024 * 1024) {
          showToast('图片大小不能超过 10MB', 'error')
          return JSON.stringify({ code: 1, msg: '图片大小不能超过 10MB' })
        }

        showToast('正在处理图片...')

        try {
          // 将文件转换为 base64
          const base64Data = await fileToBase64(file)
          
          // 生成文件名（使用时间戳 + 原始文件名）
          const timestamp = Date.now()
          const originalName = file.name || `image_${timestamp}`
          const fileName = `${timestamp}_${originalName}`
          
          // 调用 Electron API 保存图片
          const result = await window.electronAPI.saveImage({
            base64Data,
            fileName
          })
          
          if (result && result.path) {
            // 返回标准格式：code=0 表示成功，data.succMap 包含文件名和URL映射
            showToast('图片已保存', 'success')
            const response = {
              code: 0,
              msg: '',
              data: {
                errFiles: [],
                succMap: {
                  [fileName]: result.path
                }
              }
            }
            console.log('[图片上传] 返回响应:', response)
            return JSON.stringify(response)
          } else {
            showToast('图片保存失败', 'error')
            return JSON.stringify({ code: 1, msg: '图片保存失败' })
          }
        } catch (err) {
          console.error('图片上传错误:', err)
          showToast('图片上传失败', 'error')
          return JSON.stringify({ code: 1, msg: '图片上传失败: ' + err.message })
        }
      },
      // 格式化响应，将 JSON 转换为 Markdown
      format: (files, responseText) => {
        console.log('[图片上传] format 收到响应:', responseText)
        try {
          const res = JSON.parse(responseText)
          if (res.code === 0 && res.data && res.data.succMap) {
            const succMap = res.data.succMap
            // 转换为 Markdown 图片语法
            const markdownImages = Object.entries(succMap).map(([filename, url]) => {
              const altText = filename.replace(/^\d+_/, '').replace(/\.[^.]+$/, '')
              return `![${altText}](${url})`
            }).join('\n')
            console.log('[图片上传] format 返回 Markdown:', markdownImages)
            return markdownImages
          }
          return res.msg || '上传失败'
        } catch (e) {
          console.error('[图片上传] 解析响应失败:', e)
          return responseText
        }
      },
    },
    // 剪贴板粘贴图片处理
    paste: {
      handler: async (md, textMode) => {
        // 如果是文本模式，不处理
        if (textMode) return md
        return md // 让 Vditor 默认处理
      },
    },
    input: (value) => { debouncedSave(value) },
    after: () => {
      if (activeDoc) {
        vditor.setValue(activeDoc.content || getDefaultContent())
      } else {
        vditor.setValue(getDefaultContent())
      }
      vditor.focus()
    },
  }
  vditor = new Vditor('vditor', options)
  
  // 等待 Vditor 完全初始化后添加剪贴板监听和大纲控制
  setTimeout(() => {
    // === 剪贴板图片粘贴支持 ===
    const editorElement = document.querySelector('.vditor-ir') || document.querySelector('#vditor')
    console.log('[剪贴板] 查找编辑器元素:', editorElement)
    
    if (editorElement && window.electronAPI) {
      console.log('[剪贴板] 添加 paste 事件监听器')
      editorElement.addEventListener('paste', async (e) => {
        console.log('[剪贴板] paste 事件触发')
        const items = e.clipboardData?.items
        console.log('[剪贴板] clipboard items:', items)
        if (!items) return
        
        for (const item of items) {
          console.log('[剪贴板] 检查 item type:', item.type)
          if (item.type.startsWith('image/')) {
            e.preventDefault()
            e.stopPropagation()
            
            const file = item.getAsFile()
            console.log('[剪贴板] 获取到文件:', file)
            if (!file) continue
            
            showToast('正在处理剪贴板图片...')
            
            try {
              // 转换为 base64
              const base64Data = await fileToBase64(file)
              
              // 生成文件名
              const timestamp = Date.now()
              const fileName = `${timestamp}_clipboard.png`
              
              // 调用 Electron API 保存
              const result = await window.electronAPI.saveImage({
                base64Data,
                fileName
              })
              
              console.log('[剪贴板] 保存结果:', result)
              if (result && result.path) {
                showToast('剪贴板图片已保存', 'success')
                // 在光标位置插入图片链接
                const imageMarkdown = `![clipboard](${result.path})`
                console.log('[剪贴板] 插入 Markdown:', imageMarkdown)
                vditor.insertValue(imageMarkdown)
              } else {
                showToast('剪贴板图片保存失败', 'error')
              }
            } catch (err) {
              console.error('[剪贴板] 处理错误:', err)
              showToast('剪贴板图片处理失败', 'error')
            }
            
            break // 只处理第一张图片
          }
        }
      })
      console.log('[剪贴板] 监听器添加成功')
    } else {
      console.warn('[剪贴板] 未找到编辑器元素或 electronAPI')
    }
    
    // === 大纲面板控制 ===
    // 监听大纲按钮点击，添加关闭功能
    const outlineBtn = document.querySelector('.vditor-toolbar__item[data-type="outline"]')
    if (outlineBtn) {
      outlineBtn.addEventListener('click', () => {
        // 延迟执行，等待 Vditor 的大纲面板渲染
        setTimeout(() => {
          const outlinePanel = document.querySelector('.vditor-outline')
          if (outlinePanel) {
            // 如果大纲面板已显示，添加关闭按钮
            let closeBtn = outlinePanel.querySelector('.vditor-outline-close-btn')
            if (!closeBtn) {
              closeBtn = document.createElement('button')
              closeBtn.className = 'vditor-outline-close-btn'
              closeBtn.innerHTML = '×'
              closeBtn.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                border: none;
                background: rgba(0,0,0,0.1);
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                color: #666;
                z-index: 10;
              `
              closeBtn.title = '关闭大纲'
              closeBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                outlinePanel.style.display = 'none'
              })
              outlinePanel.style.position = 'relative'
              outlinePanel.appendChild(closeBtn)
            }
          }
        }, 100)
      })
    }
  }, 500) // 延迟 500ms 确保 Vditor 完全初始化
}

// 辅助函数：文件转 base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============ 防抖保存 ============
function debouncedSave(value) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (folderMode && activeFilePath && vditor) {
      // 文件夹模式下保存到内存（实际文件保存用 Ctrl+S）
      const f = folderFiles.find(x => x.path === activeFilePath)
      if (f) f.content = value
    } else {
      const activeDoc = docManager.getActiveDoc()
      if (activeDoc && vditor) docManager.saveContent(activeDoc.id, value)
    }
    saveTimer = null
  }, SAVE_DEBOUNCE_MS)
}

function saveCurrentDoc() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (folderMode && activeFilePath && vditor) {
    const f = folderFiles.find(x => x.path === activeFilePath)
    if (f) f.content = vditor.getValue()
  } else {
    const activeDoc = docManager.getActiveDoc()
    if (activeDoc && vditor && typeof vditor.getValue === 'function') {
      docManager.saveContent(activeDoc.id, vditor.getValue())
    }
  }
}

// ============ 侧边栏 ============
function initSidebar() {
  updateDocList()
  document.getElementById('toggleSidebarBtn').addEventListener('click', toggleSidebar)
  document.getElementById('collapseSidebarBtn').addEventListener('click', toggleSidebar)
  document.getElementById('btnNewDoc').addEventListener('click', () => {
    if (folderMode) closeFolder()
    const doc = docManager.createDoc('未命名文档')
    docManager.setActive(doc.id)
    vditor.setValue('')
    vditor.focus()
    updateDocList()
    showToast('已新建文档', 'success')
  })
  document.getElementById('btnCloseFolder').addEventListener('click', () => {
    closeFolder()
    updateDocList()
  })
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed)
}

function closeFolder() {
  folderMode = false
  folderFiles = []
  activeFilePath = null
  document.getElementById('sidebarFolder').style.display = 'none'
}

// ============ 文档列表渲染 ============
function updateDocList() {
  const listEl = document.getElementById('docList')
  listEl.innerHTML = ''

  if (folderMode) {
    // 文件夹模式：显示文件夹内的文件
    folderFiles.forEach(file => {
      const item = document.createElement('div')
      item.className = 'sidebar-item' + (file.path === activeFilePath ? ' active' : '')

      const icon = document.createElement('span')
      icon.className = 'sidebar-item-icon'
      icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`

      const title = document.createElement('span')
      title.className = 'sidebar-item-title'
      title.textContent = file.name || '未命名'
      title.title = file.path

      item.appendChild(icon)
      item.appendChild(title)
      item.addEventListener('click', () => selectFolderFile(file.path))
      listEl.appendChild(item)
    })
  } else {
    // 普通模式：显示内置文档
    const docs = docManager.getAllDocs()
    const activeId = docManager.getActiveId()
    docs.forEach(doc => {
      const item = document.createElement('div')
      item.className = 'sidebar-item' + (doc.id === activeId ? ' active' : '')

      const title = document.createElement('span')
      title.className = 'sidebar-item-title'
      title.textContent = doc.title || '未命名文档'
      title.title = doc.title || '未命名文档'

      const actions = document.createElement('span')
      actions.className = 'sidebar-item-actions'

      const renameBtn = document.createElement('span')
      renameBtn.className = 'sidebar-item-action'
      renameBtn.title = '重命名'
      renameBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>`
      renameBtn.addEventListener('click', (e) => { e.stopPropagation(); startRename(doc.id, item, title) })

      const deleteBtn = document.createElement('span')
      deleteBtn.className = 'sidebar-item-action danger'
      deleteBtn.title = '删除'
      deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`
      deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteDoc(doc.id) })

      actions.appendChild(renameBtn)
      actions.appendChild(deleteBtn)
      item.appendChild(title)
      item.appendChild(actions)
      item.addEventListener('click', () => { if (doc.id !== activeId) selectDoc(doc.id) })
      listEl.appendChild(item)
    })
  }
}

function selectDoc(id) {
  saveCurrentDoc()
  docManager.setActive(id)
  const doc = docManager.getDoc(id)
  vditor.setValue(doc ? doc.content || '' : '')
  vditor.focus()
  updateDocList()
}

function selectFolderFile(filePath) {
  saveCurrentDoc()
  activeFilePath = filePath
  const file = folderFiles.find(x => x.path === filePath)
  if (file) {
    vditor.setValue(file.content || '')
    vditor.focus()
  }
  updateDocList()
}

function startRename(docId, itemEl, titleEl) {
  const doc = docManager.getDoc(docId)
  if (!doc) return
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'sidebar-item-input'
  input.value = doc.title || '未命名文档'
  titleEl.replaceWith(input)
  input.focus()
  input.select()
  const submit = () => { docManager.renameDoc(docId, input.value.trim() || '未命名文档'); updateDocList() }
  input.addEventListener('blur', submit)
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit() }; if (e.key === 'Escape') updateDocList() })
  input.addEventListener('click', (e) => e.stopPropagation())
}

function deleteDoc(docId) {
  showConfirm('删除文档', '确定要删除该文档吗？删除后无法恢复。', () => {
    docManager.deleteDoc(docId)
    const activeId = docManager.getActiveId()
    if (activeId) { const d = docManager.getDoc(activeId); vditor.setValue(d ? d.content || '' : '') }
    else vditor.setValue('')
    updateDocList()
    showToast('文档已删除')
  }, true)
}

// ============ 头部按钮事件 ============
function initHeader() {
  document.getElementById('btnNewFile').addEventListener('click', handleNewFile)
  document.getElementById('btnOpenFile').addEventListener('click', handleOpenFile)
  document.getElementById('btnOpenFolder').addEventListener('click', handleOpenFolder)
  document.getElementById('btnSaveFile').addEventListener('click', handleSaveFile)
  document.getElementById('btnExportPdf').addEventListener('click', handleExportPdf)
  document.getElementById('btnExportHtml').addEventListener('click', handleExportHtml)
  document.getElementById('btnTheme').addEventListener('click', toggleTheme)
  document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen)
  updateThemeIcon()
}

async function handleNewFile() {
  if (folderMode) closeFolder()
  if (window.electronAPI) {
    const result = await window.electronAPI.newFile()
    if (result) { docManager.createDoc(result.name || '未命名文档'); updateDocList() }
  } else {
    docManager.createDoc('未命名文档')
  }
  vditor.setValue('')
  vditor.focus()
  updateDocList()
}

async function handleOpenFile() {
  if (folderMode) closeFolder()
  if (window.electronAPI) {
    const result = await window.electronAPI.openFile()
    if (result) {
      const doc = docManager.createDoc(result.name)
      docManager.saveContent(doc.id, result.content)
      docManager.setActive(doc.id)
      vditor.setValue(result.content)
      vditor.focus()
      updateDocList()
      showToast(`已打开: ${result.name}`, 'success')
    }
  } else {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target.result
        const title = file.name.replace(/\.(md|markdown|txt)$/i, '') || '导入的文档'
        const doc = docManager.createDoc(title)
        docManager.saveContent(doc.id, content)
        docManager.setActive(doc.id)
        vditor.setValue(content)
        vditor.focus()
        updateDocList()
        showToast(`已打开: ${title}`, 'success')
      }
      reader.readAsText(file)
    }
    input.click()
  }
}

async function handleOpenFolder() {
  if (window.electronAPI) {
    const result = await window.electronAPI.openFolder()
    if (result && result.files.length > 0) {
      folderMode = true
      folderFiles = result.files
      activeFilePath = result.files[0].path

      // 显示文件夹信息
      const folderEl = document.getElementById('sidebarFolder')
      const folderNameEl = document.getElementById('folderName')
      folderEl.style.display = 'flex'
      folderNameEl.textContent = result.folderName
      folderNameEl.title = result.folderPath

      // 加载第一个文件
      vditor.setValue(result.files[0].content || '')
      vditor.focus()
      updateDocList()
      showToast(`已打开文件夹: ${result.folderName}（${result.files.length} 个文件）`, 'success')
    } else if (result && result.files.length === 0) {
      showToast('文件夹中没有 Markdown 文件')
    }
  } else {
    showToast('打开文件夹仅在桌面版可用')
  }
}

async function handleSaveFile() {
  saveCurrentDoc()

  if (folderMode && activeFilePath) {
    // 文件夹模式：通过 IPC 保存回原文件
    const file = folderFiles.find(x => x.path === activeFilePath)
    if (window.electronAPI && file) {
      await window.electronAPI.saveFile({ name: file.name, content: file.content, path: activeFilePath })
      showToast('保存成功', 'success')
    }
    return
  }

  const activeDoc = docManager.getActiveDoc()
  if (!activeDoc) return

  if (window.electronAPI) {
    const result = await window.electronAPI.saveFile({ name: activeDoc.title, content: activeDoc.content })
    if (result) showToast('保存成功', 'success')
  } else {
    const blob = new Blob([activeDoc.content || ''], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (activeDoc.title || '未命名文档') + '.md'
    a.click()
    URL.revokeObjectURL(url)
    showToast('已下载文件', 'success')
  }
}

// 从 Vditor 预览面板获取已渲染 HTML（含 Mermaid SVG + 公式样式）
function getPreviewHtml() {
  const internal = vditor.vditor
  const previewEl = internal.preview.previewElement

  // 预览面板在 IR 模式下默认隐藏（display:none），render() 会提前返回
  // 需要临时显示它，强制触发渲染，等待完成后再提取
  const wasHidden = internal.preview.element.style.display === 'none'
  if (wasHidden) {
    internal.preview.element.style.display = 'block'
    internal.preview.render(internal)
  }

  // 等待异步渲染完成（preview.delay=150ms + Mermaid/公式渲染时间）
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (previewEl.innerHTML && previewEl.innerHTML.trim().length > 10) {
        clearInterval(checkInterval)
        clearTimeout(fallbackTimer)
        const html = previewEl.innerHTML
        if (wasHidden) internal.preview.element.style.display = 'none'
        resolve(html)
      }
    }, 200)

    // 超时兜底
    const fallbackTimer = setTimeout(() => {
      clearInterval(checkInterval)
      const html = previewEl.innerHTML || vditor.getHTML()
      if (wasHidden) internal.preview.element.style.display = 'none'
      resolve(html)
    }, 5000)
  })
}

async function handleExportPdf() {
  if (!vditor) return
  const title = folderMode
    ? (folderFiles.find(x => x.path === activeFilePath)?.name || 'export')
    : (docManager.getActiveDoc()?.title || 'export')

  showToast('正在准备导出...')
  const html = await getPreviewHtml()

  if (window.electronAPI) {
    showToast('正在导出 PDF...')
    const result = await window.electronAPI.exportPdf({ title, html })
    if (result) showToast('PDF 导出成功', 'success')
    else showToast('PDF 导出失败', 'error')
  } else {
    // 浏览器 fallback：使用 window.print
    const vditorCss = document.querySelector('link[href*="vditor"]')?.href || ''
    const printWin = window.open('', '_blank')
    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      ${vditorCss ? `<link rel="stylesheet" href="${vditorCss}">` : ''}
      <style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.6}
      .vditor-reset{font-size:14px}
      h1,h2{border-bottom:1px solid #eaecef;padding-bottom:.3em}
      code{background:#f6f8fa;padding:.2em .4em;border-radius:3px}
      pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto}pre code{background:none;padding:0}
      blockquote{border-left:.25em solid #dfe2e5;padding:0 1em;color:#6a737d}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe2e5;padding:6px 13px}th{background:#f6f8fa}
      svg{max-width:100%;height:auto}</style>
      </head><body><div class="vditor-reset">${html}</div></body></html>`)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => { printWin.print(); printWin.close() }, 500)
    showToast('请在弹出窗口中保存 PDF', 'success')
  }
}

async function handleExportHtml() {
  const html = vditor.getHTML()
  const title = folderMode
    ? (folderFiles.find(x => x.path === activeFilePath)?.name || 'export')
    : (docManager.getActiveDoc()?.title || 'export')
  const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = title + '.html'
  a.click()
  URL.revokeObjectURL(url)
  showToast('HTML 导出成功', 'success')
}

// ============ 主题切换 ============
function toggleTheme() {
  isDark = !isDark
  localStorage.setItem('mde_theme', isDark ? 'dark' : 'light')
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '')
  if (!isDark) document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', 'dark')

  // 切换 Vditor 主题
  if (vditor) {
    vditor.setTheme(isDark ? 'dark' : 'classic', isDark ? 'dark' : 'light', isDark ? 'github-dark' : 'github')
  }
  updateThemeIcon()
}

function updateThemeIcon() {
  const icon = document.getElementById('themeIcon')
  if (isDark) {
    // 太阳图标（表示当前暗色，点击切回亮色）
    icon.innerHTML = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
  } else {
    // 月亮图标（表示当前亮色，点击切到暗色）
    icon.innerHTML = `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen()
  else document.exitFullscreen()
}

// ============ 键盘快捷键 ============
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveFile() }
    if (e.ctrlKey && !e.shiftKey && e.key === 'o') { e.preventDefault(); handleOpenFile() }
    if (e.ctrlKey && e.shiftKey && e.key === 'O') { e.preventDefault(); handleOpenFolder() }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); handleNewFile() }
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen() }
  })
}

// ============ Electron 菜单事件 ============
function initElectronMenuListeners() {
  if (!window.electronAPI) return
  window.electronAPI.onMenuNewFile(() => handleNewFile())
  window.electronAPI.onMenuOpenFile(() => handleOpenFile())
  window.electronAPI.onMenuOpenFolder(() => handleOpenFolder())
  window.electronAPI.onMenuSaveFile(() => handleSaveFile())
  window.electronAPI.onMenuSaveAs(() => handleSaveFile())
}

// ============ Toast 提示 ============
function showToast(message, type = '') {
  let toast = document.querySelector('.toast')
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast) }
  toast.textContent = message
  toast.className = 'toast ' + type
  requestAnimationFrame(() => toast.classList.add('show'))
  setTimeout(() => toast.classList.remove('show'), 2500)
}

// ============ 确认弹窗 ============
function showConfirm(title, message, onConfirm, isDanger = false) {
  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay'
  overlay.innerHTML = `<div class="dialog-box"><div class="dialog-title">${title}</div><div class="dialog-message">${message}</div><div class="dialog-actions"><button class="dialog-btn cancel" id="dialogCancel">取消</button><button class="dialog-btn ${isDanger ? 'danger' : 'confirm'}" id="dialogConfirm">确定</button></div></div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('show'))
  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200) }
  overlay.querySelector('#dialogCancel').addEventListener('click', close)
  overlay.querySelector('#dialogConfirm').addEventListener('click', () => { close(); onConfirm() })
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
}

// ============ 默认内容 ============
function getDefaultContent() {
  return defaultContent
}
