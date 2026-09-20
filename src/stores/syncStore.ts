import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { t } from '@/i18n'
import { useBookStore } from './bookStore'
import { useBookmarkStore } from './bookmarkStore'
import { useHighlightStore } from './highlightStore'

export interface WebDavConfig {
  preset: 'jianguo' | 'alist' | 'custom'
  url: string
  username: string
  password: string
  /** 上一次真实探测是否成功（持久化，避免刷新页面后丢失真实验证结论） */
  verified?: boolean
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

  /**
   * 连接验证状态机：
   *  - 'idle'      尚未验证（刚填完配置 / 配置被改动过）
   *  - 'verifying' 正在向云端发起真实探测（PROPFIND）
   *  - 'ok'        真实探测成功过（HTTP 200 / 207）
   *  - 'error'     真实探测失败（401 / 403 / 网络错误等）
   * 注意：绝不能再用「三个输入框非空」冒充「已连接」，那是 401 谎报为已就绪的病根。
   */
  type VerifyState = 'idle' | 'verifying' | 'ok' | 'error'
  const verifyState = ref<VerifyState>(loadConfig().verified ? 'ok' : 'idle')

  /** 上次真实探测的云端 HTTP 状态码，0 表示未探测或网络层失败 */
  const verifyStatusCode = ref<number>(0)
  const verifyMessage = ref<string>('')
  const isUploading = ref(false)
  const isDownloading = ref(false)
  const syncResult = ref<string | null>(null)

  const cloudBooks = ref<CloudBook[]>([])
  const loadingCloud = ref(false)
  /** 云端列表拉取失败的真实原因（供书架页展示，不再静默留空） */
  const cloudListError = ref<string | null>(null)
  const uploadingBookId = ref<string | null>(null)
  const downloadingBookId = ref<string | null>(null)

  const lastUploadTime = ref<number | null>(
    localStorage.getItem('moreader_last_upload') ? Number(localStorage.getItem('moreader_last_upload')) : null
  )
  const lastDownloadTime = ref<number | null>(
    localStorage.getItem('moreader_last_download') ? Number(localStorage.getItem('moreader_last_download')) : null
  )

  /** 是否「填」过配置：仅用于决定界面是否展示云端面板，绝不代表连接可用 */
  const isConfigured = computed(() => !!(config.value.url && config.value.username && config.value.password))

  /** 是否「真实连通」：只有云端真实返回成功才会为 true —— 面板上的「已就绪」只认它 */
  const isVerified = computed(() => verifyState.value === 'ok' && isConfigured.value)

  /** 是否正在向云端发起真实探测 */
  const isVerifying = computed(() => verifyState.value === 'verifying')

  /** 兼容旧调用点：语义上等同「已配置」，内部逻辑一律改用 isConfigured / isVerified */
  const isLoggedIn = computed(() => isConfigured.value)

