import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBookStore } from './bookStore'
import { useBookmarkStore } from './bookmarkStore'
import { useHighlightStore } from './highlightStore'

export interface WebDavConfig {
  preset: 'jianguo' | 'alist' | 'custom'
  url: string
  username: string
  password: string
}

export interface CloudBook {
  id: string
  title: string
  author: string
  filename: string
  file_size: number
  last_modified: string
}

const STORAGE_KEY = 'moreader_webdav_config'

function loadConfig(): WebDavConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return {
    preset: 'jianguo',
    url: 'https://dav.jianguoyun.com/dav/Moreader',
    username: '',
    password: '',
  }
}

export const useSyncStore = defineStore('sync', () => {
  const config = ref<WebDavConfig>(loadConfig())
  const isUploading = ref(false)
  const isDownloading = ref(false)
  const syncResult = ref<string | null>(null)

  const cloudBooks = ref<CloudBook[]>([])
  const loadingCloud = ref(false)
  const uploadingBookId = ref<string | null>(null)
  const downloadingBookId = ref<string | null>(null)

  const lastUploadTime = ref<number | null>(
    localStorage.getItem('moreader_last_upload') ? Number(localStorage.getItem('moreader_last_upload')) : null
  )
  const lastDownloadTime = ref<number | null>(
    localStorage.getItem('moreader_last_download') ? Number(localStorage.getItem('moreader_last_download')) : null
  )

  const isLoggedIn = computed(() => !!(config.value.url && config.value.username && config.value.password))
  const loggedEmail = computed(() => config.value.username || 'WebDAV')

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
  }

  function setPreset(preset: 'jianguo' | 'alist' | 'custom') {
    const prevPreset = config.value.preset
    config.value.preset = preset
    const currentUrl = (config.value.url || '').trim()
    const isDefaultOrTemplate = !currentUrl ||
      currentUrl === 'https://dav.jianguoyun.com/dav/Moreader' ||
      currentUrl === 'https://your-alist.com/dav/Books' ||
      currentUrl === 'http://p-plus.duckdns.org:6355/dav/Books' ||
      currentUrl === 'http://powerplus.blogsyte.com:6355/dav/Books' ||
      currentUrl.includes('your-nas')

    if (isDefaultOrTemplate) {
      if (preset === 'jianguo') {
        config.value.url = 'https://dav.jianguoyun.com/dav/Moreader'
      } else if (preset === 'alist') {
        config.value.url = 'http://p-plus.duckdns.org:6355/dav/Books'
      } else if (preset === 'custom') {
        config.value.url = ''
      }
    }
    saveConfig()
  }

  function getAuthHeader(): string {
    return 'Basic ' + btoa(unescape(encodeURIComponent(`${config.value.username}:${config.value.password}`)))
  }

  function getBaseUrl(): string {
    return config.value.url.replace(/\/+$/, '')
  }

  /** 确保云端目录存在 (MKCOL) */
  async function ensureDirectory(): Promise<void> {
    const url = getBaseUrl()
    try {
      await fetch(url, {
        method: 'MKCOL',
        headers: { Authorization: getAuthHeader() },
      })
    } catch (e) {
      // 目录已存在时 MKCOL 会返回 405 Method Not Allowed，属于正常
    }
  }

  /** 测试连接 */
  async function testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!config.value.url || !config.value.username || !config.value.password) {
      return { ok: false, message: '请完整填写 WebDAV 地址、账号和密码' }
    }
    try {
      await ensureDirectory()
      const resp = await fetch(getBaseUrl(), {
        method: 'PROPFIND',
        headers: {
          Authorization: getAuthHeader(),
          Depth: '0',
        },
      })
      if (resp.ok || resp.status === 207) {
        saveConfig()
        return { ok: true, message: '连接成功！WebDAV 配置已生效' }
      }
      if (resp.status === 401) {
        return { ok: false, message: '账号或密码错误 (401 Unauthorized)' }
      }
      return { ok: false, message: `连接异常 (HTTP ${resp.status})` }
    } catch (e: any) {
      return { ok: false, message: '网络请求失败，请检查网址格式或跨域设置: ' + e.message }
    }
  }

  /** 退出/清除配置 */
  function logout() {
    config.value.username = ''
    config.value.password = ''
    cloudBooks.value = []
    saveConfig()
  }

  /** 上传阅读数据（进度、书签、高亮） */
  async function uploadToCloud(): Promise<void> {
    if (!isLoggedIn.value) throw new Error('请先配置 WebDAV')
    isUploading.value = true
    syncResult.value = null

    try {
      await ensureDirectory()
      const bookStore = useBookStore()
      const bookmarkStore = useBookmarkStore()
      const highlightStore = useHighlightStore()

      const payload = {
        version: '2.8.0',
        updatedAt: Date.now(),
        books: bookStore.books.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          progress: b.progress,
        })),
        bookmarks: bookmarkStore.bookmarks,
        highlights: highlightStore.highlights,
      }

      const syncUrl = `${getBaseUrl()}/moreader-sync-data.json`
      const resp = await fetch(syncUrl, {
        method: 'PUT',
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload, null, 2),
      })

      if (!resp.ok && resp.status !== 201 && resp.status !== 204) {
        throw new Error(`WebDAV 上传失败 (HTTP ${resp.status})`)
      }

      lastUploadTime.value = Date.now()
      localStorage.setItem('moreader_last_upload', String(lastUploadTime.value))
      syncResult.value = '阅读进度与书签已同步到云端 ✓'
    } catch (e: any) {
      syncResult.value = `上传失败: ${e.message}`
      throw e
    } finally {
      isUploading.value = false
    }
  }

  /** 从云端拉取阅读数据 */
  async function downloadFromCloud(): Promise<void> {
    if (!isLoggedIn.value) throw new Error('请先配置 WebDAV')
    isDownloading.value = true
    syncResult.value = null

    try {
      const syncUrl = `${getBaseUrl()}/moreader-sync-data.json?t=${Date.now()}`
      const resp = await fetch(syncUrl, {
        headers: { Authorization: getAuthHeader() },
      })

      if (resp.status === 404) {
        throw new Error('云端暂无同步数据，请先在当前设备点击“上传”')
      }
      if (!resp.ok) {
        throw new Error(`WebDAV 下载失败 (HTTP ${resp.status})`)
      }

      const data = await resp.json()
      const bookStore = useBookStore()
      const bookmarkStore = useBookmarkStore()
      const highlightStore = useHighlightStore()

      // 合并阅读进度
      if (Array.isArray(data.books)) {
        for (const remote of data.books) {
          const local = bookStore.books.find(b => b.title === remote.title)
          if (local && remote.progress) {
            local.progress = remote.progress
            await bookStore.updateProgress(local.id, remote.progress.location, remote.progress.percentage)
          }
        }
      }

      // 合并书签
      if (Array.isArray(data.bookmarks)) {
        for (const bm of data.bookmarks) {
          const exists = bookmarkStore.bookmarks.some(b => b.bookId === bm.bookId && b.cfi === bm.cfi)
          if (!exists) {
            bookmarkStore.bookmarks.push(bm)
          }
        }
      }

      // 合并高亮
      if (Array.isArray(data.highlights)) {
        for (const hl of data.highlights) {
          const exists = highlightStore.highlights.some(h => h.bookId === hl.bookId && h.cfiRange === hl.cfiRange)
          if (!exists) {
            highlightStore.highlights.push(hl)
          }
        }
      }

      lastDownloadTime.value = Date.now()
      localStorage.setItem('moreader_last_download', String(lastDownloadTime.value))
      syncResult.value = '已成功从云端恢复数据 ✓'
    } catch (e: any) {
      syncResult.value = `下载失败: ${e.message}`
      throw e
    } finally {
      isDownloading.value = false
    }
  }

  /** 获取云端书籍列表 (通过 PROPFIND) */
  async function listCloudBooks(): Promise<void> {
    if (!isLoggedIn.value) return
    loadingCloud.value = true
    try {
      await ensureDirectory()
      const resp = await fetch(getBaseUrl(), {
        method: 'PROPFIND',
        headers: {
          Authorization: getAuthHeader(),
          Depth: '1',
        },
      })
      if (!resp.ok && resp.status !== 207) return

      const xml = await resp.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const responses = doc.querySelectorAll('response, d\\:response')

      const list: CloudBook[] = []
      responses.forEach(node => {
        const href = node.querySelector('href, d\\:href')?.textContent || ''
        const decodedHref = decodeURIComponent(href)
        const filename = decodedHref.split('/').filter(Boolean).pop() || ''
        if (filename.toLowerCase().endsWith('.epub')) {
          const contentLength = node.querySelector('getcontentlength, d\\:getcontentlength')?.textContent || '0'
          const lastMod = node.querySelector('getlastmodified, d\\:getlastmodified')?.textContent || ''
          list.push({
            id: filename,
            title: filename.replace(/\.epub$/i, ''),
            author: 'Cloud',
            filename,
            file_size: parseInt(contentLength, 10) || 0,
            last_modified: lastMod,
          })
        }
      })
      cloudBooks.value = list
    } catch (e) {
      console.warn('Failed to list cloud books via WebDAV:', e)
    } finally {
      loadingCloud.value = false
    }
  }

  /** 上传单本电子书到云端 */
  async function uploadBook(bookId: string): Promise<void> {
    if (!isLoggedIn.value) throw new Error('请先配置 WebDAV')
    uploadingBookId.value = bookId
    try {
      await ensureDirectory()
      const bookStore = useBookStore()
      const book = bookStore.books.find(b => b.id === bookId)
      if (!book) throw new Error('未找到书籍')

      const rawData = await bookStore.loadBookBinary(bookId)
      if (!rawData) throw new Error('无法读取书籍文件')

      const safeFilename = encodeURIComponent(`${book.title}.epub`)
      const fileUrl = `${getBaseUrl()}/${safeFilename}`

      const resp = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/epub+zip',
        },
        body: rawData,
      })

      if (!resp.ok && resp.status !== 201 && resp.status !== 204) {
        throw new Error(`上传失败 (HTTP ${resp.status})`)
      }
      await listCloudBooks()
    } finally {
      uploadingBookId.value = null
    }
  }

  /** 从云端下载单本电子书并存入本地 */
  async function downloadBook(cb: CloudBook): Promise<void> {
    if (!isLoggedIn.value) throw new Error('请先配置 WebDAV')
    downloadingBookId.value = cb.id
    try {
      const fileUrl = `${getBaseUrl()}/${encodeURIComponent(cb.filename)}`
      const resp = await fetch(fileUrl, {
        headers: { Authorization: getAuthHeader() },
      })
      if (!resp.ok) throw new Error(`下载失败 (HTTP ${resp.status})`)

      const arrayBuffer = await resp.arrayBuffer()
      const file = new File([arrayBuffer], cb.filename, { type: 'application/epub+zip' })
      const bookStore = useBookStore()
      await bookStore.saveBook(file)
    } finally {
      downloadingBookId.value = null
    }
  }

  /** 删除云端电子书 */
  async function deleteCloudBook(cbId: string): Promise<void> {
    if (!isLoggedIn.value) throw new Error('请先配置 WebDAV')
    const fileUrl = `${getBaseUrl()}/${encodeURIComponent(cbId)}`
    const resp = await fetch(fileUrl, {
      method: 'DELETE',
      headers: { Authorization: getAuthHeader() },
    })
    if (!resp.ok && resp.status !== 204 && resp.status !== 404) {
      throw new Error(`删除失败 (HTTP ${resp.status})`)
    }
    cloudBooks.value = cloudBooks.value.filter(b => b.id !== cbId)
  }

  return {
    config,
    isLoggedIn,
    loggedEmail,
    isUploading,
    isDownloading,
    syncResult,
    lastUploadLabel: computed(() => lastUploadTime.value ? new Date(lastUploadTime.value).toLocaleString() : null),
    lastDownloadLabel: computed(() => lastDownloadTime.value ? new Date(lastDownloadTime.value).toLocaleString() : null),
    cloudBooks,
    loadingCloud,
    uploadingBookId,
    downloadingBookId,
    setPreset,
    saveConfig,
    testConnection,
    logout,
    uploadToCloud,
    downloadFromCloud,
    listCloudBooks,
    uploadBook,
    downloadBook,
    deleteCloudBook,
  }
})
