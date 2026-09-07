<template>
  <transition name="fade">
    <div v-if="visible" class="fixed top-14 right-4 z-[99] w-84 max-h-[85vh] overflow-y-auto p-4 rounded-xl shadow-2xl border backdrop-blur-xl" :class="[theme.menuBgClass, theme.borderColor]" @mousedown.stop>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between pb-1 border-b" :class="theme.borderColor">
          <div class="flex items-center gap-2">
            <span class="text-base">🤖</span>
            <h3 class="text-sm font-bold" :class="theme.textColor">{{ t('llm.title') }}</h3>
          </div>
          <button @click="$emit('close')" class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors" :class="theme.textColor">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Provider Selection -->
        <div>
          <label class="text-xs font-semibold mb-2 block opacity-70" :class="theme.textColor">{{ t('llm.provider') }}</label>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="key in ['siliconflow', 'deepseek', 'openrouter', 'custom']" :key="key"
              @click="handleSetProvider(key as any)"
              class="px-3 py-2 text-xs rounded-lg border font-medium transition-all text-center"
              :class="[config.provider === key ? (isDark ? 'bg-sky-600 border-sky-500 text-white font-bold shadow-sm' : 'bg-sky-500 border-sky-500 text-white font-bold shadow-sm') : borderColor + ' ' + theme.textColor + ' opacity-70 hover:opacity-100']">
              {{ t('llm.' + key) || providerNames[key as LLMProvider] }}
            </button>
          </div>
        </div>

        <!-- API Key -->
        <div>
          <label class="text-xs font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('llm.apiKey') }}</label>
          <input v-model="localApiKey" type="password" class="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-transparent outline-none"
            :class="[theme.borderColor, theme.textColor, theme.menuBgClass]"
            :placeholder="config.provider === 'custom' ? t('llm.customApiKeyPlaceholder') : t('llm.apiKeyRequired')" />
        </div>

        <!-- Endpoint -->
        <div>
          <label class="text-xs font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('llm.endpoint') }}</label>
          <input v-model="localEndpoint" class="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-transparent font-mono outline-none"
            :class="[theme.borderColor, theme.textColor, theme.menuBgClass]"
            :placeholder="config.provider === 'custom' ? t('llm.customEndpointPlaceholder') : 'https://.../v1'" />
        </div>

        <!-- Model -->
        <div>
          <label class="text-xs font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('llm.model') }}</label>
          <input v-model="localModel" class="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-transparent font-mono outline-none"
            :class="[theme.borderColor, theme.textColor, theme.menuBgClass]"
            :placeholder="config.provider === 'custom' ? t('llm.customModelPlaceholder') : 'model name'" />
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-1">
          <button @click="handleTestConnection" :disabled="testing"
            class="flex-1 px-3 py-2 text-xs rounded-lg border font-medium transition-colors"
            :class="[theme.borderColor, theme.textColor, testing ? 'opacity-50' : 'hover:bg-black/10 dark:hover:bg-white/10']">
            {{ testing ? t('llm.testing') : t('llm.testConnection') }}
          </button>
          <button @click="handleSave"
            class="flex-1 px-3 py-2 text-xs rounded-lg bg-sky-600 text-white font-medium transition-colors hover:bg-sky-700 shadow-sm">
            {{ t('llm.save') }}
          </button>
        </div>

        <!-- Test Result -->
        <div v-if="testResult !== null" class="p-2.5 rounded-xl text-xs text-center border transition-all"
             :class="testResult ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'">
          <p class="font-semibold">{{ testResult ? t('llm.connectionSuccess') : t('llm.connectionFailed') }}</p>
          <p v-if="!testResult && testErrorMsg" class="text-[11px] mt-1 opacity-80 break-all leading-tight">
            {{ testErrorMsg }}
          </p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useLLMStore } from '@/stores/llmStore'
import type { LLMProvider } from '@/types/book'

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
const testErrorMsg = ref('')

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

function syncFromConfig() {
  localApiKey.value = config.value.apiKey
  localEndpoint.value = config.value.endpoint
  localModel.value = config.value.model
}

onMounted(() => {
  syncFromConfig()
})

watch(() => props.visible, (v) => {
  if (v) {
    syncFromConfig()
    testResult.value = null
    testErrorMsg.value = ''
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
}

const handleSave = () => {
  llmStore.updateConfig(localApiKey.value, localEndpoint.value, localModel.value)
  testResult.value = null
  testErrorMsg.value = ''
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
