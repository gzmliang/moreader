import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/i18n', () => ({
  t: (k: string, p?: any) => {
    const m: Record<string, string> = {
      'sync.errIncomplete': 'incomplete',
      'sync.msgConnected': 'connected',
      'sync.err401': 'ERR401',
      'sync.err403': 'ERR403',
      'sync.err404': 'ERR404',
      'sync.err405': 'ERR405',
      'sync.err5xx': 'ERR5xx',
      'sync.errHttp': 'ERRHttp',
      'sync.errNetwork': 'ERRNet',
      'sync.errUpload': 'ERRUp',
      'sync.errDownload': 'ERRDown',
      'sync.errNoCloudData': 'ERRNoData',
      'sync.errUnauthorized': 'ERRUnauth',
      'sync.errBookDownload': 'ERRBook',
      'sync.errDelete': 'ERRDel',
    }
    let s = m[k] ?? k
    if (p) for (const [kk, vv] of Object.entries(p)) s = s.replace(`{${kk}}`, String(vv))
    return s
  },
}))

import { useSyncStore } from '@/stores/syncStore'

describe('syncStore 连接状态机（模拟真实 WebDAV）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('① 只填一个字：不再冒充已就绪，状态为 idle', async () => {
    const s = useSyncStore()
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'x'   // 只输 1 个字符
    expect(s.isConfigured).toBe(true)
    expect(s.isVerified).toBe(false)   // 关键：不再是 true
    expect(s.verifyState).toBe('idle')
  })

  it('② 云端返回 401：状态变 error，绝不为 ok', async () => {
    const s = useSyncStore()
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'wrong'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 401 })))
    const r = await s.testConnection()
    expect(r.ok).toBe(false)
    // PROPFIND 返回 401 -> 明确报鉴权失败，绝不为 ok
    expect(r.message).toBe('ERR401')
    expect(s.verifyState).toBe('error')
    expect(s.isVerified).toBe(false)
  })

  it('③ 云端返回 207：状态变 ok，显示真·已就绪', async () => {
    const s = useSyncStore()
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'right'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('xml', { status: 207 })))
    const r = await s.testConnection()
    expect(r.ok).toBe(true)
    expect(s.verifyState).toBe('ok')
    expect(s.isVerified).toBe(true)
  })

  it('④ 验证成功后再改密码：立刻降级为 idle，旧结论作废', async () => {
    const s = useSyncStore()
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'right'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('xml', { status: 207 })))
    await s.testConnection()
    expect(s.isVerified).toBe(true)

    s.config.password = 'right2'      // 用户改了密码
    await new Promise(r => setTimeout(r, 0))
    expect(s.verifyState).toBe('idle') // 旧的「已就绪」立即失效
    expect(s.isVerified).toBe(false)
  })

  it('⑤ 输入过程中绝不发请求（修掉“边输边报错”的病根）', async () => {
    const s = useSyncStore()
    const spy = vi.fn(async () => new Response('xml', { status: 207 }))
    vi.stubGlobal('fetch', spy)
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    // 模拟逐字输入密码
    for (const ch of 'password') {
      s.config.password += ch
      await new Promise(r => setTimeout(r, 30))
    }
    await new Promise(r => setTimeout(r, 1000))
    expect(spy).not.toHaveBeenCalled()   // 输入全程零请求，界面不被打扰
  })

  it('⑤b blur 后才真实探测（退出输入框才验证）', async () => {
    const s = useSyncStore()
    const spy = vi.fn(async () => new Response('xml', { status: 207 }))
    vi.stubGlobal('fetch', spy)
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'right'
    s.scheduleAutoVerify()               // 模拟 blur
    await new Promise(r => setTimeout(r, 700))
    expect(spy).toHaveBeenCalled()
    expect(s.verifyState).toBe('ok')
  })

  it('⑦ 路径不存在(404)：报明确路径错误，不再笼统说“连接异常”', async () => {
    const s = useSyncStore()
    s.config.url = 'http://localhost:9999/dav/NotExist'
    s.config.username = 'u'
    s.config.password = 'right'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nf', { status: 404 })))
    // listCloudBooks 应把 404 写入 cloudListError
    await s.listCloudBooks()
    expect(s.verifyState).toBe('error')
    expect(s.cloudListError).toBe('ERR404')
    expect(s.cloudBooks.length).toBe(0)
  })

  it('⑧ listCloudBooks 不再先发 MKCOL（列表操作不该建目录）', async () => {
    const s = useSyncStore()
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'right'
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: any, init: any) => {
      calls.push(init?.method || 'GET')
      return new Response('<xml/>', { status: 207 })
    }))
    await s.listCloudBooks()
    expect(calls).not.toContain('MKCOL')
    expect(calls).toContain('PROPFIND')
  })

  it('⑥ 退出登录：状态彻底清空', async () => {
    const s = useSyncStore()
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'right'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('xml', { status: 207 })))
    await s.testConnection()
    s.logout()
    expect(s.isVerified).toBe(false)
    expect(s.isConfigured).toBe(false)
    expect(s.verifyState).toBe('idle')
    expect(s.cloudListError).toBe(null)
  })
})

