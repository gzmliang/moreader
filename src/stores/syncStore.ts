import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBookStore } from './bookStore'
import { useBookmarkStore } from './bookmarkStore'
import { useHighlightStore } from './highlightStore'

const DEFAULT_SERVER = 'http://powerplus.blogsyte.com:5001'

export interface SyncBookData {
  title: string
  author?: string
  progress?: {
    location?: string      // CFI
    percentage?: number    // 0-1
    lastRead?: number      // timestamp
  }
  bookmarks: any[]
  highlights: any[]
}

/** 云端书架书籍信息 */
export interface CloudBook {
  id: number
  title: string
  author: string
  filename: string
  file_size: number
  created_at: string
}

export const useSyncStore = defineStore('sync', () => {
  const serverUrl = ref(localStorage.getItem('moreader_sync_server') || DEFAULT_SERVER)
  const token = ref(localStorage.getItem('moreader_sync_token') || null)
  const email = ref(localStorage.getItem('moreader_sync_email') || null)
  const isUploading = ref(false)
  const isDownloading = ref(false)
  const syncResult = ref<string | null>(null)
  const lastUploadTime = ref<number | null>(
    localStorage.getItem('moreader_last_upload') ? Number(localStorage.getItem('moreader_last_upload')) : null
  )
  const lastDownloadTime = ref<number | null>(
    localStorage.getItem('moreader_last_download') ? Number(localStorage.getItem('moreader_last_download')) : null
  )

  const isLoggedIn = computed(() => token.value !== null)
  const loggedEmail = computed(() => email.value)

  // ═══ 云书架 ═══
  const cloudBooks = ref<CloudBook[]>([])
  const loadingCloud = ref(false)
  const uploadingBookId = ref<string | null>(null)
  const downloadingBookId = ref<number | null>(null)

  /** 格式化显示用的上次上传/下载时间 */
  const lastUploadLabel = computed(() => {
    if (!lastUploadTime.value) return null
    const delta = Date.now() - lastUploadTime.value
    if (delta < 60_000) return '刚刚'
    if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`
    if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`
    return new Date(lastUploadTime.value).toLocaleDateString()
  })

  const lastDownloadLabel = computed(() => {
    if (!lastDownloadTime.value) return null
    const delta = Date.now() - lastDownloadTime.value
    if (delta < 60_000) return '刚刚'
    if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`
    if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`
    return new Date(lastDownloadTime.value).toLocaleDateString()
  })

  function setServerUrl(url: string) {
    serverUrl.value = url
    localStorage.setItem('moreader_sync_server', url)
  }

  async function login(loginEmail: string, password: string): Promise<void> {
    const resp = await fetch(`${serverUrl.value}/sync/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password }),
    })
    if (!resp.ok) {
      const err = await resp.json()
      throw new Error(err.detail || '登录失败')
    }
    const data = await resp.json()
    token.value = data.token
    email.value = data.user.email
    localStorage.setItem('moreader_sync_token', data.token)
    localStorage.setItem('moreader_sync_email', data.user.email)
  }

  function logout() {
    token.value = null
    email.value = null
    syncResult.value = null
    localStorage.removeItem('moreader_sync_token')
    localStorage.removeItem('moreader_sync_email')
  }

  /** 从本地 Pinia stores 收集所有书籍的同步数据 */
  function collectLocalData(): SyncBookData[] {
    const bookStore = useBookStore()
    const bookmarkStore = useBookmarkStore()
    const highlightStore = useHighlightStore()

    return bookStore.books.map(book => ({
      title: book.title,
      author: book.author || '',
      progress: {
        location: book.currentLocation,
        percentage: book.progress,
        lastRead: book.lastRead,
      },
      bookmarks: bookmarkStore.bookmarks
        .filter(b => b.bookId === book.id)
        .map(b => ({
          cfi: b.cfi,
          text: b.text,
          chapterHint: b.chapterHint || '',
          createdAt: b.createdAt,
        })),
      highlights: highlightStore.highlights
        .filter(h => h.bookId === book.id)
        .map(h => ({
          cfiRange: h.cfiRange,
          text: h.text,
          color: h.color || '#FFE082',
          note: h.note || '',
          createdAt: h.createdAt,
        })),
    }))
  }

  /** 上传：本地数据覆盖云端（DELETE-INSERT 语义） */
  async function uploadToCloud(): Promise<string> {
    if (!token.value) throw new Error('未登录')
    isUploading.value = true
    syncResult.value = '上传中...'
    try {
      const localBooks = collectLocalData()

      const pushResp = await fetch(`${serverUrl.value}/sync/browser/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
        },
        body: JSON.stringify({ books: localBooks }),
      })
      if (!pushResp.ok) throw new Error(`上传失败: ${pushResp.status}`)
      const result = await pushResp.json()

      lastUploadTime.value = Date.now()
      localStorage.setItem('moreader_last_upload', String(lastUploadTime.value))

      const msg = `上传完成: ${result.synced} 本书`
      syncResult.value = msg
      return msg
    } catch (e: any) {
      syncResult.value = `上传失败: ${e.message}`
      throw e
    } finally {
      isUploading.value = false
    }
  }

  /** 下载：云端数据覆盖本地（完全替换） */
  async function downloadFromCloud(): Promise<string> {
    if (!token.value) throw new Error('未登录')
    isDownloading.value = true
    syncResult.value = '下载中...'
    try {
      const pullResp = await fetch(`${serverUrl.value}/sync/browser/pull`, {
        headers: { 'Authorization': `Bearer ${token.value}` },
      })
      if (!pullResp.ok) throw new Error(`下载失败: ${pullResp.status}`)
      const cloudData = await pullResp.json()
      const cloudBooks: SyncBookData[] = cloudData.books || []

      // 完全清除本地数据，再写入云端数据
      await applyPullDataFullReplace(cloudBooks)

      lastDownloadTime.value = Date.now()
      localStorage.setItem('moreader_last_download', String(lastDownloadTime.value))

      const msg = `下载完成: ${cloudBooks.length} 本书`
      syncResult.value = msg
      return msg
    } catch (e: any) {
      syncResult.value = `下载失败: ${e.message}`
      throw e
    } finally {
      isDownloading.value = false
    }
  }

  /** 完全清除本地书签和高亮，用云端数据覆盖（进度取大值） */
  async function applyPullDataFullReplace(cloudBooks: SyncBookData[]) {
    const bookStore = useBookStore()
    const bookmarkStore = useBookmarkStore()
    const highlightStore = useHighlightStore()

    for (const cb of cloudBooks) {
      // 按书名匹配本地书籍
      const localBook = bookStore.books.find(b => b.title === cb.title)
      if (!localBook) continue

      // ── 进度：取大值（不覆盖更远的进度） ──
      const cloudPct = cb.progress?.percentage
      const localPct = localBook.progress
      if (cloudPct !== undefined && cloudPct > 0) {
        if (localPct === undefined || cloudPct > localPct) {
          bookStore.updateProgress(localBook.id, cb.progress?.location || '', cloudPct)
        }
      }

      // ── 书签：删除本地全部 → 写入云端全部 ──
      const oldBms = bookmarkStore.bookmarks.filter(b => b.bookId === localBook.id)
      for (const bm of oldBms) {
        await bookmarkStore.remove(bm.id)
      }
      for (const bm of (cb.bookmarks || [])) {
        await bookmarkStore.add({
          bookId: localBook.id,
          bookTitle: localBook.title,
          cfi: bm.cfi || '',
          text: bm.text || '',
          chapterHint: bm.chapterHint || '',
        })
      }

      // ── 高亮：删除本地全部 → 写入云端全部 ──
      const oldHls = highlightStore.highlights.filter(h => h.bookId === localBook.id)
      for (const hl of oldHls) {
        await highlightStore.remove(hl.id)
      }
      for (const hl of (cb.highlights || [])) {
        await highlightStore.add({
          bookId: localBook.id,
          bookTitle: localBook.title,
          cfiRange: hl.cfiRange || '',
          text: hl.text || '',
          color: hl.color || '#FFE082',
          note: hl.note || '',
        })
      }
    }
  }

  // ═══ 云书架 API ═══

  /** 获取云端书架列表 */
  async function listCloudBooks(): Promise<CloudBook[]> {
    if (!token.value) throw new Error('未登录')
    loadingCloud.value = true
    try {
      const resp = await fetch(`${serverUrl.value}/sync/books`, {
        headers: { 'Authorization': `Bearer ${token.value}` },
      })
      if (!resp.ok) throw new Error(`获取云端书架失败: ${resp.status}`)
      const data = await resp.json()
      cloudBooks.value = data || []
      return cloudBooks.value
    } finally {
      loadingCloud.value = false
    }
  }

  /** 上传本地 EPUB 到云书架 */
  async function uploadBook(bookId: string): Promise<void> {
    if (!token.value) throw new Error('未登录')
    const bookStore = useBookStore()
    const book = bookStore.books.find(b => b.id === bookId)
    if (!book) throw new Error('书籍不存在')

    uploadingBookId.value = bookId
    try {
      // 从 IndexedDB 读取 EPUB 二进制
      const arrayBuffer = await bookStore.loadBookBinary(bookId)
      if (!arrayBuffer) throw new Error('无法读取书籍数据')

      // 构建 FormData（multipart）
      const formData = new FormData()
      formData.append('file', new Blob([arrayBuffer], { type: 'application/epub+zip' }),
        `${book.title}.epub`)

      const resp = await fetch(`${serverUrl.value}/sync/books/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token.value}` },
        body: formData,
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || '上传失败')
      }
      // 上传后刷新云端列表
      await listCloudBooks()
    } finally {
      uploadingBookId.value = null
    }
  }

  /** 从云书架下载 EPUB 到本地 */
  async function downloadBook(cloudBook: CloudBook): Promise<string> {
    if (!token.value) throw new Error('未登录')
    const bookStore = useBookStore()

    downloadingBookId.value = cloudBook.id
    try {
      const resp = await fetch(`${serverUrl.value}/sync/books/${cloudBook.id}/download`, {
        headers: { 'Authorization': `Bearer ${token.value}` },
      })
      if (!resp.ok) throw new Error(`下载失败: ${resp.status}`)
      const arrayBuffer = await resp.arrayBuffer()

      // 检查本地是否已有同名书（去重）
      if (bookStore.books.some(b => b.title === cloudBook.title)) {
        throw new Error(`「${cloudBook.title}」已在本地书架中`)
      }

      // ── 从 EPUB zip 中提取封面（与 bookStore.extractMetadata 同等逻辑） ──
      let coverBase64: string | undefined
      try {
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(arrayBuffer)
        // 查找常见封面路径：cover.* 或 第一个大图
        const coverPath = Object.keys(zip.files).find(name =>
          /cover\.(jpg|jpeg|png|webp)/i.test(name) && !zip.files[name].dir
        ) || Object.keys(zip.files).find(name =>
          /\.(jpg|jpeg|png)$/i.test(name) && !zip.files[name].dir
            && zip.files[name]._data?.uncompressedSize > 5000  // 至少 5KB
        )
        if (coverPath) {
          const blob = await zip.files[coverPath].async('blob')
          coverBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        }
      } catch { /* cover extraction is best-effort */ }

      // 保存到 IndexedDB
      const id = crypto.randomUUID()
      const { db, metadataDb } = await import('@/utils/db')
      await db.setItem(id, arrayBuffer)
      const metadata = {
        id,
        title: cloudBook.title,
        author: cloudBook.author || '',
        cover: coverBase64,
        addedAt: Date.now(),
      }
      await metadataDb.setItem(id, metadata)
      
      // 更新 reactive 列表
      bookStore.books.unshift(metadata)
      bookStore.books.sort((a, b) => (b.lastRead || b.addedAt) - (a.lastRead || a.addedAt))

      // ── 拉取云端同步元数据（书签/高亮/进度） ──
      try {
        const pullResp = await fetch(`${serverUrl.value}/sync/browser/pull`, {
          headers: { 'Authorization': `Bearer ${token.value}` },
        })
        if (pullResp.ok) {
          const cloudData = await pullResp.json()
          const cloudBooks: SyncBookData[] = cloudData.books || []
          // 只看刚下载的这本书
          const relevant = cloudBooks.filter((cb: SyncBookData) => cb.title === cloudBook.title)
          if (relevant.length > 0) {
            await applyPullDataFullReplace(relevant)
          }
        }
      } catch (e) {
        console.warn('下载后同步元数据失败（不影响下载）:', e)
      }

      return id
    } finally {
      downloadingBookId.value = null
    }
  }

  /** 从云书架删除书籍 */
  async function deleteCloudBook(cloudBookId: number): Promise<void> {
    if (!token.value) throw new Error('未登录')
    const resp = await fetch(`${serverUrl.value}/sync/books/${cloudBookId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token.value}` },
    })
    if (!resp.ok) throw new Error(`删除失败: ${resp.status}`)
    cloudBooks.value = cloudBooks.value.filter(b => b.id !== cloudBookId)
  }

  return {
    serverUrl, token, email, isUploading, isDownloading, syncResult,
    lastUploadTime, lastDownloadTime, lastUploadLabel, lastDownloadLabel,
    isLoggedIn, loggedEmail,
    cloudBooks, loadingCloud, uploadingBookId, downloadingBookId,
    setServerUrl, login, logout, uploadToCloud, downloadFromCloud, collectLocalData,
    listCloudBooks, uploadBook, downloadBook, deleteCloudBook,
  }
})
