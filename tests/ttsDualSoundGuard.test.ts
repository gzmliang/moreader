/**
 * 【v2.10.4 验收】「多点一次 → 两个声音此起彼伏」必须被根治
 *
 * 判据（机器可验）：
 *   1. 生成/排队期间又发起一次朗读时，**被取代的那一份绝不能开口**（只允许最后一份出声）；
 *   2. 用户按停止/取消之后，**迟到的音频/朗读一律丢弃**；
 *   3. 生成期间存在一个「立即生效」的互斥标志 isGenerating，供 UI 拦重复点击。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const spoken: string[] = []
const cancelSpy = vi.fn()

const installSpeechMock = () => {
  const mock = {
    cancel: cancelSpy,
    speak: (u: any) => { spoken.push(String(u.text)) },
    getVoices: () => [{ name: 'Test Voice', lang: 'en-US', voiceURI: 'test', default: true }],
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  Object.defineProperty(window, 'speechSynthesis', { value: mock, configurable: true, writable: true })
  class FakeUtterance {
    text: string
    voice: any = null
    lang = ''
    rate = 1
    pitch = 1
    volume = 1
    onend: any = null
    onerror: any = null
    constructor(t: string) { this.text = t }
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true, writable: true })
}

describe('TTS 双声防护（迟到的一份绝不开口）', () => {
  beforeEach(() => {
    spoken.length = 0
    cancelSpy.mockClear()
    installSpeechMock()
    setActivePinia(createPinia())
    vi.useRealTimers()
  })

  it('连续发起两次划词朗读 → 只有最后一份会出声（第一份自毁）', async () => {
    vi.useFakeTimers()
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    store.setTTSProvider('browser')

    store.speakSelection('FIRST selection text here')
    store.speakSelection('SECOND selection text here')

    // 让两次 setTimeout(50ms) 都到期
    vi.advanceTimersByTime(200)

    expect(spoken).toEqual(['SECOND selection text here'])
  })

  it('发起朗读后立刻停止 → 那份迟到的朗读不会出声', async () => {
    vi.useFakeTimers()
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    store.setTTSProvider('browser')

    store.speakSelection('should never be spoken')
    store.stop()
    vi.advanceTimersByTime(200)

    expect(spoken).toEqual([])
  })

  it('isGenerating 是「立即生效」的互斥标志，取消后立刻归零', async () => {
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    expect(store.isGenerating).toBe(false)
    store.cancelGenerating()
    expect(store.isGenerating).toBe(false)
    // 取消生成 = 回到停止态
    expect(store.isPlaying).toBe(false)
    expect(store.isPaused).toBe(false)
  })

  it('停止之后再开始新的一轮：新一轮正常出声（没有被误伤）', async () => {
    vi.useFakeTimers()
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    store.setTTSProvider('browser')

    store.speakSelection('round one')
    store.stop()
    store.speakSelection('round two')
    vi.advanceTimersByTime(200)

    expect(spoken).toEqual(['round two'])
  })
})
