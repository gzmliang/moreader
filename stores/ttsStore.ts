import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Edge TTS Voice type
export interface EdgeVoice {
  id: string
  name: string
  gender: 'male' | 'female' | 'child'
  locale: string
  lang: string
}

// Complete Edge TTS voice list (with gender)
const DEFAULT_EDGE_VOICES: EdgeVoice[] = [
  // 中文
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', locale: 'zh-CN', lang: '中文' },
  { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', locale: 'zh-CN', lang: '中文' },
  { id: 'zh-CN-YunjianNeural', name: '云健', gender: 'male', locale: 'zh-CN', lang: '中文' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊', gender: 'female', locale: 'zh-CN', lang: '中文' },
  { id: 'zh-TW-HsiaoChenNeural', name: '曉臻', gender: 'female', locale: 'zh-TW', lang: '中文' },
  { id: 'zh-TW-HsiaoYuNeural', name: '曉雨', gender: 'female', locale: 'zh-TW', lang: '中文' },
  { id: 'zh-TW-YunJheNeural', name: '雲哲', gender: 'male', locale: 'zh-TW', lang: '中文' },
  { id: 'zh-HK-HiuMaanNeural', name: '曉曼', gender: 'female', locale: 'zh-HK', lang: '中文' },
  { id: 'zh-HK-HiuGaaiNeural', name: '曉佳', gender: 'female', locale: 'zh-HK', lang: '中文' },
  { id: 'zh-HK-WanLungNeural', name: '雲龍', gender: 'male', locale: 'zh-HK', lang: '中文' },
  // 英语 (美国)
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-DavisNeural', name: 'Davis', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AmberNeural', name: 'Amber', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AnaNeural', name: 'Ana', gender: 'child', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AshleyNeural', name: 'Ashley', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-BrandonNeural', name: 'Brandon', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-CoraNeural', name: 'Cora', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-ElizabethNeural', name: 'Elizabeth', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-EricNeural', name: 'Eric', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-JacobNeural', name: 'Jacob', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-MonicaNeural', name: 'Monica', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-RogerNeural', name: 'Roger', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-SteffanNeural', name: 'Steffan', gender: 'male', locale: 'en-US', lang: 'English' },
  // 英语 (英国)
  { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'female', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'male', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'female', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-AbbiNeural', name: 'Abbi', gender: 'female', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-AlfieNeural', name: 'Alfie', gender: 'male', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-BellaNeural', name: 'Bella', gender: 'female', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-ElliotNeural', name: 'Elliot', gender: 'male', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-EthanNeural', name: 'Ethan', gender: 'male', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-HollieNeural', name: 'Hollie', gender: 'female', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-MaisieNeural', name: 'Maisie', gender: 'child', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-NoahNeural', name: 'Noah', gender: 'male', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-OliverNeural', name: 'Oliver', gender: 'male', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-OliviaNeural', name: 'Olivia', gender: 'female', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'male', locale: 'en-GB', lang: 'English' },
  // 日语
  { id: 'ja-JP-NanamiNeural', name: '七海', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-KeitaNeural', name: '圭太', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-AoiNeural', name: '葵', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-DaichiNeural', name: '大智', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-MayuNeural', name: '真由', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-NaokiNeural', name: '直樹', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-ShioriNeural', name: '詩織', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  // 韩语
  { id: 'ko-KR-SunHiNeural', name: '선희', gender: 'female', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-InJoonNeural', name: '인준', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-HyunsuNeural', name: '현수', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  // 德语
  { id: 'de-DE-KatjaNeural', name: 'Katja', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-ConradNeural', name: 'Conrad', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-AmalaNeural', name: 'Amala', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-BerndNeural', name: 'Bernd', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-ChristophNeural', name: 'Christoph', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-ElkeNeural', name: 'Elke', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-GiselaNeural', name: 'Gisela', gender: 'child', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KasperNeural', name: 'Kasper', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KillianNeural', name: 'Killian', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KlarissaNeural', name: 'Klarissa', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KlausNeural', name: 'Klaus', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-LouisaNeural', name: 'Louisa', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-MajaNeural', name: 'Maja', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-RalfNeural', name: 'Ralf', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-SeraphinaNeural', name: 'Seraphina', gender: 'child', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-TanjaNeural', name: 'Tanja', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  // 法语
  { id: 'fr-FR-DeniseNeural', name: 'Denise', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-HenriNeural', name: 'Henri', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-EloiseNeural', name: 'Eloise', gender: 'child', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-AlainNeural', name: 'Alain', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-BrigitteNeural', name: 'Brigitte', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-CelesteNeural', name: 'Celeste', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-ClaudeNeural', name: 'Claude', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-CoralieNeural', name: 'Coralie', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-JacquelineNeural', name: 'Jacqueline', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-JeromeNeural', name: 'Jerome', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-JosephineNeural', name: 'Josephine', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-MauriceNeural', name: 'Maurice', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-YvesNeural', name: 'Yves', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-YvetteNeural', name: 'Yvette', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  // 西班牙语
  { id: 'es-ES-ElviraNeural', name: 'Elvira', gender: 'female', locale: 'es-ES', lang: 'Español' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro', gender: 'male', locale: 'es-ES', lang: 'Español' },
  // 俄语
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана', gender: 'female', locale: 'ru-RU', lang: 'Русский' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий', gender: 'male', locale: 'ru-RU', lang: 'Русский' },
  // 意大利语
  { id: 'it-IT-ElsaNeural', name: 'Elsa', gender: 'female', locale: 'it-IT', lang: 'Italiano' },
  { id: 'it-IT-DiegoNeural', name: 'Diego', gender: 'male', locale: 'it-IT', lang: 'Italiano' },
  // 葡萄牙语
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', gender: 'female', locale: 'pt-BR', lang: 'Português' },
  { id: 'pt-BR-AntonioNeural', name: 'Antonio', gender: 'male', locale: 'pt-BR', lang: 'Português' },
  // 阿拉伯语
  { id: 'ar-SA-ZariyahNeural', name: 'زارية', gender: 'female', locale: 'ar-SA', lang: 'العربية' },
  { id: 'ar-SA-HamedNeural', name: 'حامد', gender: 'male', locale: 'ar-SA', lang: 'العربية' },
  // 印地语
  { id: 'hi-IN-SwaraNeural', name: 'स्वरा', gender: 'female', locale: 'hi-IN', lang: 'हिन्दी' },
  { id: 'hi-IN-MadhurNeural', name: 'मधुर', gender: 'male', locale: 'hi-IN', lang: 'हिन्दी' },
  // 泰语
  { id: 'th-TH-PremwadeeNeural', name: 'เปรมวดี', gender: 'female', locale: 'th-TH', lang: 'ไทย' },
  { id: 'th-TH-NiwatNeural', name: 'นิวัติ', gender: 'male', locale: 'th-TH', lang: 'ไทย' },
  // 越南语
  { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My', gender: 'female', locale: 'vi-VN', lang: 'Tiếng Việt' },
  { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh', gender: 'male', locale: 'vi-VN', lang: 'Tiếng Việt' },
]

export const useTTSStore = defineStore('tts', () => {
  // State
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const pausedIndex = ref(-1)
  const activeIndex = ref(-1)
  const paragraphNodes = ref<HTMLElement[]>([])
  const speechRate = ref(1.0)
  const speechPitch = ref(1.0)
  const selectedVoiceURI = ref('')

  // Provider selection
  const ttsProvider = ref<'browser' | 'edge' | 'custom'>('browser')

  // Edge TTS config
  const edgeTTSEndpoint = ref('http://192.168.199.159:5001')
  const edgeTTSVoice = ref('zh-CN-XiaoxiaoNeural')
  const edgeTTSRate = ref('+0%')
  const edgeTTSPitch = ref('+0Hz')
  const edgeTTSApiKey = ref('')
  const edgeTTSAvailable = ref(false)
  const edgeVoices = ref<EdgeVoice[]>([])

  // Recording mode (save audio output)
  const recordingMode = ref(false)

  // Custom TTS config
  const useCustomTTS = ref(false)
  const customTTSEndpoint = ref('')
  const customTTSApiKey = ref('')

  // Audio element for Edge TTS
  let currentAudio: HTMLAudioElement | null = null
  let currentAudioUrl: string | null = null

  // Browser voices
  const availableVoices = ref<SpeechSynthesisVoice[]>([])
  const voicesLoaded = ref(false)

  // ============ Prefetch Cache for Streaming TTS ============
  interface PrefetchCacheItem {
    index: number
    audioBlob?: Blob
    audioUrl?: string
    text?: string
    isReady: boolean
    isFetching: boolean
    error?: Error
  }

  const prefetchCache = ref<Map<number, PrefetchCacheItem>>(new Map())
  const PREFETCH_AHEAD_COUNT = 3

  const getCacheItem = (index: number): PrefetchCacheItem => {
    if (!prefetchCache.value.has(index)) {
      prefetchCache.value.set(index, { index, isReady: false, isFetching: false })
    }
    return prefetchCache.value.get(index)!
  }

  const clearPrefetchCache = () => {
    prefetchCache.value.forEach((item) => {
      if (item.audioUrl) URL.revokeObjectURL(item.audioUrl)
    })
    prefetchCache.value.clear()
  }

  const prefetchEdgeTTS = async (startIndex: number) => {
    if (!isPlaying.value) return

    const endIndex = Math.min(startIndex + PREFETCH_AHEAD_COUNT, paragraphNodes.value.length)

    for (let i = startIndex; i < endIndex; i++) {
      const cacheItem = getCacheItem(i)
      if (cacheItem.isFetching || cacheItem.isReady) continue

      const p = paragraphNodes.value[i]
      if (!p) continue

      const text = p.innerText?.trim() || ''
      if (text.length < 2) {
        cacheItem.isReady = true
        continue
      }

      cacheItem.isFetching = true
      cacheItem.text = text

      fetchEdgeTTSAudio(text)
        .then((blob) => {
          if (!isPlaying.value) return
          cacheItem.audioBlob = blob
          cacheItem.audioUrl = URL.createObjectURL(blob)
          cacheItem.isReady = true
          console.log(`[Edge TTS] Prefetched paragraph ${i}, size: ${blob.size} bytes`)
        })
        .catch((err) => {
          console.warn(`[Edge TTS] Prefetch failed for paragraph ${i}:`, err)
          cacheItem.error = err
          cacheItem.isReady = true
        })
        .finally(() => {
          cacheItem.isFetching = false
        })
    }
  }

  const fetchEdgeTTSAudio = async (text: string): Promise<Blob> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (edgeTTSApiKey.value) {
      headers['X-API-Key'] = edgeTTSApiKey.value
    }

    const response = await fetch(`${edgeTTSEndpoint.value}/tts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        voice: edgeTTSVoice.value,
        rate: edgeTTSRate.value,
        pitch: edgeTTSPitch.value,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const blob = await response.blob()
    if (!blob || blob.size === 0) throw new Error('Empty audio received')
    return blob
  }

  const cleanupPrefetchCache = (currentIndex: number) => {
    const keysToDelete: number[] = []
    prefetchCache.value.forEach((item, index) => {
      if (index < currentIndex - 1) {
        if (item.audioUrl) URL.revokeObjectURL(item.audioUrl)
        keysToDelete.push(index)
      }
    })
    keysToDelete.forEach((key) => prefetchCache.value.delete(key))
  }

  // Load voices on init
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      voicesLoaded.value = true
      availableVoices.value = voices
    }
    window.speechSynthesis.onvoiceschanged = () => {
      availableVoices.value = window.speechSynthesis.getVoices()
      voicesLoaded.value = true
    }
  }
  loadVoices()

  // Load Edge TTS voices
  const fetchEdgeVoices = async (): Promise<boolean> => {
    edgeVoices.value = DEFAULT_EDGE_VOICES
    try {
      const response = await fetch(`${edgeTTSEndpoint.value}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  const checkEdgeTTSServer = async (): Promise<boolean> => {
    edgeTTSAvailable.value = await fetchEdgeVoices()
    return edgeTTSAvailable.value
  }

  // Voice matching
  const findVoiceByURI = (voices: SpeechSynthesisVoice[], uri: string): SpeechSynthesisVoice | null => {
    if (!uri || voices.length === 0) return null

    let voice = voices.find(v => v.voiceURI === uri)
    if (voice) return voice

    const targetVoice = availableVoices.value.find(v => v.voiceURI === uri)
    if (targetVoice) {
      voice = voices.find(v => v.name === targetVoice.name)
      if (voice) return voice
    }

    return null
  }

  const getVoiceForText = (voices: SpeechSynthesisVoice[], text: string): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null

    if (selectedVoiceURI.value) {
      const selected = findVoiceByURI(voices, selectedVoiceURI.value)
      if (selected) {
        console.log('[TTS] Using selected voice:', selected.name, selected.lang)
        return selected
      }
    }

    const hasChinese = /[\u4e00-\u9fff]/.test(text)
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text)
    const hasKorean = /[\uac00-\ud7af]/.test(text)

    if (hasChinese) {
      const zhVoice = voices.find(v => v.lang?.startsWith('zh'))
      if (zhVoice) return zhVoice
    } else if (hasJapanese) {
      const jaVoice = voices.find(v => v.lang?.startsWith('ja'))
      if (jaVoice) return jaVoice
    } else if (hasKorean) {
      const koVoice = voices.find(v => v.lang?.startsWith('ko'))
      if (koVoice) return koVoice
    }

    const enVoice = voices.find(v => v.lang?.startsWith('en'))
    return enVoice || voices[0] || null
  }

  // Highlighting
  const clearHighlight = () => {
    paragraphNodes.value.forEach(p => {
      if (p) {
        p.style.backgroundColor = ''
        p.style.borderLeft = ''
        p.style.paddingLeft = ''
        p.style.transition = ''
      }
    })
  }

  const highlightParagraph = (index: number) => {
    clearHighlight()
    const p = paragraphNodes.value[index]
    if (p) {
      p.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
      p.style.borderLeft = '4px solid #3b82f6'
      p.style.paddingLeft = '12px'
      p.style.transition = 'all 0.2s ease'
      p.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // ============ Stop ============
  const stop = () => {
    try { window.speechSynthesis.cancel() } catch (e) { console.warn('Error canceling speechSynthesis:', e) }

    if (currentAudio) {
      try {
        currentAudio.pause()
        currentAudio.currentTime = 0
      } catch (e) { console.warn('Error stopping audio:', e) }
      currentAudio = null
    }

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl)
      currentAudioUrl = null
    }

    clearPrefetchCache()

    isPlaying.value = false
    isPaused.value = false
    pausedIndex.value = -1
    activeIndex.value = -1
    clearHighlight()
  }

  // ============ Pause & Resume ============
  const pause = () => {
    if (!isPlaying.value || isPaused.value) return

    console.log('[TTS] Pausing at index:', activeIndex.value)
    isPaused.value = true
    pausedIndex.value = activeIndex.value

    try { window.speechSynthesis.cancel() } catch (e) { console.warn('Error canceling:', e) }

    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl)
      currentAudioUrl = null
    }
  }

  const resume = (startIndex?: number) => {
    if (!isPlaying.value || !isPaused.value) return

    const resumeIndex = startIndex ?? (pausedIndex.value >= 0 ? pausedIndex.value : 0)
    console.log('[TTS] Resuming from index:', resumeIndex)

    isPaused.value = false
    pausedIndex.value = -1

    playSequence(resumeIndex)
  }

  // ============ Browser TTS ============
  const playWithBrowserTTS = (index: number) => {
    if (!isPlaying.value || index >= paragraphNodes.value.length) { stop(); return }

    const p = paragraphNodes.value[index]
    if (!p) { playWithBrowserTTS(index + 1); return }

    activeIndex.value = index
    highlightParagraph(index)

    const text = p.innerText?.trim() || ''
    if (text.length < 2) { playWithBrowserTTS(index + 1); return }

    const ownerWindow = p.ownerDocument?.defaultView || window

    try {
      const utterance = new ownerWindow.SpeechSynthesisUtterance(text)
      const voices = ownerWindow.speechSynthesis.getVoices()
      const voice = getVoiceForText(voices, text)
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang || 'zh-CN'
      }

      utterance.rate = Math.max(0.5, Math.min(2.0, speechRate.value))
      utterance.pitch = Math.max(0.5, Math.min(2.0, speechPitch.value))
      utterance.volume = 1.0

      utterance.onend = () => {
        if (isPlaying.value && !isPaused.value) playWithBrowserTTS(index + 1)
      }

      utterance.onerror = (event) => {
        console.warn('[TTS] Error on index', index, ':', event.error)
      }

      ownerWindow.speechSynthesis.cancel()
      setTimeout(() => {
        if (isPlaying.value && !isPaused.value) ownerWindow.speechSynthesis.speak(utterance)
      }, 50)
    } catch (e) {
      console.error('[TTS] Failed to create utterance:', e)
    }
  }

  // ============ Edge TTS ============
  const playWithEdgeTTS = async (index: number) => {
    if (!isPlaying.value || index >= paragraphNodes.value.length) { stop(); return }

    const p = paragraphNodes.value[index]
    if (!p) { await playWithEdgeTTS(index + 1); return }

    activeIndex.value = index
    highlightParagraph(index)

    const text = p.innerText?.trim() || ''
    if (text.length < 2) { await playWithEdgeTTS(index + 1); return }

    // Prefetch upcoming paragraphs
    prefetchEdgeTTS(index + 1)

    try {
      let audioBlob: Blob
      let audioUrl: string

      const cacheItem = prefetchCache.value.get(index)
      if (cacheItem?.isReady && cacheItem.audioUrl && !cacheItem.error) {
        console.log(`[Edge TTS] Using prefetched audio for paragraph ${index}`)
        audioBlob = cacheItem.audioBlob!
        audioUrl = cacheItem.audioUrl
        prefetchCache.value.delete(index)
      } else {
        console.log(`[Edge TTS] Requesting: voice=${edgeTTSVoice.value}, text=${text.substring(0, 30)}...`)
        audioBlob = await fetchEdgeTTSAudio(text)
        audioUrl = URL.createObjectURL(audioBlob)
      }

      if (currentAudioUrl && currentAudioUrl !== audioUrl) {
        URL.revokeObjectURL(currentAudioUrl)
      }
      currentAudioUrl = audioUrl

      currentAudio = new Audio(audioUrl)
      currentAudio.playbackRate = Math.max(0.5, Math.min(2.0, speechRate.value))

      await new Promise<void>((resolve, reject) => {
        if (!currentAudio) { reject(new Error('Audio not created')); return }
        currentAudio.oncanplaythrough = () => resolve()
        currentAudio.onerror = (e) => reject(new Error(`Audio load error: ${e}`))
        setTimeout(() => resolve(), 3000)
      })

      await currentAudio.play()
      cleanupPrefetchCache(index)
      prefetchEdgeTTS(index + 1)

      currentAudio.onended = () => {
        if (isPlaying.value) playWithEdgeTTS(index + 1)
      }

      currentAudio.onerror = (e) => {
        console.error('[Edge TTS] Audio playback error:', e)
        if (isPlaying.value) playWithBrowserTTS(index)
      }
    } catch (error) {
      console.error('[Edge TTS] Error:', error)
      if (isPlaying.value) playWithBrowserTTS(index)
    }
  }

  // ============ Main Play Sequence ============
  const playSequence = (index: number) => {
    if (ttsProvider.value === 'edge') {
      playWithEdgeTTS(index)
    } else {
      playWithBrowserTTS(index)
    }
  }

  const start = (nodes: HTMLElement[], startIndex: number = 0) => {
    if (!isPaused.value) {
      stop()
      clearPrefetchCache()
    }

    paragraphNodes.value = nodes.filter(p => p && p.innerText?.trim().length > 1)
    console.log(`[TTS] Starting with ${paragraphNodes.value.length} paragraphs from index ${startIndex}, provider: ${ttsProvider.value}`)

    if (paragraphNodes.value.length > 0) {
      isPlaying.value = true
      isPaused.value = false
      playSequence(startIndex)
    }
  }

  // ============ Speak Selection ============
  const speakSelection = (text: string, element?: HTMLElement) => {
    stop()
    if (!text || text.trim().length < 1) return

    if (ttsProvider.value === 'edge') {
      speakSelectionWithEdgeTTS(text)
    } else {
      speakSelectionWithBrowserTTS(text, element)
    }
  }

  const speakSelectionWithBrowserTTS = (text: string, element?: HTMLElement) => {
    const targetWindow = element?.ownerDocument?.defaultView || window

    try {
      const utterance = new targetWindow.SpeechSynthesisUtterance(text.trim())
      const voices = targetWindow.speechSynthesis.getVoices()
      const voice = getVoiceForText(voices, text)
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang || 'zh-CN'
      }

      utterance.rate = Math.max(0.5, Math.min(2.0, speechRate.value))
      utterance.pitch = Math.max(0.5, Math.min(2.0, speechPitch.value))
      utterance.volume = 1.0

      utterance.onend = () => { isPlaying.value = false }
      utterance.onerror = () => { isPlaying.value = false }

      targetWindow.speechSynthesis.cancel()
      setTimeout(() => targetWindow.speechSynthesis.speak(utterance), 50)
      isPlaying.value = true
    } catch (e) {
      console.error('[TTS] speakSelection error:', e)
    }
  }

  const speakSelectionWithEdgeTTS = async (text: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (edgeTTSApiKey.value) headers['X-API-Key'] = edgeTTSApiKey.value

      const response = await fetch(`${edgeTTSEndpoint.value}/tts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          voice: edgeTTSVoice.value,
          rate: edgeTTSRate.value,
          pitch: edgeTTSPitch.value,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const audioBlob = await response.blob()
      if (!audioBlob || audioBlob.size === 0) throw new Error('Empty audio')

      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl)
      currentAudioUrl = URL.createObjectURL(audioBlob)

      currentAudio = new Audio(currentAudioUrl)
      currentAudio.playbackRate = Math.max(0.5, Math.min(2.0, speechRate.value))

      await currentAudio.play()

      currentAudio.onended = () => { isPlaying.value = false }
      currentAudio.onerror = () => { isPlaying.value = false; speakSelectionWithBrowserTTS(text) }

      isPlaying.value = true
    } catch (error) {
      console.error('[Edge TTS] Selection error:', error)
      speakSelectionWithBrowserTTS(text)
    }
  }

  // ============ Controls ============
  const skipNext = () => {
    if (isPlaying.value && activeIndex.value < paragraphNodes.value.length - 1) {
      if (currentAudio) { currentAudio.onended = null; currentAudio.pause() }
      window.speechSynthesis.cancel()
      clearPrefetchCache()
      playSequence(activeIndex.value + 1)
    }
  }

  const skipPrevious = () => {
    if (isPlaying.value && activeIndex.value > 0) {
      if (currentAudio) { currentAudio.onended = null; currentAudio.pause() }
      window.speechSynthesis.cancel()
      clearPrefetchCache()
      playSequence(activeIndex.value - 1)
    }
  }

  const testEdgeTTSConnection = async (): Promise<boolean> => {
    const ok = await fetchEdgeVoices()
    edgeTTSAvailable.value = ok
    return ok
  }

  // Aliases
  const setTTSProvider = (p: 'browser' | 'edge' | 'custom') => { ttsProvider.value = p }
  const setEdgeVoice = (v: string) => { edgeTTSVoice.value = v }
  const setEdgeTTSApiKey = (k: string) => { edgeTTSApiKey.value = k }

  return {
    // State
    isPlaying: computed(() => isPlaying.value),
    isPaused: computed(() => isPaused.value),
    pausedIndex: computed(() => pausedIndex.value),
    activeIndex: computed(() => activeIndex.value),
    speechRate,
    speechPitch,
    selectedVoiceURI,
    availableVoices: computed(() => availableVoices.value),
    voicesLoaded: computed(() => voicesLoaded.value),

    // Provider
    ttsProvider,

    // Edge TTS
    edgeTTSEndpoint,
    edgeTTSVoice,
    edgeTTSRate,
    edgeTTSPitch,
    edgeTTSApiKey,
    edgeTTSAvailable,
    edgeVoices: computed(() => edgeVoices.value),
    edgeTTSVoices: computed(() => edgeVoices.value),

    // Recording mode
    recordingMode: computed(() => recordingMode.value),

    // Custom TTS
    useCustomTTS,
    customTTSEndpoint,
    customTTSApiKey,

    // Methods
    start,
    stop,
    pause,
    resume,
    speakSelection,
    skipNext,
    skipPrevious,
    testEdgeTTSConnection,
    checkEdgeTTSServer,
    fetchEdgeVoices,

    // Setters
    setRate: (rate: number) => { speechRate.value = rate },
    setPitch: (pitch: number) => { speechPitch.value = pitch },
    setVoice: (uri: string | null) => { selectedVoiceURI.value = uri || '' },
    setProvider: (p: 'browser' | 'edge' | 'custom') => { ttsProvider.value = p },
    setTTSProvider,
    setEdgeTTSEndpoint: (url: string) => { edgeTTSEndpoint.value = url },
    setEdgeTTSVoice: (voice: string) => { edgeTTSVoice.value = voice },
    setEdgeVoice,
    setEdgeTTSRate: (rate: string) => { edgeTTSRate.value = rate },
    setEdgeTTSPitch: (pitch: string) => { edgeTTSPitch.value = pitch },
    setEdgeTTSApiKey,
    setRecordingMode: (mode: boolean) => {
      recordingMode.value = mode
      if (mode && ttsProvider.value !== 'edge') {
        console.warn('[TTS] Recording mode currently works with Edge TTS output.')
      }
    },
    refreshVoices: loadVoices,
  }
})
