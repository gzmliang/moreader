import { describe, it, expect } from 'vitest'
import { useTTSStore } from '@/stores/ttsStore'
import { setActivePinia, createPinia } from 'pinia'

describe('VoicePicker and Edge Voices', () => {
  setActivePinia(createPinia())
  const ttsStore = useTTSStore()

  it('contains full rich Edge-TTS voices including Chinese dialects and natural English voices', () => {
    const voices = ttsStore.edgeTTSVoices
    expect(voices.length).toBeGreaterThanOrEqual(50)

    const ids = voices.map(v => v.id)
    // 中文普通话与方言
    expect(ids).toContain('zh-CN-XiaoxiaoNeural')
    expect(ids).toContain('zh-CN-YunxiNeural')
    expect(ids).toContain('zh-CN-YunyangNeural')
    expect(ids).toContain('zh-CN-liaoning-XiaobeiNeural')
    expect(ids).toContain('zh-CN-shaanxi-XiaoniNeural')
    expect(ids).toContain('zh-TW-HsiaoChenNeural')
    expect(ids).toContain('zh-HK-HiuMaanNeural')

    // 英语美音与英音
    expect(ids).toContain('en-US-JennyNeural')
    expect(ids).toContain('en-US-GuyNeural')
    expect(ids).toContain('en-US-AvaNeural')
    expect(ids).toContain('en-US-AvaMultilingualNeural')
    expect(ids).toContain('en-GB-SoniaNeural')
    expect(ids).toContain('en-GB-MaisieNeural')

    // 日韩国际多语
    expect(ids).toContain('ja-JP-NanamiNeural')
    expect(ids).toContain('ko-KR-SunHiNeural')
  })

  it('correctly filters voices by language codes for tabs', () => {
    const voices = ttsStore.edgeTTSVoices

    const zhVoices = voices.filter(v => (v.locale || v.id).toLowerCase().startsWith('zh'))
    expect(zhVoices.length).toBeGreaterThanOrEqual(10)

    const enVoices = voices.filter(v => (v.locale || v.id).toLowerCase().startsWith('en'))
    expect(enVoices.length).toBeGreaterThanOrEqual(15)

    const jaVoices = voices.filter(v => (v.locale || v.id).toLowerCase().startsWith('ja'))
    expect(jaVoices.length).toBeGreaterThanOrEqual(2)

    const koVoices = voices.filter(v => (v.locale || v.id).toLowerCase().startsWith('ko'))
    expect(koVoices.length).toBeGreaterThanOrEqual(2)
  })

  it('searches voices by query case-insensitively', () => {
    const voices = ttsStore.edgeTTSVoices
    const search = (q: string) => {
      const query = q.toLowerCase()
      return voices.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.id.toLowerCase().includes(query)
      )
    }

    const avaResult = search('ava')
    expect(avaResult.length).toBeGreaterThanOrEqual(1)
    expect(avaResult.some(v => v.id.includes('Ava'))).toBe(true)

    const xiaoxiaoResult = search('晓晓')
    expect(xiaoxiaoResult.length).toBeGreaterThanOrEqual(1)
    expect(xiaoxiaoResult[0].id).toBe('zh-CN-XiaoxiaoNeural')
  })
})
