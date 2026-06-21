import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TTSProvider, EdgeVoice, AIVoice, AIVoiceModel } from '@/types/book'
import { AI_VOICE_MODELS } from '@/types/book'

const DEFAULT_EDGE_VOICES: EdgeVoice[] = [
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
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-DavisNeural', name: 'Davis', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-AshleyNeural', name: 'Ashley', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-CoraNeural', name: 'Cora', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-ElizabethNeural', name: 'Elizabeth', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-EricNeural', name: 'Eric', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-JacobNeural', name: 'Jacob', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-MonicaNeural', name: 'Monica', gender: 'female', locale: 'en-US', lang: 'English' },
  { id: 'en-US-RogerNeural', name: 'Roger', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-US-SteffanNeural', name: 'Steffan', gender: 'male', locale: 'en-US', lang: 'English' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'female', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'male', locale: 'en-GB', lang: 'English' },
  { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'female', locale: 'en-GB', lang: 'English' },
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
  { id: 'ja-JP-NanamiNeural', name: '七海', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-KeitaNeural', name: '圭太', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-AoiNeural', name: '葵', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-DaichiNeural', name: '大智', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-MayuNeural', name: '真由', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-NaokiNeural', name: '直樹', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-ShioriNeural', name: '詩織', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ko-KR-SunHiNeural', name: '선희', gender: 'female', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-InJoonNeural', name: '인준', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-HyunsuNeural', name: '현수', gender: 'male', locale: 'ko-KR', lang: '한국어' },
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
  { id: 'es-ES-ElviraNeural', name: 'Elvira', gender: 'female', locale: 'es-ES', lang: 'Español' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro', gender: 'male', locale: 'es-ES', lang: 'Español' },
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана', gender: 'female', locale: 'ru-RU', lang: 'Русский' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий', gender: 'male', locale: 'ru-RU', lang: 'Русский' },
  { id: 'it-IT-ElsaNeural', name: 'Elsa', gender: 'female', locale: 'it-IT', lang: 'Italiano' },
  { id: 'it-IT-DiegoNeural', name: 'Diego', gender: 'male', locale: 'it-IT', lang: 'Italiano' },
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', gender: 'female', locale: 'pt-BR', lang: 'Português' },
  { id: 'pt-BR-AntonioNeural', name: 'Antonio', gender: 'male', locale: 'pt-BR', lang: 'Português' },
  { id: 'ar-SA-ZariyahNeural', name: 'زارية', gender: 'female', locale: 'ar-SA', lang: 'العربية' },
  { id: 'ar-SA-HamedNeural', name: 'حامد', gender: 'male', locale: 'ar-SA', lang: 'العربية' },
  { id: 'hi-IN-SwaraNeural', name: 'स्वरा', gender: 'female', locale: 'hi-IN', lang: 'हिन्दी' },
  { id: 'hi-IN-MadhurNeural', name: 'मधुर', gender: 'male', locale: 'hi-IN', lang: 'हिन्दी' },
  { id: 'th-TH-PremwadeeNeural', name: 'เปรมวดี', gender: 'female', locale: 'th-TH', lang: 'ไทย' },
  { id: 'th-TH-NiwatNeural', name: 'นิวัติ', gender: 'male', locale: 'th-TH', lang: 'ไทย' },
  { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My (女)', locale: 'vi-VN', lang: 'Tiếng Việt' },
  { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh (男)', locale: 'vi-VN', lang: 'Tiếng Việt' },
]

// SiliconFlow AI Voice definitions (from official docs)
const AI_VOICES: AIVoice[] = [
  { id: 'fnlp/MOSS-TTSD-v0.5:alex', name: 'Alex (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:anna', name: 'Anna (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'fnlp/MOSS-TTSD-v0.5:bella', name: 'Bella (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'fnlp/MOSS-TTSD-v0.5:benjamin', name: 'Benjamin (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:charles', name: 'Charles (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:claire', name: 'Claire (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'fnlp/MOSS-TTSD-v0.5:david', name: 'David (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:diana', name: 'Diana (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:alex', name: 'Alex (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', name: 'Anna (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', name: 'Bella (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:benjamin', name: 'Benjamin (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:charles', name: 'Charles (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', name: 'Claire (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:david', name: 'David (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:diana', name: 'Diana (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
]

interface PrefetchItem {
  index: number
  audioBlob?: Blob
  audioUrl?: string
  text?: string
  isReady: boolean
  isFetching: boolean
  error?: Error
}

const TTS_STORAGE_KEY = 'moreader-tts-settings'

// Per-provider AI Voice config — each provider remembers its own settings
export interface AIVoiceProviderConfig {
  endpoint: string
  apiKey: string
  model: string
  voiceId: string
}

interface TTSSettings {
  provider: TTSProvider
  edgeEndpoint: string
  edgeVoice: string
  edgeRate: string
  edgePitch: string
  edgeApiKey: string
  speechRate: number
  selectedVoiceURI: string
  // AI Voice — per-provider configs (new structure)
  aiVoiceProvider: string
  aiVoiceConfigs: Record<string, AIVoiceProviderConfig>
  // Legacy fields (for migration only)
  aiVoiceEndpoint?: string
  aiVoiceApiKey?: string
  aiVoiceModel?: string
  aiVoiceId?: string
}

// Default configs per AI Voice provider
const DEFAULT_AI_VOICE_CONFIGS: Record<string, AIVoiceProviderConfig> = {
  siliconflow: {
    endpoint: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    model: 'fnlp/MOSS-TTSD-v0.5',
    voiceId: 'fnlp/MOSS-TTSD-v0.5:anna',
  },
  openai: {
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'tts-1',
    voiceId: 'alloy',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'sesame/csm-1b',
    voiceId: 'default',
  },
  custom: {
    endpoint: '',
    apiKey: '',
    model: '',
    voiceId: '',
  },
}

const loadTTSSettings = (): TTSSettings => {
  try {
    const saved = localStorage.getItem(TTS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Migration: convert legacy flat fields to per-provider configs
      if (!parsed.aiVoiceConfigs) {
        parsed.aiVoiceConfigs = {}
        // Migrate from old flat fields
        if (parsed.aiVoiceEndpoint || parsed.aiVoiceModel) {
          const provider = parsed.aiVoiceProvider || 'siliconflow'
          parsed.aiVoiceConfigs[provider] = {
            endpoint: parsed.aiVoiceEndpoint || DEFAULT_AI_VOICE_CONFIGS[provider]?.endpoint || '',
            apiKey: parsed.aiVoiceApiKey || '',
            model: parsed.aiVoiceModel || DEFAULT_AI_VOICE_CONFIGS[provider]?.model || '',
            voiceId: parsed.aiVoiceId || DEFAULT_AI_VOICE_CONFIGS[provider]?.voiceId || '',
          }
        }
      }
      // Ensure all default providers have configs
      for (const key of Object.keys(DEFAULT_AI_VOICE_CONFIGS)) {
        if (!parsed.aiVoiceConfigs[key]) {
          parsed.aiVoiceConfigs[key] = { ...DEFAULT_AI_VOICE_CONFIGS[key] }
        }
      }
      return parsed
    }
  } catch (e) { console.warn('Failed to load TTS settings:', e) }
  return {
    provider: 'browser',
    edgeEndpoint: 'http://powerplus.blogsyte.com:5001',
    edgeVoice: 'zh-CN-XiaoxiaoNeural',
    edgeRate: '+0%',
    edgePitch: '+0Hz',
    edgeApiKey: '',
    speechRate: 1.0,
    selectedVoiceURI: '',
    aiVoiceProvider: 'siliconflow',
    aiVoiceConfigs: JSON.parse(JSON.stringify(DEFAULT_AI_VOICE_CONFIGS)),
  }
}

const saveTTSSettings = (settings: Partial<TTSSettings>) => {
  try {
    const existing = loadTTSSettings()
    const merged = { ...existing, ...settings }
    localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(merged))
  } catch (e) { console.warn('Failed to save TTS settings:', e) }
}

export const useTTSStore = defineStore('tts', () => {
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const pausedIndex = ref(-1)
  const activeIndex = ref(-1)
  const paragraphNodes = ref<HTMLElement[]>([])
  const ttsProvider = ref<TTSProvider>(loadTTSSettings().provider)
  const edgeTTSEndpoint = ref(loadTTSSettings().edgeEndpoint)
  const edgeTTSVoice = ref(loadTTSSettings().edgeVoice)
  const edgeTTSRate = ref(loadTTSSettings().edgeRate)
  const edgeTTSPitch = ref(loadTTSSettings().edgePitch)
  const edgeTTSApiKey = ref(loadTTSSettings().edgeApiKey)
  const edgeTTSAvailable = ref(false)
  const availableVoices = ref<SpeechSynthesisVoice[]>([])
  const voicesLoaded = ref(false)
  const edgeVoices = ref<EdgeVoice[]>(DEFAULT_EDGE_VOICES)
  const speechRate = ref(loadTTSSettings().speechRate)
  const selectedVoiceURI = ref(loadTTSSettings().selectedVoiceURI)
  const prefetchCache = ref<Map<number, PrefetchItem>>(new Map())

  // AI Voice - per-provider independent settings
  const aiVoiceProvider = ref(loadTTSSettings().aiVoiceProvider)
  const aiVoiceConfigs = ref<Record<string, AIVoiceProviderConfig>>(loadTTSSettings().aiVoiceConfigs)

  // Computed: current provider's config
  const currentAIVoiceConfig = computed<AIVoiceProviderConfig>(() => {
    const key = aiVoiceProvider.value
    if (!aiVoiceConfigs.value[key]) {
      aiVoiceConfigs.value[key] = { ...DEFAULT_AI_VOICE_CONFIGS[key] || { endpoint: '', apiKey: '', model: '', voiceId: '' } }
    }
    return aiVoiceConfigs.value[key]
  })

  // Convenience computed refs for current provider's fields
  const aiVoiceEndpoint = computed({
    get: () => currentAIVoiceConfig.value.endpoint,
    set: (v: string) => { currentAIVoiceConfig.value.endpoint = v },
  })
  const aiVoiceApiKey = computed({
    get: () => currentAIVoiceConfig.value.apiKey,
    set: (v: string) => { currentAIVoiceConfig.value.apiKey = v },
  })
  const aiVoiceModel = computed({
    get: () => currentAIVoiceConfig.value.model as AIVoiceModel,
    set: (v: AIVoiceModel) => { currentAIVoiceConfig.value.model = v },
  })
  const aiVoiceId = computed({
    get: () => currentAIVoiceConfig.value.voiceId,
    set: (v: string) => { currentAIVoiceConfig.value.voiceId = v },
  })

  const aiVoiceAvailable = ref(false)

  // Recording TTS output (not mic): collect audio blobs during playback
  const isRecordingTTS = ref(false)
  const recordingBlobs = ref<Blob[]>([])
  const recordingText = ref('')

  let currentAudio: HTMLAudioElement | null = null
  let currentAudioUrl: string | null = null

  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) { voicesLoaded.value = true; availableVoices.value = voices }
    window.speechSynthesis.onvoiceschanged = () => {
      availableVoices.value = window.speechSynthesis.getVoices()
      voicesLoaded.value = true
    }
  }
  loadVoices()

  const getCacheItem = (index: number): PrefetchItem => {
    if (!prefetchCache.value.has(index)) {
      prefetchCache.value.set(index, { index, isReady: false, isFetching: false })
    }
    return prefetchCache.value.get(index)!
  }

  const clearPrefetchCache = () => {
    prefetchCache.value.forEach((item) => { if (item.audioUrl) URL.revokeObjectURL(item.audioUrl) })
    prefetchCache.value.clear()
  }

  // 短段落批量合并 — 连续短句合为一次合成，消除 HTTP 请求间隙
const SHORT_PARA_THRESHOLD = 80  // 少于 80 字视为短段落，合并发送
const MAX_BATCH_SIZE = 8         // 一次最多合并 8 段，避免超长文本

/** 合并连续短段落，返回 {texts, batchCount} */
function collectShortBatch(nodes: HTMLElement[], startIndex: number): { texts: string[], batchCount: number } {
  const texts: string[] = []
  let i = startIndex
  while (i < nodes.length) {
    const p = nodes[i]
    const t = p?.innerText?.trim() || ''
    if (t.length < 2) { i++; continue }  // 跳过空段落
    if (texts.length === 0) {
      // 第一个段落：不管长短，开始收集
      texts.push(t); i++
      continue
    }
    // 看当前段落长短
    if (t.length <= SHORT_PARAGRAPH_THRESHOLD && texts.length < MAX_BATCH_SIZE) {
      // 短段落 + 还没满 → 加入批处理
      texts.push(t); i++
    } else {
      // 长段落或已满 → 停止收集
      break
    }
  }
  // 如果只有一个短段落，它单独走（避免短→长混合）
  if (texts.length === 1 && texts[0].length <= SHORT_PARAGRAPH_THRESHOLD) {
    // 但只有一段短文本 → 也单独走，不必合并
    return { texts, batchCount: 1 }
  }
  return { texts, batchCount: texts.length }
}

const fetchEdgeTTSAudio = async (text: string): Promise<Blob> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (edgeTTSApiKey.value) headers['X-API-Key'] = edgeTTSApiKey.value
    const response = await fetch(`${edgeTTSEndpoint.value}/tts`, {
      method: 'POST', headers, body: JSON.stringify({ text, voice: edgeTTSVoice.value, rate: edgeTTSRate.value, pitch: edgeTTSPitch.value })
    })
    if (!response.ok) { const errorText = await response.text().catch(() => 'Unknown error'); throw new Error(`HTTP ${response.status}: ${errorText}`) }
    const blob = await response.blob()
    if (!blob || blob.size === 0) throw new Error('Empty audio received')
    return blob
  }

  // AI Voice: /audio/speech endpoint (self-hosted or cloud)
  const fetchAIVoiceAudio = async (text: string): Promise<Blob> => {
    if (!aiVoiceId.value) throw new Error('AI 语音：请先选择音色')

    const endpoint = aiVoiceEndpoint.value.replace(/\/+$/, '')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (aiVoiceApiKey.value) {
      headers['Authorization'] = `Bearer ${aiVoiceApiKey.value}`
    }

    const response = await fetch(`${endpoint}/audio/speech`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiVoiceModel.value,
        input: text,
        voice: aiVoiceId.value.trim(),
        response_format: 'mp3',
        stream: true,
      }),
      signal: AbortSignal.timeout(180000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      let errorMsg = `HTTP ${response.status}`
      try {
        const errJson = JSON.parse(errorText)
        if (errJson.error?.message) errorMsg += `: ${errJson.error.message}`
        else errorMsg += `: ${errorText.slice(0, 200)}`
      } catch {
        errorMsg += `: ${errorText.slice(0, 200)}`
      }
      throw new Error(errorMsg)
    }

    const blob = await response.blob()
    if (!blob || blob.size === 0) throw new Error('Empty audio received')
    return blob
  }

  const checkAIVoiceServer = async (): Promise<boolean> => {
    if (!aiVoiceEndpoint.value) {
      aiVoiceAvailable.value = false
      return false
    }
    try {
      const endpoint = aiVoiceEndpoint.value.replace(/\/+$/, '')
      // If no API key (self-hosted/local server), just check /health
      if (!aiVoiceApiKey.value) {
        const response = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(5000) })
        aiVoiceAvailable.value = response.ok
        return response.ok
      }
      // With API key: do a real TTS test request
      const response = await fetch(`${endpoint}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiVoiceApiKey.value}`,
        },
        body: JSON.stringify({
          model: aiVoiceModel.value,
          input: 'Hi',
          voice: aiVoiceId.value || `${aiVoiceModel.value}:anna`,
          response_format: 'mp3',
        }),
        signal: AbortSignal.timeout(10000),
      })
      aiVoiceAvailable.value = response.ok
      return response.ok
    } catch {
      aiVoiceAvailable.value = false
      return false
    }
  }

  const prefetchEdgeTTS = async (startIndex: number) => {
    if (!isPlaying.value) return
    const endIndex = Math.min(startIndex + 3, paragraphNodes.value.length)
    for (let i = startIndex; i < endIndex; i++) {
      const cacheItem = getCacheItem(i)
      if (cacheItem.isFetching || cacheItem.isReady) continue
      const p = paragraphNodes.value[i]
      if (!p) continue
      const text = p.innerText?.trim() || ''
      if (text.length < 2) { cacheItem.isReady = true; continue }
      cacheItem.isFetching = true; cacheItem.text = text

      const fetchFn = ttsProvider.value === 'ai_voice' ? fetchAIVoiceAudio : fetchEdgeTTSAudio
      fetchFn(text)
        .then((blob) => {
          if (!isPlaying.value) return
          cacheItem.audioBlob = blob; cacheItem.audioUrl = URL.createObjectURL(blob); cacheItem.isReady = true
        })
        .catch((err) => { console.warn(`[TTS] Prefetch failed for paragraph ${i}:`, err); cacheItem.error = err; cacheItem.isReady = true })
        .finally(() => { cacheItem.isFetching = false })
    }
  }

  const cleanupPrefetchCache = (currentIndex: number) => {
    const keysToDelete: number[] = []
    prefetchCache.value.forEach((item, index) => {
      if (index < currentIndex - 1) { if (item.audioUrl) URL.revokeObjectURL(item.audioUrl); keysToDelete.push(index) }
    })
    keysToDelete.forEach((key) => prefetchCache.value.delete(key))
  }

  const checkEdgeTTSServer = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${edgeTTSEndpoint.value}/health`, { signal: AbortSignal.timeout(5000) })
      edgeTTSAvailable.value = response.ok
      return response.ok
    } catch { edgeTTSAvailable.value = false; return false }
  }

  const findVoiceByURI = (voices: SpeechSynthesisVoice[], uri: string): SpeechSynthesisVoice | null => {
    if (!uri || voices.length === 0) return null
    let voice = voices.find(v => v.voiceURI === uri)
    if (voice) return voice
    const targetVoice = availableVoices.value.find(v => v.voiceURI === uri)
    if (targetVoice) { voice = voices.find(v => v.name === targetVoice.name); if (voice) return voice }
    return null
  }

  const getVoiceForText = (voices: SpeechSynthesisVoice[], text: string): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null
    if (selectedVoiceURI.value) { const selected = findVoiceByURI(voices, selectedVoiceURI.value); if (selected) return selected }
    const hasChinese = /[\u4e00-\u9fff]/.test(text)
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text)
    const hasKorean = /[\uac00-\ud7af]/.test(text)
    if (hasChinese) { const zhVoice = voices.find(v => v.lang?.startsWith('zh')); if (zhVoice) return zhVoice }
    if (hasJapanese) { const jaVoice = voices.find(v => v.lang?.startsWith('ja')); if (jaVoice) return jaVoice }
    if (hasKorean) { const koVoice = voices.find(v => v.lang?.startsWith('ko')); if (koVoice) return koVoice }
    const enVoice = voices.find(v => v.lang?.startsWith('en'))
    return enVoice || voices[0] || null
  }

  const clearHighlight = () => {
    paragraphNodes.value.forEach(p => {
      if (p) { p.style.backgroundColor = ''; p.style.borderLeft = ''; p.style.paddingLeft = ''; p.style.transition = '' }
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

  const stop = () => {
    try { window.speechSynthesis.cancel() } catch (e) { console.warn('Error canceling speechSynthesis:', e) }
    if (currentAudio) { try { currentAudio.pause(); currentAudio.currentTime = 0 } catch (e) { console.warn('Error stopping audio:', e) } currentAudio = null }
    if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null }
    clearPrefetchCache()
    isPlaying.value = false; isPaused.value = false; pausedIndex.value = -1; activeIndex.value = -1; clearHighlight()
  }

  const pause = () => {
    if (!isPlaying.value || isPaused.value) return
    isPaused.value = true; pausedIndex.value = activeIndex.value
    try { window.speechSynthesis.cancel() } catch (e) { console.warn('Error canceling speechSynthesis:', e) }
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null }
    if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null }
  }

  const playWithBrowserTTS = (index: number) => {
    if (!isPlaying.value || isPaused.value || index >= paragraphNodes.value.length) { if (!isPaused.value) stop(); return }
    const p = paragraphNodes.value[index]
    if (!p) { playWithBrowserTTS(index + 1); return }
    activeIndex.value = index; highlightParagraph(index)
    const text = p.innerText?.trim() || ''
    if (text.length < 2) { playWithBrowserTTS(index + 1); return }
    const ownerWindow = p.ownerDocument?.defaultView || window
    try {
      const utterance = new ownerWindow.SpeechSynthesisUtterance(text)
      const voices = ownerWindow.speechSynthesis.getVoices()
      const voice = getVoiceForText(voices, text)
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang || 'zh-CN' }
      utterance.rate = Math.max(0.5, Math.min(2.0, speechRate.value))
      utterance.pitch = 1.0; utterance.volume = 1.0
      utterance.onend = () => { if (isPlaying.value && !isPaused.value) playWithBrowserTTS(index + 1) }
      utterance.onerror = (event) => { console.warn('[TTS] Error on index', index, ':', event.error) }
      ownerWindow.speechSynthesis.cancel()
      setTimeout(() => { if (isPlaying.value && !isPaused.value) ownerWindow.speechSynthesis.speak(utterance) }, 50)
    } catch (e) { console.error('[TTS] Failed to create utterance:', e) }
  }

  const playWithServerTTS = async (index: number, fetchFn: (text: string) => Promise<Blob>) => {
    if (!isPlaying.value || isPaused.value || index >= paragraphNodes.value.length) { if (!isPaused.value) stop(); return }
    const p = paragraphNodes.value[index]
    if (!p) { await playWithServerTTS(index + 1, fetchFn); return }
    activeIndex.value = index; highlightParagraph(index)
    const text = p.innerText?.trim() || ''
    if (text.length < 2) { await playWithServerTTS(index + 1, fetchFn); return }
    prefetchEdgeTTS(index + 1)
    try {
      let audioBlob: Blob; let audioUrl: string
      const cacheItem = prefetchCache.value.get(index)
      if (cacheItem?.isReady && cacheItem.audioUrl && !cacheItem.error) {
        audioBlob = cacheItem.audioBlob!; audioUrl = cacheItem.audioUrl; prefetchCache.value.delete(index)
      } else {
        audioBlob = await fetchFn(text); audioUrl = URL.createObjectURL(audioBlob)
      }
      // Capture blob if recording is active
      if (isRecordingTTS.value) {
        recordingBlobs.value.push(audioBlob)
        recordingText.value += text + '\n'
      }
      if (currentAudioUrl && currentAudioUrl !== audioUrl) URL.revokeObjectURL(currentAudioUrl)
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
      currentAudio.onended = () => { if (isPlaying.value && !isPaused.value) playWithServerTTS(index + 1, fetchFn) }
      currentAudio.onerror = (e) => { console.error('[TTS] Audio playback error:', e); if (isPlaying.value && !isPaused.value) playWithBrowserTTS(index) }
    } catch (error) {
      console.error('[TTS] Error:', error)
      if (isPlaying.value && !isPaused.value) playWithBrowserTTS(index)
    }
  }

  const playSequence = (index: number) => {
    if (ttsProvider.value === 'edge') {
      playWithServerTTS(index, fetchEdgeTTSAudio)
    } else if (ttsProvider.value === 'ai_voice') {
      playWithServerTTS(index, fetchAIVoiceAudio)
    } else {
      playWithBrowserTTS(index)
    }
  }

  const start = (nodes: HTMLElement[], startIndex: number = 0) => {
    if (!isPaused.value) { stop(); clearPrefetchCache() }
    paragraphNodes.value = nodes.filter(p => p && p.innerText?.trim().length > 1)
    if (paragraphNodes.value.length > 0) {
      isPlaying.value = true; isPaused.value = false
      playSequence(startIndex)
    }
  }

  const speakSelectionWithBrowserTTS = (text: string, element?: HTMLElement) => {
    const targetWindow = element?.ownerDocument?.defaultView || window
    try {
      const utterance = new targetWindow.SpeechSynthesisUtterance(text.trim())
      const voices = targetWindow.speechSynthesis.getVoices()
      const voice = getVoiceForText(voices, text)
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang || 'zh-CN' }
      utterance.rate = Math.max(0.5, Math.min(2.0, speechRate.value)); utterance.pitch = 1.0; utterance.volume = 1.0
      utterance.onend = () => { isPlaying.value = false }
      utterance.onerror = () => { isPlaying.value = false }
      targetWindow.speechSynthesis.cancel()
      setTimeout(() => { targetWindow.speechSynthesis.speak(utterance) }, 50)
      isPlaying.value = true
    } catch (e) { console.error('[TTS] speakSelection error:', e) }
  }

  const speakSelectionWithServerTTS = async (text: string, fetchFn: (text: string) => Promise<Blob>) => {
    try {
      const audioBlob = await fetchFn(text)
      if (!audioBlob || audioBlob.size === 0) throw new Error('Empty audio')
      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl)
      currentAudioUrl = URL.createObjectURL(audioBlob)
      currentAudio = new Audio(currentAudioUrl)
      currentAudio.playbackRate = Math.max(0.5, Math.min(2.0, speechRate.value))
      await currentAudio.play()
      currentAudio.onended = () => { isPlaying.value = false }
      currentAudio.onerror = () => { isPlaying.value = false; speakSelectionWithBrowserTTS(text) }
      isPlaying.value = true
    } catch (error) { console.error('[TTS] Selection error:', error); speakSelectionWithBrowserTTS(text) }
  }

  const speakSelection = (text: string, element?: HTMLElement) => {
    stop()
    if (!text || text.trim().length < 1) return
    if (ttsProvider.value === 'edge') {
      speakSelectionWithServerTTS(text, fetchEdgeTTSAudio)
    } else if (ttsProvider.value === 'ai_voice') {
      speakSelectionWithServerTTS(text, fetchAIVoiceAudio)
    } else {
      speakSelectionWithBrowserTTS(text, element)
    }
  }

  // Full book TTS: generate audio for entire book text
  const generateBookAudio = async (texts: string[], onProgress?: (index: number, total: number) => void): Promise<Blob[]> => {
    const fetchFn = ttsProvider.value === 'ai_voice' ? fetchAIVoiceAudio : fetchEdgeTTSAudio
    const blobs: Blob[] = []
    for (let i = 0; i < texts.length; i++) {
      if (onProgress) onProgress(i + 1, texts.length)
      try {
        const blob = await fetchFn(texts[i])
        blobs.push(blob)
      } catch (e) {
        console.warn(`[Full TTS] Failed for segment ${i}:`, e)
      }
    }
    return blobs
  }

  // Recording TTS output: start/stop recording during playback
  const startRecordingTTS = () => {
    isRecordingTTS.value = true
    recordingBlobs.value = []
    recordingText.value = ''
  }

  const stopRecordingTTS = (): { blob: Blob | null; url: string; text: string } | null => {
    isRecordingTTS.value = false
    if (recordingBlobs.value.length === 0) return null
    const merged = new Blob(recordingBlobs.value, { type: 'audio/mpeg' })
    const url = URL.createObjectURL(merged)
    const text = recordingText.value
    recordingBlobs.value = []
    recordingText.value = ''
    return { blob: merged, url, text }
  }

  // Per-chapter book TTS: extract text per chapter, generate audio per chapter
  const generateChapterAudios = async (
    chapters: { title: string; texts: string[] }[],
    onProgress?: (chapterIndex: number, totalChapters: number, paragraphIndex: number, totalParagraphs: number) => void
  ): Promise<{ title: string; blob: Blob; url: string; paragraphCount: number }[]> => {
    const fetchFn = ttsProvider.value === 'ai_voice' ? fetchAIVoiceAudio : fetchEdgeTTSAudio
    const results: { title: string; blob: Blob; url: string; paragraphCount: number }[] = []

    for (let ci = 0; ci < chapters.length; ci++) {
      const chapter = chapters[ci]
      const chapterBlobs: Blob[] = []

      for (let pi = 0; pi < chapter.texts.length; pi++) {
        if (onProgress) onProgress(ci + 1, chapters.length, pi + 1, chapter.texts.length)
        try {
          const blob = await fetchFn(chapter.texts[pi])
          chapterBlobs.push(blob)
        } catch (e) {
          console.warn(`[Chapter TTS] Failed for chapter "${chapter.title}" paragraph ${pi}:`, e)
        }
      }

      if (chapterBlobs.length > 0) {
        const merged = new Blob(chapterBlobs, { type: 'audio/mpeg' })
        results.push({
          title: chapter.title || `Chapter ${ci + 1}`,
          blob: merged,
          url: URL.createObjectURL(merged),
          paragraphCount: chapterBlobs.length,
        })
      }
    }

    return results
  }

  const skipNext = () => {
    if (isPlaying.value && activeIndex.value < paragraphNodes.value.length - 1) {
      if (currentAudio) { currentAudio.onended = null; currentAudio.pause() }
      window.speechSynthesis.cancel(); clearPrefetchCache(); playSequence(activeIndex.value + 1)
    }
  }

  const skipPrevious = () => {
    if (isPlaying.value && activeIndex.value > 0) {
      if (currentAudio) { currentAudio.onended = null; currentAudio.pause() }
      window.speechSynthesis.cancel(); clearPrefetchCache(); playSequence(activeIndex.value - 1)
    }
  }

  // Persist settings
  const persistSettings = () => {
    saveTTSSettings({
      provider: ttsProvider.value,
      edgeEndpoint: edgeTTSEndpoint.value,
      edgeVoice: edgeTTSVoice.value,
      edgeRate: edgeTTSRate.value,
      edgePitch: edgeTTSPitch.value,
      edgeApiKey: edgeTTSApiKey.value,
      speechRate: speechRate.value,
      selectedVoiceURI: selectedVoiceURI.value,
      aiVoiceProvider: aiVoiceProvider.value,
      aiVoiceConfigs: aiVoiceConfigs.value,
    })
  }

  // AI Voice helper: get voices for selected model
  const getAIVoicesForModel = computed((): AIVoice[] => {
    return AI_VOICES.filter(v => v.model === aiVoiceModel.value)
  })

  return {
    isPlaying: computed(() => isPlaying.value),
    isPaused: computed(() => isPaused.value),
    pausedIndex: computed(() => pausedIndex.value),
    activeIndex: computed(() => activeIndex.value),
    speechRate, selectedVoiceURI,
    availableVoices: computed(() => availableVoices.value),
    voicesLoaded: computed(() => voicesLoaded.value),
    ttsProvider,
    edgeTTSEndpoint, edgeTTSVoice, edgeTTSRate, edgeTTSPitch, edgeTTSApiKey, edgeTTSAvailable,
    edgeVoices: computed(() => edgeVoices.value),
    edgeTTSVoices: computed(() => edgeVoices.value),
    // AI Voice (independent config)
    aiVoiceEndpoint, aiVoiceApiKey, aiVoiceModel, aiVoiceId, aiVoiceAvailable,
    aiVoices: computed(() => AI_VOICES),
    aiVoicesForModel: getAIVoicesForModel,
    start, stop, pause, speakSelection, skipNext, skipPrevious,
    generateBookAudio,
    generateChapterAudios,
    startRecordingTTS, stopRecordingTTS,
    isRecordingTTS: computed(() => isRecordingTTS.value),
    checkEdgeTTSServer,
    checkAIVoiceServer,
    setRate: (rate: number) => { speechRate.value = rate; persistSettings() },
    setVoice: (uri: string | null) => { selectedVoiceURI.value = uri || ''; persistSettings() },
    setProvider: (p: TTSProvider) => { ttsProvider.value = p; persistSettings() },
    setTTSProvider: (p: TTSProvider) => { ttsProvider.value = p; persistSettings() },
    setEdgeTTSEndpoint: (url: string) => { edgeTTSEndpoint.value = url; persistSettings() },
    setEdgeTTSVoice: (voice: string) => { edgeTTSVoice.value = voice; persistSettings() },
    setEdgeVoice: (voice: string) => { edgeTTSVoice.value = voice; persistSettings() },
    setEdgeTTSRate: (rate: string) => { edgeTTSRate.value = rate; persistSettings() },
    setEdgeTTSPitch: (pitch: string) => { edgeTTSPitch.value = pitch; persistSettings() },
    setEdgeTTSApiKey: (k: string) => { edgeTTSApiKey.value = k; persistSettings() },
    setAIVoiceEndpoint: (url: string) => { aiVoiceEndpoint.value = url; persistSettings() },
    setAIVoiceApiKey: (k: string) => { aiVoiceApiKey.value = k; persistSettings() },
    setAIVoiceModel: (m: AIVoiceModel) => { aiVoiceModel.value = m; persistSettings() },
    setAIVoiceId: (id: string) => { aiVoiceId.value = id; persistSettings() },
    setAIVoiceProvider: (p: string) => { aiVoiceProvider.value = p; persistSettings() },
    aiVoiceProvider: computed(() => aiVoiceProvider.value),
    refreshVoices: loadVoices,
  }
})
