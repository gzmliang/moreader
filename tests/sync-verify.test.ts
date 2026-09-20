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
    // MKCOL 阶段即被 401 拦下（ensureDirectory 加固后不再静默吞掉鉴权失败）
    expect(r.message).toBe('ERRUnauth')
    expect(r.message).not.toBe('connected')
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

  it('⑤ 防抖：输入过程中不应立刻发请求（等 800ms）', async () => {
    const s = useSyncStore()
    const spy = vi.fn(async () => new Response('xml', { status: 207 }))
    vi.stubGlobal('fetch', spy)
    s.config.url = 'http://localhost:9999/dav'
    s.config.username = 'u'
    s.config.password = 'a'
    await new Promise(r => setTimeout(r, 100))
    expect(spy).not.toHaveBeenCalled()   // 100ms 时还没探测
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
  })
})