describe('云端目录浏览（移植自安卓端设计）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function makeConfig(s: any) {
    s.config.url = 'http://host:5244/dav'
    s.config.username = 'u'
    s.config.password = 'p'
  }

  it('⑨ 根地址 + 选定目录 = 实际访问地址', () => {
    const s = useSyncStore()
    makeConfig(s)
    expect(s.getRootUrl()).toBe('http://host:5244/dav')
    expect(s.getSelectedDir()).toBe('')
    s.setSelectedDir('/media/books')
    expect(s.getSelectedDir()).toBe('/media/books')
    expect(s.buildUrlForDir('')).toBe('http://host:5244/dav')
    expect(s.buildUrlForDir('/media/books')).toBe('http://host:5244/dav/media/books')
  })

  it('⑩ 目录拼接容错：多重斜杠/尾斜杠都能归一', () => {
    const s = useSyncStore()
    makeConfig(s)
    s.config.url = 'http://host:5244/dav///'
    expect(s.getRootUrl()).toBe('http://host:5244/dav')
    s.setSelectedDir('///media/books///')
    expect(s.getSelectedDir()).toBe('/media/books')
    expect(s.buildUrlForDir('media/books')).toBe('http://host:5244/dav/media/books')
  })

  it('⑪ listDir 解析目录与文件，过滤 .moreader.json 伴侣文件', async () => {
    const s = useSyncStore()
    makeConfig(s)
    const xml = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:">
  <D:response><D:href>/dav/media/</D:href><D:propstat><D:prop><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response>
  <D:response><D:href>/dav/media/books/</D:href><D:propstat><D:prop><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response>
  <D:response><D:href>/dav/media/a.epub</D:href><D:propstat><D:prop><D:resourcetype/><D:getcontentlength>123</D:getcontentlength></D:prop></D:propstat></D:response>
  <D:response><D:href>/dav/media/a.moreader.json</D:href><D:propstat><D:prop><D:resourcetype/><D:getcontentlength>10</D:getcontentlength></D:prop></D:propstat></D:response>
</D:multistatus>`
    vi.stubGlobal('fetch', vi.fn(async () => new Response(xml, { status: 207 })))
    await s.listDir('media')
    const names = s.browseItems.map(i => i.name)
    expect(names).toContain('books')
    expect(names).toContain('a.epub')
    expect(names).not.toContain('a.moreader.json')
    // 目录排在文件前面
    expect(s.browseItems[0].isDirectory).toBe(true)
    expect(s.browseError).toBe(null)
  })

  it('⑫ 选定目录写入配置并持久化', () => {
    const s = useSyncStore()
    makeConfig(s)
    s.setSelectedDir('/media/books')
    const saved = JSON.parse(localStorage.getItem('moreader_webdav_config') || '{}')
    expect(saved.dir).toBe('/media/books')
  })

  it('⑬ 旧配置无 dir 字段时安全兼容（行为与旧版一致）', () => {
    localStorage.setItem('moreader_webdav_config', JSON.stringify({
      preset: 'alist',
      url: 'http://host:5244/dav/media/books',
      username: 'u',
      password: 'p',
    }))
    setActivePinia(createPinia())
    const s = useSyncStore()
    expect(s.config.dir).toBe('')
    // 未选目录时，整个 url 就是目标地址，与旧版行为一致
    expect(s.getRootUrl() + s.getSelectedDir()).toBe('http://host:5244/dav/media/books')
  })
})
