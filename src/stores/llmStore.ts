import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LLMProvider, LLMConfig, TranslateMode } from '@/types/book'
import { LLM_PROVIDER_CONFIG } from '@/types/book'
import llmService from '@/services/llm'

const STORAGE_KEY = 'moreader-llm-config'

const loadConfig = (): LLMConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) { console.warn('Failed to load LLM config:', e) }
  return { provider: 'siliconflow', apiKey: '', endpoint: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct' }
}

const saveConfig = (config: LLMConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export const useLLMStore = defineStore('llm', () => {
  const config = ref<LLMConfig>(loadConfig())
  const isTranslating = ref(false)
  const lastResult = ref<string>('')
  const lastError = ref<string>('')
  const streamingText = ref<string>('')

  const providerName = computed(() => LLM_PROVIDER_CONFIG[config.value.provider]?.name || 'Unknown')

  function setProvider(provider: LLMProvider) {
    const preset = LLM_PROVIDER_CONFIG[provider]
    config.value.provider = provider
    config.value.endpoint = preset.defaultEndpoint
    config.value.model = preset.defaultModel
    saveConfig(config.value)
  }

  function setApiKey(apiKey: string) {
    config.value.apiKey = apiKey
    saveConfig(config.value)
  }

  function setEndpoint(endpoint: string) {
    config.value.endpoint = endpoint
    saveConfig(config.value)
  }

  function setModel(model: string) {
    config.value.model = model
    saveConfig(config.value)
  }

  async function translate(text: string, mode: TranslateMode = 'translate', onChunk?: (chunk: string) => void) {
    if (!config.value.apiKey) {
      lastError.value = 'noApiKey'
      return false
    }
    isTranslating.value = true
    lastError.value = ''
    lastResult.value = ''
    streamingText.value = ''

    // Pass a wrapper that updates streamingText
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

  return {
    config: computed(() => config.value),
    isTranslating: computed(() => isTranslating.value),
    lastResult: computed(() => lastResult.value),
    lastError: computed(() => lastError.value),
    streamingText: computed(() => streamingText.value),
    providerName,
    setProvider, setApiKey, setEndpoint, setModel,
    translate, testConnection,
  }
})