  const loggedEmail = computed(() => config.value.username || 'WebDAV')

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config.value, verified: isVerified.value }))
  }

  /** 配置发生任何实质变化时，立即把验证状态打回未验证，并落盘，杜绝「旧的成功结论」冒充新配置 */
  function resetVerifyState() {
    verifyState.value = 'idle'
    verifyStatusCode.value = 0
    verifyMessage.value = ''
    // 关键：同步把 verified 落盘，否则刷新页面会从 localStorage 读回旧的 true，误显示「已就绪」
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config.value, verified: false }))
  }

  watch(
    () => [config.value.url, config.value.username, config.value.password],
    () => {
      // 配置一变，之前的「已就绪」立刻失效
      if (verifyState.value !== 'idle') resetVerifyState()
    }
  )

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

  /**
   * 确保云端目录存在 (MKCOL)
   * 目录已存在会返回 405 Method Not Allowed，属正常；
   * 但 401/403 鉴权失败必须显式上抛，不再静默吞掉，否则错误会飘到后续 PUT/GET 才暴露。
   */
  async function ensureDirectory(): Promise<void> {
    const url = getBaseUrl()
    let resp: Response
    try {
      resp = await fetch(url, {
        method: 'MKCOL',
        headers: { Authorization: getAuthHeader() },
      })
    } catch (e) {
      // 网络层异常（如 CORS 预检失败）不在此阻断，交由后续 PROPFIND 给出最终结论
      return
    }
    // 201 创建成功 / 405 目录已存在，均为正常
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(t('sync.errUnauthorized', { status: resp.status }))
    }
  }

  /**
   * 真实探测云端连通性（唯一可信的"连接"判据）
   * @param silent 自动防抖探测时为 true：成功不弹提示、失败也不打断输入，只把状态机改成 error
   */
  async function probeConnection(silent = false): Promise<{ ok: boolean; message: string }> {
    if (!isConfigured.value) {
      resetVerifyState()
      return { ok: false, message: t('sync.errIncomplete') }
    }

    verifyState.value = 'verifying'
    verifyStatusCode.value = 0
    if (!silent) verifyMessage.value = ''

    try {
      const resp = await fetch(getBaseUrl(), {
        method: 'PROPFIND',
        headers: {
          Authorization: getAuthHeader(),
          Depth: '0',
        },
      })

      verifyStatusCode.value = resp.status

      if (resp.ok || resp.status === 207) {
        verifyState.value = 'ok'
        const msg = t('sync.msgConnected')
        verifyMessage.value = msg
        saveConfig()
        return { ok: true, message: msg }
      }

      verifyState.value = 'error'
      let msg: string
      if (resp.status === 401) {
        msg = t('sync.err401')
      } else if (resp.status === 403) {
        msg = t('sync.err403')
      } else if (resp.status === 404) {
        msg = t('sync.err404')
      } else if (resp.status === 405) {
        msg = t('sync.err405')
      } else if (resp.status >= 500) {
        msg = t('sync.err5xx', { status: resp.status })
      } else {
        msg = t('sync.errHttp', { status: resp.status })
      }
      verifyMessage.value = msg
      return { ok: false, message: msg }
    } catch (e: any) {
      verifyState.value = 'error'
      const msg = t('sync.errNetwork', { error: e?.message || String(e) })
      verifyMessage.value = msg
      return { ok: false, message: msg }
    }
  }

  // ===== 自动验证（方案 B 修正版）=====
  // 教训：早期版本“一边输入一边探测”，密码才输几个字就必然失败并刷出“连接异常”，
  // 反复打断用户。现改为：输入阶段完全不打扰，只在用户「离开输入框」或「显式点按钮」时才向云端求证。
  let probeTimer: ReturnType<typeof setTimeout> | null = null
  /** 用户显式请求验证（blur）的待执行标记，避免被 watch 误清除 */
  let verifyRequested = false

  /** 配置是否写完了（三项均非空且密码看起来不是刚敲的半截） */
  function looksComplete(): boolean {
    const p = (config.value.password || '').trim()
    const u = (config.value.username || '').trim()
    const l = (config.value.url || '').trim()
    return !!l && !!u && p.length >= 2
  }

  /**
   * 用户离开输入框（blur）时才触发的自动验证。
   * 注意：watch 会在下一个 tick 执行，切勿在此使用会被 watch 清掉的定时器。
   * 这里用 verifyRequested 标记，由 watch 在配置稳定后消化，保证 blur 一定会验证。
   */
  function scheduleAutoVerify(): void {
    if (probeTimer) clearTimeout(probeTimer)
    if (!looksComplete()) {
      resetVerifyState()
      return
    }
    verifyRequested = true
    probeTimer = setTimeout(() => {
      if (verifyRequested) {
        verifyRequested = false
        void probeConnection(true)
      }
    }, 400)
  }

  // 配置变化时：只在「不完整」时清状态；完整时不动 blur 已排定的探测
  watch(
    () => [config.value.url, config.value.username, config.value.password],
    () => {
      if (!looksComplete()) {
        verifyRequested = false
        if (probeTimer) { clearTimeout(probeTimer); probeTimer = null }
        if (verifyState.value !== 'idle') resetVerifyState()
      }
      // 配置已完整时不主动探测，也不清除 blur 排定的探测：探测由 blur / 按钮 / 列书单触发
    }
  )

  /** 测试连接（用户显式点击 / 输入框失焦）：真实探测 */
  async function testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!isConfigured.value) {
      return { ok: false, message: t('sync.errIncomplete') }
    }
    // 建目录只是尽力而为，失败（如 AList 不支持 MKCOL）不应阻断连接结论
    void ensureDirectory().catch(() => {})
    return await probeConnection(false)
  }

  /** 退出/清除配置 */
  function logout() {
    config.value.username = ''
    config.value.password = ''
    cloudBooks.value = []
    cloudListError.value = null
    resetVerifyState()
    saveConfig()
  }

  /** 上传阅读数据（进度、书签、高亮） */
  async function uploadToCloud(): Promise<void> {
    if (!isConfigured.value) throw new Error(t('sync.errIncomplete'))
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
        throw new Error(t('sync.errUpload', { status: resp.status }))
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
    if (!isConfigured.value) throw new Error(t('sync.errIncomplete'))
    isDownloading.value = true
    syncResult.value = null

    try {
      const syncUrl = `${getBaseUrl()}/moreader-sync-data.json?t=${Date.now()}`
      const resp = await fetch(syncUrl, {
        headers: { Authorization: getAuthHeader() },
      })

      if (resp.status === 401) {
        throw new Error(t('sync.err401'))
      }
      if (resp.status === 404) {
        throw new Error(t('sync.errNoCloudData'))
      }
      if (!resp.ok) {
        throw new Error(t('sync.errDownload', { status: resp.status }))
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
    if (!isConfigured.value) return
    loadingCloud.value = true
    cloudListError.value = null
    try {
      // 注意：列表操作绝不需要 MKCOL 建目录。
      // AList 等网盘的 MKCOL 普遍返回 405，调用它只会制造无谓失败与歧义。
      const resp = await fetch(getBaseUrl(), {
        method: 'PROPFIND',
        headers: {
          Authorization: getAuthHeader(),
          Depth: '1',
        },
      })

      if (resp.status === 401 || resp.status === 403) {
        verifyState.value = 'error'
        verifyStatusCode.value = resp.status
        verifyMessage.value = t('sync.err401')
        cloudListError.value = t('sync.err401')
        return
      }
      if (resp.status === 404) {
        // 常见病因：填了不存在的子目录（如 /dav/Books 而实际只有 /dav/media）
        verifyState.value = 'error'
        verifyStatusCode.value = 404
        verifyMessage.value = t('sync.err404')
        cloudListError.value = t('sync.err404')
        return
      }
      if (!resp.ok && resp.status !== 207) {
        verifyState.value = 'error'
        verifyStatusCode.value = resp.status
        verifyMessage.value = t('sync.errHttp', { status: resp.status })
        cloudListError.value = t('sync.errHttp', { status: resp.status })
        return
      }

      verifyState.value = 'ok'
      verifyStatusCode.value = resp.status
      verifyMessage.value = ''

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
    } catch (e: any) {
      cloudListError.value = t('sync.errNetwork', { error: e?.message || String(e) })
      console.warn('Failed to list cloud books via WebDAV:', e)
    } finally {
      loadingCloud.value = false
    }
  }

  /** 上传单本电子书到云端 */
  async function uploadBook(bookId: string): Promise<void> {
    if (!isConfigured.value) throw new Error(t('sync.errIncomplete'))
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
    if (!isConfigured.value) throw new Error(t('sync.errIncomplete'))
    downloadingBookId.value = cb.id
    try {
      const fileUrl = `${getBaseUrl()}/${encodeURIComponent(cb.filename)}`
      const resp = await fetch(fileUrl, {
        headers: { Authorization: getAuthHeader() },
      })
      if (resp.status === 401) throw new Error(t('sync.err401'))
      if (!resp.ok) throw new Error(t('sync.errBookDownload', { status: resp.status }))

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
    if (!isConfigured.value) throw new Error(t('sync.errIncomplete'))
    const fileUrl = `${getBaseUrl()}/${encodeURIComponent(cbId)}`
    const resp = await fetch(fileUrl, {
      method: 'DELETE',
      headers: { Authorization: getAuthHeader() },
    })
    if (!resp.ok && resp.status !== 204 && resp.status !== 404) {
      throw new Error(t('sync.errDelete', { status: resp.status }))
    }
    cloudBooks.value = cloudBooks.value.filter(b => b.id !== cbId)
  }

  return {
    config,
    isLoggedIn,
    isConfigured,
    isVerified,
    isVerifying,
    verifyState,
    verifyStatusCode,
    verifyMessage,
    loggedEmail,
    isUploading,
    isDownloading,
    syncResult,
    lastUploadLabel: computed(() => lastUploadTime.value ? new Date(lastUploadTime.value).toLocaleString() : null),
    lastDownloadLabel: computed(() => lastDownloadTime.value ? new Date(lastDownloadTime.value).toLocaleString() : null),
    cloudBooks,
    loadingCloud,
    cloudListError,
    uploadingBookId,
    downloadingBookId,
    setPreset,
    saveConfig,
    testConnection,
    scheduleAutoVerify,
    probeConnection,
    logout,
    uploadToCloud,
    downloadFromCloud,
    listCloudBooks,
    uploadBook,
    downloadBook,
    deleteCloudBook,
  }
})
