/**
 * Electron Preload Script
 * 在渲染进程中暴露安全的 API 接口
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  openFile: () => ipcRenderer.invoke('open-file'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  newFile: () => ipcRenderer.invoke('new-file'),

  // 图片操作
  saveImage: (data) => ipcRenderer.invoke('save-image', data),

  // 导出
  exportPdf: (data) => ipcRenderer.invoke('export-pdf', data),

  // 菜单事件
  onMenuNewFile: (callback) => ipcRenderer.on('menu-new-file', callback),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuOpenFolder: (callback) => ipcRenderer.on('menu-open-folder', callback),
  onMenuSaveFile: (callback) => ipcRenderer.on('menu-save-file', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
})
