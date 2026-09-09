export interface BookMetadata {
  id: string
  title: string
  author: string
  cover?: string
  addedAt: number
  lastRead?: number
  currentLocation?: string
  progress?: number           // 阅读百分比 0-1（用于跨设备同步取大值）
}

export interface Theme {
  id: string
  name: string
  previewBg: string
  containerBg: string
  textColor: string
  readerBg: string
  readerText: string
  isDark: boolean
}

export type TTSProvider = 'browser' | 'edge' | 'ai_voice'

export interface EdgeVoice {
  id: string
  name: string
  locale: string
  lang: string
  gender?: 'male' | 'female' | 'child'
}

// SiliconFlow TTS voices
export interface AIVoice {
  id: string  // e.g. "fnlp/MOSS-TTSD-v0.5:alex"
  name: string  // e.g. "Alex (男)"
  model: string  // e.g. "fnlp/MOSS-TTSD-v0.5"
  lang: string  // e.g. "中英双语"
  gender: string  // "男" | "女"
}

export const AI_VOICE_MODELS = ['fnlp/MOSS-TTSD-v0.5', 'FunAudioLLM/CosyVoice2-0.5B'] as const
export type AIVoiceModel = typeof AI_VOICE_MODELS[number]

// TTS presets for different providers
export interface TTSPreset {
  id: string
  name: string
  endpoint: string
  models: { id: string; name: string; voices: { id: string; name: string }[] }[]
}

export const TTS_PRESETS: TTSPreset[] = [
  {
    id: 'siliconflow',
    name: 'SiliconFlow 硅基流动',
    endpoint: 'https://api.siliconflow.cn/v1',
    models: [
      {
        id: 'fnlp/MOSS-TTSD-v0.5',
        name: 'MOSS-TTSD v0.5',
        voices: [
          { id: 'fnlp/MOSS-TTSD-v0.5:anna', name: 'Anna (女)' },
          { id: 'fnlp/MOSS-TTSD-v0.5:alex', name: 'Alex (男)' },
          { id: 'fnlp/MOSS-TTSD-v0.5:bella', name: 'Bella (女)' },
          { id: 'fnlp/MOSS-TTSD-v0.5:benjamin', name: 'Benjamin (男)' },
          { id: 'fnlp/MOSS-TTSD-v0.5:charles', name: 'Charles (男)' },
          { id: 'fnlp/MOSS-TTSD-v0.5:claire', name: 'Claire (女)' },
          { id: 'fnlp/MOSS-TTSD-v0.5:david', name: 'David (男)' },
          { id: 'fnlp/MOSS-TTSD-v0.5:diana', name: 'Diana (女)' },
        ],
      },
      {
        id: 'FunAudioLLM/CosyVoice2-0.5B',
        name: 'CosyVoice2 0.5B',
        voices: [
          { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', name: 'Anna (女)' },
          { id: 'FunAudioLLM/CosyVoice2-0.5B:alex', name: 'Alex (男)' },
          { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', name: 'Bella (女)' },
          { id: 'FunAudioLLM/CosyVoice2-0.5B:benjamin', name: 'Benjamin (男)' },
          { id: 'FunAudioLLM/CosyVoice2-0.5B:charles', name: 'Charles (男)' },
          { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', name: 'Claire (女)' },
          { id: 'FunAudioLLM/CosyVoice2-0.5B:david', name: 'David (男)' },
          { id: 'FunAudioLLM/CosyVoice2-0.5B:diana', name: 'Diana (女)' },
        ],
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    models: [
      {
        id: 'tts-1',
        name: 'tts-1 (标准)',
        voices: [
          { id: 'alloy', name: 'Alloy' },
          { id: 'echo', name: 'Echo' },
          { id: 'fable', name: 'Fable' },
          { id: 'onyx', name: 'Onyx (男)' },
          { id: 'nova', name: 'Nova (女)' },
          { id: 'shimmer', name: 'Shimmer (女)' },
        ],
      },
      {
        id: 'tts-1-hd',
        name: 'tts-1-hd (高清)',
        voices: [
          { id: 'alloy', name: 'Alloy' },
          { id: 'echo', name: 'Echo' },
          { id: 'fable', name: 'Fable' },
          { id: 'onyx', name: 'Onyx (男)' },
          { id: 'nova', name: 'Nova (女)' },
          { id: 'shimmer', name: 'Shimmer (女)' },
        ],
      },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'sesame/csm-1b',
        name: 'CSM 1B (英文)',
        voices: [
          { id: 'default', name: 'Default' },
        ],
      },
      {
        id: 'hexgrad/kokoro-82m',
        name: 'Kokoro 82M (多语言)',
        voices: [
          { id: 'zf', name: '中文女' },
          { id: 'zm', name: '中文男' },
          { id: 'af', name: 'English Female' },
          { id: 'am', name: 'English Male' },
        ],
      },
    ],
  },
]

export type LLMProvider = 'siliconflow' | 'deepseek' | 'openrouter' | 'custom'

export const LLM_PROVIDER_CONFIG: Record<string, { name: string; defaultEndpoint: string; defaultModel: string }> = {
  siliconflow: { name: 'SiliconFlow', defaultEndpoint: 'https://api.siliconflow.cn/v1', defaultModel: 'Qwen/Qwen2.5-72B-Instruct' },
  deepseek: { name: 'DeepSeek', defaultEndpoint: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
  openrouter: { name: 'OpenRouter', defaultEndpoint: 'https://openrouter.ai/api/v1', defaultModel: 'qwen/qwen-2.5-72b-instruct' },
  custom: { name: 'Custom', defaultEndpoint: 'https://api.openai.com/v1', defaultModel: 'deepseek-chat' },
}

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  endpoint: string
  model: string
  sourceLang?: string
  targetLang?: string
}

export type TranslateMode = 'translate' | 'explain' | 'analyze'

// External translation service types
export type ExtTranslateSource = 'google' | 'youdao' | 'baidu' | 'deepl' | 'cambridge' | 'oxford'

// Full book TTS
export interface BookTTSProgress {
  isRunning: boolean
  currentChapter: number
  totalChapters: number
  currentText: string
  audioBlob?: Blob
  error?: string
}

// ===== 书签 / 高亮 / 生词本 =====

export interface Bookmark {
  id: string
  bookId: string
  bookTitle: string
  cfi: string
  text: string       // 段落实录（前 80 字）
  chapterHint?: string  // 章节名
  createdAt: number
}

export interface Highlight {
  id: string
  bookId: string
  bookTitle: string
  cfiRange: string
  text: string
  color: string      // 高亮颜色 hex，默认 '#FFEB3B'
  note?: string      // 用户备注
  createdAt: number
}

export interface VocabWord {
  id: string
  bookId: string
  bookTitle: string
  word: string
  definition: string
  context: string    // 所在句子
  cfi?: string       // 回到原文位置
  createdAt: number
}
