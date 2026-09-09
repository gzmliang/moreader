import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LLMProvider, LLMConfig, TranslateMode } from '@/types/book'
import { LLM_PROVIDER_CONFIG } from '@/types/book'
import llmService from '@/services/llm'

const STORAGE_KEY = 'moreader-llm-config'

export interface LLMProviderItemConfig {
  apiKey: string
  endpoint: string
  model: string
}

const DEFAULT_PROVIDER_CONFIGS: Record<LLMProvider, LLMProviderItemConfig> = {
  siliconflow: {
    apiKey: '',
    endpoint: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-72B-Instruct',
  },
  deepseek: {
    apiKey: '',
    endpoint: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  openrouter: {
    apiKey: '',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'qwen/qwen-2.5-72b-instruct',
  },
  custom: {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'deepseek-chat',
  },
}

interface StoredLLMData {
  provider: LLMProvider
  providerConfigs?: Record<string, LLMProviderItemConfig>
  apiKey?: string
  endpoint?: string
  model?: string
  sourceLang?: string
  targetLang?: string
}

function loadStoredData(): { provider: LLMProvider; providerConfigs: Record<LLMProvider, LLMProviderItemConfig>; sourceLang: string; targetLang: string } {
  let provider: LLMProvider = 'siliconflow'
  let sourceLang = 'auto'
  let targetLang = 'zh-CN'
  const providerConfigs: Record<LLMProvider, LLMProviderItemConfig> = {
    siliconflow: { ...DEFAULT_PROVIDER_CONFIGS.siliconflow },
    deepseek: { ...DEFAULT_PROVIDER_CONFIGS.deepseek },
    openrouter: { ...DEFAULT_PROVIDER_CONFIGS.openrouter },
    custom: { ...DEFAULT_PROVIDER_CONFIGS.custom },
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed: StoredLLMData = JSON.parse(saved)
      if (parsed.provider && LLM_PROVIDER_CONFIG[parsed.provider]) {
        provider = parsed.provider
      }
      if (parsed.sourceLang) sourceLang = parsed.sourceLang
      if (parsed.targetLang) targetLang = parsed.targetLang
      if (parsed.providerConfigs) {
        for (const k of Object.keys(DEFAULT_PROVIDER_CONFIGS) as LLMProvider[]) {
          if (parsed.providerConfigs[k]) {
            providerConfigs[k] = { ...DEFAULT_PROVIDER_CONFIGS[k], ...parsed.providerConfigs[k] }
          }
        }
      } else if (parsed.endpoint || parsed.apiKey || parsed.model) {
        providerConfigs[provider] = {
          endpoint: parsed.endpoint || DEFAULT_PROVIDER_CONFIGS[provider].endpoint,
          apiKey: parsed.apiKey || '',
          model: parsed.model || DEFAULT_PROVIDER_CONFIGS[provider].model,
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load LLM config:', e)
  }

  return { provider, providerConfigs, sourceLang, targetLang }
}

export const useLLMStore = defineStore('llm', () => {
  const initial = loadStoredData()
  const currentProvider = ref<LLMProvider>(initial.provider)
  const providerConfigs = ref<Record<LLMProvider, LLMProviderItemConfig>>(initial.providerConfigs)
  const sourceLang = ref<string>(initial.sourceLang)
  const targetLang = ref<string>(initial.targetLang)

  const isTranslating = ref(false)
  const lastResult = ref<string>('')
  const lastError = ref<string>('')
  const streamingText = ref<string>('')

  const providerName = computed(() => LLM_PROVIDER_CONFIG[currentProvider.value]?.name || 'Unknown')

  const config = computed<LLMConfig>(() => {
    const curr = providerConfigs.value[currentProvider.value] || DEFAULT_PROVIDER_CONFIGS[currentProvider.value]
    return {
      provider: currentProvider.value,
      apiKey: curr.apiKey || '',
      endpoint: curr.endpoint || '',
      model: curr.model || '',
      sourceLang: sourceLang.value,
      targetLang: targetLang.value,
    }
  })

  function save() {
    const data: StoredLLMData = {
      provider: currentProvider.value,
      providerConfigs: providerConfigs.value,
      apiKey: config.value.apiKey,
      endpoint: config.value.endpoint,
      model: config.value.model,
      sourceLang: sourceLang.value,
      targetLang: targetLang.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function setProvider(provider: LLMProvider) {
    currentProvider.value = provider
    if (!providerConfigs.value[provider]) {
      providerConfigs.value[provider] = { ...DEFAULT_PROVIDER_CONFIGS[provider] }
    }
    save()
  }

  function setApiKey(apiKey: string) {
    if (!providerConfigs.value[currentProvider.value]) {
      providerConfigs.value[currentProvider.value] = { ...DEFAULT_PROVIDER_CONFIGS[currentProvider.value] }
    }
    providerConfigs.value[currentProvider.value].apiKey = apiKey
    save()
  }

  function setEndpoint(endpoint: string) {
    if (!providerConfigs.value[currentProvider.value]) {
      providerConfigs.value[currentProvider.value] = { ...DEFAULT_PROVIDER_CONFIGS[currentProvider.value] }
    }
    providerConfigs.value[currentProvider.value].endpoint = endpoint
    save()
  }

  function setModel(model: string) {
    if (!providerConfigs.value[currentProvider.value]) {
      providerConfigs.value[currentProvider.value] = { ...DEFAULT_PROVIDER_CONFIGS[currentProvider.value] }
    }
    providerConfigs.value[currentProvider.value].model = model
    save()
  }

  function updateConfig(apiKey: string, endpoint: string, model: string) {
    if (!providerConfigs.value[currentProvider.value]) {
      providerConfigs.value[currentProvider.value] = { ...DEFAULT_PROVIDER_CONFIGS[currentProvider.value] }
    }
    providerConfigs.value[currentProvider.value].apiKey = apiKey
    providerConfigs.value[currentProvider.value].endpoint = endpoint
    providerConfigs.value[currentProvider.value].model = model
    save()
  }

  async function translate(text: string, mode: TranslateMode = 'translate', onChunk?: (chunk: string) => void) {
    if (!config.value.apiKey && config.value.provider !== 'custom') {
      lastError.value = 'noApiKey'
      return false
    }
    isTranslating.value = true
    lastError.value = ''
    lastResult.value = ''
    streamingText.value = ''

    const wrapper = onChunk
      ? (chunk: string) => {
          streamingText.value += chunk
          onChunk(chunk)
        }
      : undefined

    const result = await llmService.callLLM(config.value, text, mode, wrapper)
    isTranslating.value = false

    if (result.success) {
      lastResult.value = result.text
      return true
    } else {
      lastError.value = result.error || 'unknown'
      return false
    }
  }

  async function testConnection() {
    const result = await llmService.testLLMConnection(config.value)
    return result
  }

  function setLanguages(source: string, target: string) {
    sourceLang.value = source
    targetLang.value = target
    save()
  }

  return {
    config,
    sourceLang,
    targetLang,
    isTranslating: computed(() => isTranslating.value),
    lastResult: computed(() => lastResult.value),
    lastError: computed(() => lastError.value),
    streamingText: computed(() => streamingText.value),
    providerName,
    setProvider,
    setApiKey,
    setEndpoint,
    setModel,
    setLanguages,
    updateConfig,
    translate,
    testConnection,
  }
})
