/**
 * Document Manager - 文档存储管理
 * 参考 markdown-online-editor/src/helper/storage.js
 * 使用 localStorage 持久化文档数据
 */

const KEY_DOCUMENTS = 'mde_documents'
const KEY_ACTIVE_DOC = 'mde_active_doc'
const CONTENT_PREFIX = 'mde_doc_'

export class DocManager {
  constructor() {
    // 确保至少有一个文档
    if (this.getAllDocs().length === 0) {
      this.createDoc('笔记1')
    }
    // 确保 activeId 有效
    if (!this.getActiveId()) {
      const docs = this.getAllDocs()
      if (docs.length > 0) {
        this.setActive(docs[0].id)
      }
    }
  }

  /** 生成唯一 ID */
  _genId() {
    return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  /** 获取所有文档列表 (按更新时间倒序) */
  getAllDocs() {
    try {
      const raw = localStorage.getItem(KEY_DOCUMENTS)
      const list = raw ? JSON.parse(raw) : []
      return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    } catch {
      return []
    }
  }

  /** 保存文档列表 */
  _setDocs(list) {
    localStorage.setItem(KEY_DOCUMENTS, JSON.stringify(list))
  }

  /** 获取当前激活文档 ID */
  getActiveId() {
    return localStorage.getItem(KEY_ACTIVE_DOC)
  }

  /** 设置激活文档 ID */
  setActive(id) {
    if (id) {
      localStorage.setItem(KEY_ACTIVE_DOC, id)
    } else {
      localStorage.removeItem(KEY_ACTIVE_DOC)
    }
  }

  /** 获取单个文档元数据 + 内容 */
  getDoc(id) {
    if (!id) return null
    const docs = this.getAllDocs()
    const meta = docs.find(d => d.id === id)
    if (!meta) return null
    return {
      ...meta,
      content: this.getContent(id),
    }
  }

  /** 获取当前激活的文档 */
  getActiveDoc() {
    return this.getDoc(this.getActiveId())
  }

  /** 获取文档内容 */
  getContent(id) {
    if (!id) return ''
    try {
      return localStorage.getItem(CONTENT_PREFIX + id) || ''
    } catch {
      return ''
    }
  }

  /** 保存文档内容 */
  saveContent(id, content) {
    if (!id) return
    localStorage.setItem(CONTENT_PREFIX + id, content == null ? '' : String(content))
    const list = this.getAllDocs()
    const doc = list.find(d => d.id === id)
    if (doc) {
      doc.updatedAt = Date.now()
      this._setDocs(list)
    }
  }

  /** 新建文档 */
  createDoc(title = '未命名文档') {
    const now = Date.now()
    const doc = {
      id: this._genId(),
      title: String(title || '未命名文档').trim() || '未命名文档',
      createdAt: now,
      updatedAt: now,
    }
    const list = this.getAllDocs()
    list.unshift(doc)
    this._setDocs(list)
    localStorage.setItem(CONTENT_PREFIX + doc.id, '')
    this.setActive(doc.id)
    return doc
  }

  /** 重命名文档 */
  renameDoc(id, newTitle) {
    const list = this.getAllDocs()
    const doc = list.find(d => d.id === id)
    if (!doc) return false
    doc.title = String(newTitle || '').trim() || '未命名文档'
    doc.updatedAt = Date.now()
    this._setDocs(list)
    return true
  }

  /** 删除文档 */
  deleteDoc(id) {
    if (!id) return
    const list = this.getAllDocs().filter(d => d.id !== id)
    this._setDocs(list)
    localStorage.removeItem(CONTENT_PREFIX + id)
    const active = this.getActiveId()
    if (active === id) {
      const next = list[0]
      this.setActive(next ? next.id : null)
    }
  }
}
