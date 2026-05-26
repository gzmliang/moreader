<template>
  <transition name="fade">
    <div v-if="visible" class="fixed top-14 right-4 z-[99] w-80 max-h-[80vh] overflow-y-auto p-4 rounded-lg shadow-xl border" :class="[theme.menuBgClass, theme.borderColor]" @mousedown.stop>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold" :class="theme.textColor">{{ t('llm.title') }}</h3>
          <button @click="$emit('close')" class="p-1 rounded hover:bg-black/10" :class="theme.textColor">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Provider Selection -->
        <div>
          <label class="text-sm font-medium mb-2 block" :class="theme.textColor">{{ t('llm.provider') }}</label>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="key in ['siliconflow', 'deepseek', 'openrouter', 'custom']" :key="key"
              @click="handleSetProvider(key as any)"
              class="px-3 py-2 text-xs rounded border transition-colors"
              :class="[config.provider === key ? (isDark ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : borderColor + ' ' + theme.textColor]">
              {{ providerNames[key as LLMProvider] }}
            </button>
          </div>
        </div>

        <!-- API Key -->
        <div>
          <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('llm.apiKey') }}</label>
          <input v-model="localApiKey" type="password" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent"
            :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" :placeholder="t('llm.apiKeyRequired')" />
        </div>

        <!-- Endpoint -->
        <div>
          <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('llm.endpoint') }}</label>
          <input v-model="localEndpoint" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent"
            :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" />
        </div>

        <!-- Model -->
        <div>
          <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('llm.model') }}</label>
          <input v-model="localModel" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent"
            :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" />
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button @click="handleTestConnection" :disabled="testing"
            class="flex-1 px-3 py-2 text-xs rounded border transition-colors"
            :class="[theme.borderColor, theme.textColor, testing ? 'opacity-50' : 'hover:bg-black/10']">
            {{ testing ? '...' : t('llm.testConnection') }}
          </button>
          <button @click="handleSave"
            class="flex-1 px-3 py-2 text-xs rounded bg-blue-500 text-white transition-colors hover:bg-blue-600">
            {{ t('llm.save') }}
          </button>
        </div>

        <!-- Test Result -->
        <p v-if="testResult !== null" class="text-xs text-center" :class="testResult ? 'text-green-500' : 'text-red-500'">
          {{ testResult ? t('llm.connectionSuccess') : t('llm.connectionFailed') }}
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useLLMStore } from '@/stores/llmStore'
import type { LLMProvider } from '@/types/book'
import { LLM_PROVIDER_CONFIG } from '@/types/book'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  theme: Record<string, string>
  isDark: boolean
}>()

defineEmits(['close'])

const llmStore = useLLMStore()
const config = computed(() => llmStore.config)
const testing = ref(false)
const testResult = ref<boolean | null>(null)

const localApiKey = ref('')
const localEndpoint = ref('')
const localModel = ref('')

const providerNames: Record<LLMProvider, string> = {
  siliconflow: 'SiliconFlow',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  custom: 'Custom',
}

const borderColor = computed(() => props.theme.borderColor)

onMounted(() => {
  localApiKey.value = config.value.apiKey
  localEndpoint.value = config.value.endpoint
  localModel.value = config.value.model
})

const handleSetProvider = (provider: LLMProvider) => {
  llmStore.setProvider(provider)
  localEndpoint.value = config.value.endpoint
  localModel.value = config.value.model
  localApiKey.value = config.value.apiKey
}

const handleSave = () => {
  llmStore.setApiKey(localApiKey.value)
  llmStore.setEndpoint(localEndpoint.value)
  llmStore.setModel(localModel.value)
  testResult.value = null
}

const handleTestConnection = async () => {
  testing.value = true
  testResult.value = null
  const result = await llmStore.testConnection()
  testing.value = false
  testResult.value = result.success
}
</script>
