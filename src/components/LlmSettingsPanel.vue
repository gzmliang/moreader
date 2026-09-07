<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" @click.self="$emit('close')">
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 border transition-colors duration-300"
         :class="[theme.containerBg || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800']">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 mb-5 border-b" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🤖</span>
          <div>
            <h3 class="text-base font-bold leading-tight" :class="theme.textColor">{{ t('llm.title') }}</h3>
            <p class="text-[11px] opacity-50 mt-0.5" :class="theme.textColor">{{ t('llm.panelSubtitle') }}</p>
          </div>
        </div>
        <button @click="$emit('close')" class="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" :class="theme.textColor">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex flex-col gap-4 text-xs">
        <!-- Provider Selection -->
        <div>
          <label class="font-semibold mb-2 block opacity-75" :class="theme.textColor">{{ t('llm.provider') }}</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button v-for="key in ['siliconflow', 'deepseek', 'openrouter', 'custom']" :key="key"
              @click="handleSetProvider(key as any)"
              class="py-2.5 px-3 rounded-xl border font-medium transition-all text-center"
              :class="[config.provider === key ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shadow-sm' : 'opacity-65 hover:opacity-100 ' + (theme.borderColor || 'border-zinc-200 dark:border-zinc-800')]">
              <div>{{ t('llm.' + key) || providerNames[key as LLMProvider] }}</div>
              <div class="text-[10px] opacity-60 font-normal mt-0.5">
                {{ key === 'custom' ? t('llm.subCustom') : key === 'deepseek' ? t('llm.subDeepseek') : key === 'siliconflow' ? t('llm.subSiliconflow') : t('llm.subOpenrouter') }}
              </div>
            </button>
          </div>
        </div>

        <!-- API Key -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="font-medium opacity-75" :class="theme.textColor">{{ t('llm.apiKey') }}</label>
            <span v-if="config.provider === 'custom'" class="text-[10.5px] text-zinc-400 dark:text-zinc-500">
              {{ t('llm.optionalAuth') }}
            </span>
          </div>
          <input v-model="localApiKey" type="password"
            class="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none transition-colors"
            :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor]"
            :placeholder="config.provider === 'custom' ? t('llm.customApiKeyPlaceholder') : t('llm.apiKeyRequired')" />
        </div>

        <!-- Endpoint -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="font-medium opacity-75" :class="theme.textColor">{{ t('llm.endpoint') }}</label>
            <span class="text-[10.5px] text-zinc-400 dark:text-zinc-500">
              {{ t('llm.autoCompletePath') }}
            </span>
          </div>
          <input v-model="localEndpoint"
            class="w-full px-3.5 py-2.5 rounded-xl border bg-transparent font-mono text-xs outline-none transition-colors"
            :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor]"
            :placeholder="config.provider === 'custom' ? t('llm.customEndpointPlaceholder') : 'https://.../v1'" />
        </div>

        <!-- Model -->
        <div>
          <label class="font-medium mb-1.5 block opacity-75" :class="theme.textColor">{{ t('llm.model') }}</label>
          <input v-model="localModel"
            class="w-full px-3.5 py-2.5 rounded-xl border bg-transparent font-mono text-xs outline-none transition-colors"
            :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor]"
            :placeholder="config.provider === 'custom' ? t('llm.customModelPlaceholder') : 'model name'" />
        </div>

        <!-- Actions -->
        <div class="flex gap-2.5 pt-2">
          <button @click="handleTestConnection" :disabled="testing"
            class="flex-1 py-2.5 px-4 rounded-xl border font-medium transition-all flex items-center justify-center gap-1.5"
            :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor, testing ? 'opacity-50' : 'hover:bg-black/5 dark:hover:bg-white/5']">
            <RefreshCw v-if="testing" class="w-3.5 h-3.5 animate-spin" />
            <span>{{ testing ? t('llm.testing') : t('llm.testConnection') }}</span>
          </button>
          <button @click="handleSave"
            class="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition-all shadow-md flex items-center justify-center gap-1.5">
            <Check v-if="savedFeedback" class="w-3.5 h-3.5" />
            <span>{{ savedFeedback ? t('llm.saved') : t('llm.save') }}</span>
          </button>
        </div>

        <!-- Test Result -->
        <div v-if="testResult !== null" class="p-3 rounded-xl text-xs text-center border transition-all"
             :class="testResult ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'">
          <div class="flex items-center justify-center gap-1.5 font-semibold">
            <CheckCircle2 v-if="testResult" class="w-4 h-4 text-emerald-500" />
            <AlertCircle v-else class="w-4 h-4 text-red-500" />
            <span>{{ testResult ? t('llm.connectionSuccess') : t('llm.connectionFailed') }}</span>
          </div>
          <p v-if="!testResult && testErrorMsg" class="text-[11px] mt-1.5 opacity-85 break-all leading-relaxed font-mono">
            {{ testErrorMsg }}
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { X, RefreshCw, Check, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useLLMStore } from '@/stores/llmStore'
import type { LLMProvider } from '@/types/book'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  theme: Record<string, string>
  isDark: boolean
}>()

const emit = defineEmits(['close'])

const llmStore = useLLMStore()
const config = computed(() => llmStore.config)
const testing = ref(false)
const testResult = ref<boolean | null>(null)
const testErrorMsg = ref('')
const savedFeedback = ref(false)

const localApiKey = ref('')
const localEndpoint = ref('')
const localModel = ref('')

const providerNames: Record<LLMProvider, string> = {
  siliconflow: 'SiliconFlow',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  custom: 'Custom',
}

function syncFromConfig() {
  localApiKey.value = config.value.apiKey
  localEndpoint.value = config.value.endpoint
  localModel.value = config.value.model
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    emit('close')
  }
}

onMounted(() => {
  syncFromConfig()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.visible, (v) => {
  if (v) {
    syncFromConfig()
    testResult.value = null
    testErrorMsg.value = ''
    savedFeedback.value = false
  }
})

const handleSetProvider = (provider: LLMProvider) => {
  // 1. Auto-save current form into current provider slot first
  llmStore.updateConfig(localApiKey.value, localEndpoint.value, localModel.value)
  // 2. Switch provider
  llmStore.setProvider(provider)
  // 3. Load newly switched provider's remembered values
  syncFromConfig()
  testResult.value = null
  testErrorMsg.value = ''
  savedFeedback.value = false
}

const handleSave = () => {
  llmStore.updateConfig(localApiKey.value, localEndpoint.value, localModel.value)
  testResult.value = null
  testErrorMsg.value = ''
  savedFeedback.value = true
  setTimeout(() => { savedFeedback.value = false }, 2000)
}

const handleTestConnection = async () => {
  // Auto-save form inputs so test always runs on latest typed values!
  handleSave()
  testing.value = true
  testResult.value = null
  testErrorMsg.value = ''
  const result = await llmStore.testConnection()
  testing.value = false
  testResult.value = result.success
  testErrorMsg.value = result.error || ''
}
</script>
