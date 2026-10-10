import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  OFFICIAL_TTS_ENDPOINT,
  secureTtsEndpoint,
  secureUrl,
  isPrivateHost,
  isLegacyTtsEndpoint,
} from '@/utils/secureUrl'

vi.mock('@/i18n', () => ({
  t: (k: string) => k,
}))

import { useSyncStore } from '@/stores/syncStore'
import { useTTSStore } from '@/stores/ttsStore'

describe('明文 HTTP 安全治理（Chrome 应用商店数据安全合规）', () => {
  it('① 历史官方明文语音节点平滑迁移到官方 HTTPS 节点', () => {
    expect(secureTtsEndpoint('http://p-plus.duckdns.org:5001')).toBe(OFFICIAL_TTS_ENDPOINT)
    expect(secureTtsEndpoint('http://powerplus.blogsyte.com:5001')).toBe(OFFICIAL_TTS_ENDPOINT)
    expect(secureTtsEndpoint('http://p-plus.duckdns.org:5001/')).toBe(OFFICIAL_TTS_ENDPOINT)
    expect(isLegacyTtsEndpoint('http://p-plus.duckdns.org:5001')).toBe(true)
  })

  it('② 用户自定义公网 http 地址就地升级为 https', () => {
    expect(secureUrl('http://tts.example.com:5001')).toBe('https://tts.example.com:5001')
    expect(secureUrl('http://api.example.com/v1')).toBe('https://api.example.com/v1')
    expect(secureTtsEndpoint('http://my-tts-server.com:5001')).toBe('https://my-tts-server.com:5001')
  })

  it('③ 局域网 / 本机地址保留明文，不影响用户自建部署', () => {
    const lanUrls = [
      'http://192.168.1.50:5001',
      'http://10.0.0.9:5244/dav',
      'http://172.16.5.5:5001',
      'http://localhost:5001',
      'http://127.0.0.1:5001',
      'http://nas.local:5001/dav',
    ]
    for (const u of lanUrls) {
      expect(secureUrl(u)).toBe(u)
      expect(isPrivateHost(new URL(u).hostname)).toBe(true)
    }
  })

  it('④ 已是 HTTPS 的地址原样返回，空地址回退到官方节点', () => {
    const https = 'https://liang-studio.duckdns.org/edge-tts'
    expect(secureUrl(https)).toBe(https)
    expect(secureTtsEndpoint(https)).toBe(https)
    expect(secureTtsEndpoint('')).toBe(OFFICIAL_TTS_ENDPOINT)
  })

  it('⑤ 官方节点为全链路 HTTPS', () => {
    expect(OFFICIAL_TTS_ENDPOINT.startsWith('https://')).toBe(true)
  })
})

describe('默认配置不再指向任何明文私有服务', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('⑥ TTS 默认节点为官方 HTTPS 节点', () => {
    const tts = useTTSStore()
    expect(tts.edgeTTSEndpoint).toBe(OFFICIAL_TTS_ENDPOINT)
    expect(String(tts.edgeTTSEndpoint).startsWith('http://')).toBe(false)
  })

  it('⑦ 老用户 localStorage 里的明文节点被自动迁移', () => {
    localStorage.setItem('moreader_tts_settings', JSON.stringify({
      provider: 'edge',
      edgeEndpoint: 'http://p-plus.duckdns.org:5001',
    }))
    setActivePinia(createPinia())
    const tts = useTTSStore()
    expect(tts.edgeTTSEndpoint).toBe(OFFICIAL_TTS_ENDPOINT)
  })

  it('⑧ 设置接口写入公网明文地址时也会被升级为 HTTPS', () => {
    const tts = useTTSStore()
    tts.setEdgeTTSEndpoint('http://tts.somepublicserver.com:5001')
    expect(tts.edgeTTSEndpoint).toBe('https://tts.somepublicserver.com:5001')
  })

  it('⑨ 云端同步默认不预置任何明文私有服务地址', () => {
    const sync = useSyncStore()
    sync.setPreset('alist')
    expect(sync.config.url).toBe('')
    sync.setPreset('jianguo')
    expect(sync.config.url.startsWith('https://')).toBe(true)
  })

  it('⑩ 用户自定义的 WebDAV 配置与状态完整持久化，重新加载不被清空', () => {
    localStorage.setItem('moreader_webdav_config', JSON.stringify({
      preset: 'alist',
      url: 'http://p-plus.duckdns.org:6355/dav',
      username: 'u',
      password: 'p',
      verified: true,
    }))
    setActivePinia(createPinia())
    const sync = useSyncStore()
    expect(sync.config.url).toBe('http://p-plus.duckdns.org:6355/dav')
    expect(sync.config.username).toBe('u')
    expect(sync.config.password).toBe('p')
    expect(sync.isVerified).toBe(true)
    expect(sync.verifyState).toBe('ok')
  })
})
