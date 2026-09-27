/**
 * 【v2.10.4 验收】"生成中"标志必须严丝合缝：
 *   - 开始生成 → true（这样播放键才能被闸门拦住）；
 *   - 音频到手/出错/用户取消 → **必须回到 false**（否则播放键会被永久锁死，用户以为坏了）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

let pendingResolvers: Array<(v: any) => void> = []
let fetchMode: 'ok' | 'http500' | 'network' = 'ok'

const makeAudioMock = () => {
  const played: string[] = []
  class FakeAudio {
    src: string
    playbackRate = 1
    currentTime = 0
    duration = 10
    paused = true
    ended = false
    onplaying: any = null
    oncanplaythrough: any = null
    onended: any = null
    onerror: any = null
    constructor(src: string) {
      this.src = src
      played.push(src)
      // 模拟真实浏览器：音频可播放 + 真正开始播放都会回调
      setTimeout(() => { this.oncanplaythrough && this.oncanplaythrough() }, 10)
    }
    play() {
      this.paused = false
      setTimeout(() => { this.onplaying && this.onplaying() }, 10)
      return Promise.resolve()
    }
    pause() { this.paused = true }
  }
  return { FakeAudio, played }
}

beforeEach(() => {
  pendingResolvers = []
  fetchMode = 'ok'
  setActivePinia(createPinia())
  ;(globalThis as any).fetch = vi.fn(() => new Promise((resolve, reject) => {
    pendingResolvers.push((choice: any) => {
      if (fetchMode === 'network') { reject(new Error('network down')); return }
      if (fetchMode === 'http500') {
        resolve({ ok: false, status: 500, headers: { get: () => null }, blob: async () => new Blob([]) })
        return
      }
      resolve({
        ok: true, status: 200,
        headers: { get: () => null },
        blob: async () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/mpeg' }),
      })
    })
  }))
  ;(URL as any).createObjectURL = () => 'blob:fake-' + Math.random()
  ;(URL as any).revokeObjectURL = () => {}
  if (!(Element.prototype as any).scrollIntoView) (Element.prototype as any).scrollIntoView = () => {}
  const { FakeAudio } = makeAudioMock()
  ;(globalThis as any).Audio = FakeAudio
  ;(window as any).Audio = FakeAudio
})

afterEach(() => {
  vi.useRealTimers()
})

const makeParagraphs = () => {
  const a = document.createElement('p')
  a.textContent = 'This is the first paragraph of the book, long enough to be spoken.'
  const b = document.createElement('p')
  b.textContent = 'This is the second paragraph, also long enough to be spoken aloud.'
  document.body.appendChild(a)
  document.body.appendChild(b)
  return [a, b]
}

describe('"生成中"标志：开关必须严丝合缝', () => {
  it('开始生成 → isGenerating 立即可见（供 UI 拦重复点击）', async () => {
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    store.setTTSProvider('edge')

    store.start(makeParagraphs(), 0)
    // 音频还在路上（fetch 未 resolve）
    await Promise.resolve()
    expect(store.isGenerating).toBe(true)

    // 收尾：让 fetch 成功返回，避免悬挂
    fetchMode = 'ok'
    pendingResolvers.forEach(r => r(null))
    await new Promise(r => setTimeout(r, 50))
  })

  it('音频到手 → 自动回到 false（不会永久锁死播放键）', async () => {
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    store.setTTSProvider('edge')
    store.start(makeParagraphs(), 0)
    await Promise.resolve()
    fetchMode = 'ok'
    pendingResolvers.forEach(r => r(null))
    await new Promise(r => setTimeout(r, 120))
    expect(store.isGenerating).toBe(false)
    store.stop()
  })

  it('生成失败（HTTP 500）→ 也必须回到 false，且不播放任何声音', async () => {
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    store.setTTSProvider('edge')
    store.start(makeParagraphs(), 0)
    await Promise.resolve()
    fetchMode = 'http500'
    pendingResolvers.forEach(r => r(null))
    await new Promise(r => setTimeout(r, 150))
    expect(store.isGenerating).toBe(false)
    store.stop()
  })

  it('用户在生成期间取消 → isGenerating 立刻归零、回到停止态', async () => {
    const { useTTSStore } = await import('../src/stores/ttsStore')
    const store = useTTSStore()
    store.setTTSProvider('edge')
    store.start(makeParagraphs(), 0)
    await Promise.resolve()
    expect(store.isGenerating).toBe(true)
    store.cancelGenerating()
    expect(store.isGenerating).toBe(false)
    expect(store.isPlaying).toBe(false)
    pendingResolvers.forEach(r => r(null))
    await new Promise(r => setTimeout(r, 80))
    expect(store.isPlaying).toBe(false)
  })
})
