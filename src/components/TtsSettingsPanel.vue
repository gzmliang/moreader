<template>
  <transition name="fade">
    <div v-if="visible" class="fixed top-14 right-4 z-[99] w-80 max-h-[80vh] overflow-y-auto p-4 rounded-lg shadow-xl border" :class="[theme.menuBgClass, theme.borderColor]" @mousedown.stop>
      <div class="flex flex-col gap-4">
        <!-- Provider -->
        <div>
          <label class="text-sm font-medium mb-2 block" :class="theme.textColor">{{ t('tts.voiceEngine') }}</label>
          <div class="flex gap-2">
            <button @click="setProvider('browser')" class="flex-1 px-3 py-2 text-xs rounded border transition-colors" :class="[provider === 'browser' ? (isDark ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : theme.borderColor + ' ' + theme.textColor]">{{ t('tts.browserVoice') }}</button>
            <button @click="setProvider('edge')" class="flex-1 px-3 py-2 text-xs rounded border transition-colors" :class="[provider === 'edge' ? (isDark ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : theme.borderColor + ' ' + theme.textColor]">{{ t('tts.edgeTTS') }}</button>
            <button @click="setProvider('ai_voice')" class="flex-1 px-3 py-2 text-xs rounded border transition-colors" :class="[provider === 'ai_voice' ? (isDark ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : theme.borderColor + ' ' + theme.textColor]">{{ t('tts.aiVoice') }}</button>
          </div>
          <div v-if="provider === 'edge'" class="mt-2 flex items-center gap-2 text-xs">
            <span :class="theme.textColor">{{ t('tts.server') }}:</span>
            <span :class="edgeAvailable ? 'text-green-500' : 'text-red-500'" class="font-medium">{{ edgeAvailable ? t('tts.connected') : t('tts.disconnected') }}</span>
            <button @click="checkServer" class="ml-2 px-2 py-0.5 text-xs rounded border opacity-70 hover:opacity-100" :class="[theme.borderColor, theme.textColor]">{{ t('tts.refresh') }}</button>
          </div>
          <p v-if="provider === 'edge' && !edgeAvailable" class="text-xs text-orange-500 mt-1">⚠️ {{ t('tts.serverWarning') }} <a href="#" @click.prevent="showEdgeSetup = true" class="underline ml-1">{{ t('tts.howToSetup') }}</a></p>
          <div v-if="provider === 'ai_voice'" class="mt-2 flex items-center gap-2 text-xs">
            <span :class="theme.textColor">API:</span>
            <span :class="aiAvailable ? 'text-green-500' : 'text-red-500'" class="font-medium">{{ aiAvailable ? t('tts.connected') : t('tts.disconnected') }}</span>
            <button @click="checkAIServer" class="ml-2 px-2 py-0.5 text-xs rounded border opacity-70 hover:opacity-100" :class="[theme.borderColor, theme.textColor]">{{ t('tts.refresh') }}</button>
          </div>
        </div>

        <!-- Edge Setup -->
        <div v-if="showEdgeSetup" class="p-3 rounded-lg text-xs" :class="isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'">
          <p class="font-medium mb-2" :class="theme.textColor">{{ t('tts.setupTitle') }}</p>
          <ol class="list-decimal list-inside space-y-1 mb-3" :class="theme.textColor">
            <li>{{ t('tts.setupStep1') }}: <code class="px-1 py-0.5 rounded bg-black/10">pip install edge-tts flask flask-cors</code></li>
            <li>{{ t('tts.setupStep2') }}: <code class="px-1 py-0.5 rounded bg-black/10">python edge-tts-server.py</code></li>
            <li>{{ t('tts.setupStep3') }}: <input v-model="localEdgeEndpoint" @change="updateEdgeEndpoint" class="w-full mt-1 px-2 py-1 rounded border text-xs" :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" /></li>
            <li>{{ t('tts.setupStep4') }}: <input v-model="localEdgeApiKey" @change="updateEdgeApiKey" type="password" :placeholder="t('tts.apiKeyPlaceholder')" class="w-full mt-1 px-2 py-1 rounded border text-xs" :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" /><p class="text-xs opacity-60 mt-0.5">{{ t('tts.setupStep4Hint') }}</p></li>
          </ol>
          <button @click="showEdgeSetup = false" class="px-3 py-1 rounded text-xs border" :class="[theme.borderColor, theme.textColor]">{{ t('tts.close') }}</button>
        </div>

        <!-- Edge server endpoint (always editable) -->
        <div v-if="provider === 'edge' && !showEdgeSetup">
          <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('tts.serverEndpoint') }}</label>
          <input v-model="localEdgeEndpoint" @change="updateEdgeEndpoint" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent" :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" :placeholder="'http://your-server:5001'" />
        </div>

        <!-- Edge Voices -->
        <div v-if="provider === 'edge'">
          <label class="text-sm font-medium mb-2 block" :class="theme.textColor">{{ t('tts.voiceSelection') }} ({{ edgeVoices.length }})</label>
          <select :value="edgeVoice" @change="setEdgeVoice(($event.target as HTMLSelectElement).value)" class="w-full p-2 text-sm rounded border bg-transparent" :class="[theme.borderColor, theme.textColor]">
            <optgroup v-for="group in voiceGroups" :key="group.label" :label="group.label">
              <option v-for="voice in group.voices" :key="voice.id" :value="voice.id">{{ voiceDisplayName(voice) }}</option>
            </optgroup>
          </select>
        </div>

        <!-- AI Voice Settings (fully independent) -->
        <div v-if="provider === 'ai_voice'" class="space-y-3">
          <!-- Provider -->
          <div>
            <label class="text-sm font-medium mb-2 block" :class="theme.textColor">{{ t('tts.aiVoiceProvider') }}</label>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="key in ['siliconflow', 'openai', 'openrouter', 'custom']" :key="key"
                @click="onAIVoiceProviderChange(key)"
                class="px-3 py-2 text-xs rounded border transition-colors"
                :class="[aiVoiceProvider === key ? (isDark ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : theme.borderColor + ' ' + theme.textColor]">
                {{ aiProviderNames[key] }}
              </button>
            </div>
          </div>
          <!-- API Key -->
          <div>
            <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('tts.aiVoiceApiKey') }}</label>
            <input v-model="localAIVoiceApiKey" @change="updateAIVoiceApiKey" type="password" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent" :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" :placeholder="'sk-xxxxxxxx'" />
            <p class="text-xs opacity-60 mt-1">{{ t('tts.aiVoiceApiKeyHint') }}</p>
          </div>
          <!-- Base URL -->
          <div>
            <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('tts.aiVoiceBaseUrl') }}</label>
            <input v-model="localAIVoiceEndpoint" @change="updateAIVoiceEndpoint" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent" :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" :placeholder="'http://192.168.199.159:18083 or https://api.siliconflow.cn/v1'" />
          </div>
          <!-- Model -->
          <div>
            <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('tts.aiVoiceModel') }}</label>
            <select v-if="!useCustomModel" :value="localAIVoiceModel" @change="onModelSelectChange(($event.target as HTMLSelectElement).value)" class="w-full p-2 text-sm rounded border bg-transparent" :class="[theme.borderColor, theme.textColor]">
              <option v-for="preset in modelPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</option>
              <option value="__custom__">{{ t('tts.customModel') }}</option>
            </select>
            <div v-else class="flex flex-col gap-1">
              <input v-model="localAIVoiceModel" @change="updateAIVoiceModel" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent" :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" :placeholder="t('tts.modelPlaceholder')" />
              <a href="#" @click.prevent="restoreModelPreset" class="text-xs text-blue-400 hover:underline">{{ t('tts.restorePreset') }}</a>
            </div>
            <p class="text-xs opacity-60 mt-1">{{ t('tts.aiVoiceModelHint') }}</p>
          </div>
          <!-- Voice -->
          <div>
            <label class="text-sm font-medium mb-1 block" :class="theme.textColor">{{ t('tts.aiVoiceSelection') }}</label>
            <select v-if="matchedVoices.length > 0 && !useCustomVoice" :value="localAIVoiceId" @change="onVoiceSelectChange(($event.target as HTMLSelectElement).value)" class="w-full p-2 text-sm rounded border bg-transparent" :class="[theme.borderColor, theme.textColor]">
              <option v-for="voice in matchedVoices" :key="voice.id" :value="voice.id">{{ voice.name }}</option>
              <option value="__custom__">{{ t('tts.customVoice') }}</option>
            </select>
            <div v-else class="flex flex-col gap-1">
              <input v-model="localAIVoiceId" @change="updateAIVoiceId" class="w-full px-2 py-1.5 rounded border text-xs bg-transparent" :class="[theme.borderColor, theme.textColor, theme.menuBgClass]" :placeholder="voicePlaceholder" />
              <a href="#" @click.prevent="restoreVoicePreset" class="text-xs text-blue-400 hover:underline">{{ t('tts.restorePreset') }}</a>
            </div>
          </div>
        </div>

        <!-- Browser Voices -->
        <div v-if="isBrowser">
          <label class="text-sm font-medium mb-2 block" :class="theme.textColor">{{ t('tts.voiceSelection') }}</label>
          <select :value="selectedVoiceURI || ''" @change="setVoice(($event.target as HTMLSelectElement).value || null)" class="w-full p-2 text-sm rounded border bg-transparent" :class="[theme.borderColor, theme.textColor]">
            <option value="">{{ t('tts.autoSelect') }}</option>
            <option v-for="voice in availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">{{ voice.name }} ({{ voice.lang }})</option>
          </select>
        </div>

        <!-- Rate -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium" :class="theme.textColor">{{ t('tts.speed') }}</span>
            <span class="text-xs opacity-60" :class="theme.textColor">{{ speechRate.toFixed(1) }}x</span>
          </div>
          <input type="range" min="0.5" max="2.0" step="0.1" :value="speechRate" @input="setRate(parseFloat(($event.target as HTMLInputElement).value))" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          <div class="flex justify-between mt-1 text-xs opacity-50" :class="theme.textColor"><span>{{ t('tts.slow') }} (0.5x)</span><span>{{ t('tts.normal') }} (1.0x)</span><span>{{ t('tts.fast') }} (2.0x)</span></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { EdgeVoice } from '@/types/book'
import { useI18n } from '@/i18n'

const { t } = useI18n()

// Known TTS model presets with their voices (no hardcoded display text - built via computed)
interface ModelPreset {
  id: string
  labelKey: string
  endpoint: string
  voices: { id: string; nameKey: string; gender: 'male' | 'female' | '' }[]
}

const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'fnlp/MOSS-TTSD-v0.5',
    labelKey: 'tts.presetSFMOSS',
    endpoint: 'https://api.siliconflow.cn/v1',
    voices: [
      { id: 'fnlp/MOSS-TTSD-v0.5:anna', nameKey: 'Anna', gender: 'female' },
      { id: 'fnlp/MOSS-TTSD-v0.5:alex', nameKey: 'Alex', gender: 'male' },
      { id: 'fnlp/MOSS-TTSD-v0.5:bella', nameKey: 'Bella', gender: 'female' },
      { id: 'fnlp/MOSS-TTSD-v0.5:benjamin', nameKey: 'Benjamin', gender: 'male' },
      { id: 'fnlp/MOSS-TTSD-v0.5:charles', nameKey: 'Charles', gender: 'male' },
      { id: 'fnlp/MOSS-TTSD-v0.5:claire', nameKey: 'Claire', gender: 'female' },
      { id: 'fnlp/MOSS-TTSD-v0.5:david', nameKey: 'David', gender: 'male' },
      { id: 'fnlp/MOSS-TTSD-v0.5:diana', nameKey: 'Diana', gender: 'female' },
    ],
  },
  {
    id: 'FunAudioLLM/CosyVoice2-0.5B',
    labelKey: 'tts.presetSFCosy',
    endpoint: 'https://api.siliconflow.cn/v1',
    voices: [
      { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', nameKey: 'Anna', gender: 'female' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:alex', nameKey: 'Alex', gender: 'male' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', nameKey: 'Bella', gender: 'female' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:benjamin', nameKey: 'Benjamin', gender: 'male' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:charles', nameKey: 'Charles', gender: 'male' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', nameKey: 'Claire', gender: 'female' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:david', nameKey: 'David', gender: 'male' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:diana', nameKey: 'Diana', gender: 'female' },
    ],
  },
  {
    id: 'tts-1',
    labelKey: 'tts.presetOAIStandard',
    endpoint: 'https://api.openai.com/v1',
    voices: [
      { id: 'alloy', nameKey: 'Alloy', gender: '' },
      { id: 'echo', nameKey: 'Echo', gender: '' },
      { id: 'fable', nameKey: 'Fable', gender: '' },
      { id: 'onyx', nameKey: 'Onyx', gender: 'male' },
      { id: 'nova', nameKey: 'Nova', gender: 'female' },
      { id: 'shimmer', nameKey: 'Shimmer', gender: 'female' },
    ],
  },
  {
    id: 'tts-1-hd',
    labelKey: 'tts.presetOAIHD',
    endpoint: 'https://api.openai.com/v1',
    voices: [
      { id: 'alloy', nameKey: 'Alloy', gender: '' },
      { id: 'echo', nameKey: 'Echo', gender: '' },
      { id: 'fable', nameKey: 'Fable', gender: '' },
      { id: 'onyx', nameKey: 'Onyx', gender: 'male' },
      { id: 'nova', nameKey: 'Nova', gender: 'female' },
      { id: 'shimmer', nameKey: 'Shimmer', gender: 'female' },
    ],
  },
  {
    id: 'sesame/csm-1b',
    labelKey: 'tts.presetORCSM',
    endpoint: 'https://openrouter.ai/api/v1',
    voices: [
      { id: 'default', nameKey: 'Default', gender: '' },
    ],
  },
  {
    id: 'hexgrad/kokoro-82m',
    labelKey: 'tts.presetORKokoro',
    endpoint: 'https://openrouter.ai/api/v1',
    voices: [
      { id: 'zf', nameKey: '中文女', gender: 'female' },
      { id: 'zm', nameKey: '中文男', gender: 'male' },
      { id: 'af', nameKey: 'English Female', gender: 'female' },
      { id: 'am', nameKey: 'English Male', gender: 'male' },
    ],
  },
]

// Format AI voice display name using i18n
const formatAIVoiceName = (nameKey: string, gender: string): string => {
  let name = nameKey
  if (gender === 'male') name += ` (${t('tts.voiceMale')})`
  else if (gender === 'female') name += ` (${t('tts.voiceFemale')})`
  return name
}

// Computed: list of model presets for dropdown (with i18n labels)
const modelPresets = computed(() =>
  MODEL_PRESETS.map(p => ({ id: p.id, label: t(p.labelKey) }))
)

// Computed: voices matching current model (with i18n names)
const matchedVoices = computed(() => {
  const preset = MODEL_PRESETS.find(p => p.id === localAIVoiceModel.value)
  return preset
    ? preset.voices.map(v => ({
        id: v.id,
        name: formatAIVoiceName(v.nameKey, v.gender),
      }))
    : []
})

// Computed: placeholder for voice input
const voicePlaceholder = computed(() => {
  const preset = MODEL_PRESETS.find(p => p.id === localAIVoiceModel.value)
  if (preset && preset.voices.length > 0) {
    return preset.voices[0].id
  }
  return t('tts.voicePlaceholder')
})

const props = defineProps<{
  visible: boolean
  theme: Record<string, string>
  isDark: boolean
  provider: string
  edgeAvailable: boolean
  edgeVoices: EdgeVoice[]
  edgeVoice: string
  edgeEndpoint: string
  edgeApiKey: string
  availableVoices: SpeechSynthesisVoice[]
  selectedVoiceURI: string
  speechRate: number
  aiVoiceEndpoint: string
  aiVoiceApiKey: string
  aiVoiceModel: string
  aiVoiceId: string
  aiVoiceProvider: string
  aiAvailable: boolean
}>()

const emit = defineEmits([
  'checkServer', 'checkAIServer',
  'setProvider',
  'setEdgeVoice', 'setEdgeEndpoint', 'setEdgeApiKey',
  'setVoice', 'setRate',
  'setAIVoiceEndpoint', 'setAIVoiceApiKey', 'setAIVoiceModel', 'setAIVoiceId',
  'setAIVoiceProvider',
])

const showEdgeSetup = ref(false)
const localEdgeEndpoint = ref(props.edgeEndpoint)
const localEdgeApiKey = ref(props.edgeApiKey)
const localAIVoiceEndpoint = ref(props.aiVoiceEndpoint)
const localAIVoiceApiKey = ref(props.aiVoiceApiKey)
const localAIVoiceModel = ref(props.aiVoiceModel)
const localAIVoiceId = ref(props.aiVoiceId)
const localAIVoiceProvider = ref(props.aiVoiceProvider)

// Sync local refs when aiVoiceProvider changes (per-provider config switching)
watch(() => props.aiVoiceProvider, (newProvider) => {
  localAIVoiceProvider.value = newProvider
  localAIVoiceEndpoint.value = props.aiVoiceEndpoint
  localAIVoiceApiKey.value = props.aiVoiceApiKey
  localAIVoiceModel.value = props.aiVoiceModel
  localAIVoiceId.value = props.aiVoiceId
  // Reset custom model/voice state
  useCustomModel.value = !MODEL_PRESETS.some(p => p.id === props.aiVoiceModel)
  useCustomVoice.value = false
})

// Also sync when the store's config values change (for initial load)
watch(() => props.aiVoiceEndpoint, (v) => { localAIVoiceEndpoint.value = v })
watch(() => props.aiVoiceApiKey, (v) => { localAIVoiceApiKey.value = v })
watch(() => props.aiVoiceModel, (v) => { localAIVoiceModel.value = v })
watch(() => props.aiVoiceId, (v) => { localAIVoiceId.value = v })

// AI Voice provider presets
const AI_VOICE_PROVIDERS: Record<string, { name: string; defaultEndpoint: string }> = {
  siliconflow: { name: 'SiliconFlow 硅基流动', defaultEndpoint: 'https://api.siliconflow.cn/v1' },
  openai: { name: 'OpenAI', defaultEndpoint: 'https://api.openai.com/v1' },
  openrouter: { name: 'OpenRouter', defaultEndpoint: 'https://openrouter.ai/api/v1' },
  custom: { name: '自定义', defaultEndpoint: '' },
}

const aiProviderNames = computed(() => ({
  siliconflow: t('tts.aiProviderSiliconFlow'),
  openai: t('tts.aiProviderOpenAI'),
  openrouter: t('tts.aiProviderOpenRouter'),
  custom: t('tts.aiProviderCustom'),
}) as Record<string, string>)

const onAIVoiceProviderChange = (key: string) => {
  // Just update the provider — the store's computed refs will auto-switch to this provider's saved config
  // and the watch in this component will sync the local refs
  localAIVoiceProvider.value = key
  emit('setAIVoiceProvider', key)
}

// State for custom model/voice input
const useCustomModel = ref(!MODEL_PRESETS.some(p => p.id === props.aiVoiceModel))
const useCustomVoice = ref(false)

// When model changes, auto-select first voice and update endpoint
const onModelSelectChange = (modelId: string) => {
  if (modelId === '__custom__') {
    useCustomModel.value = true
    localAIVoiceModel.value = ''
    updateAIVoiceModel()
    return
  }
  useCustomModel.value = false
  localAIVoiceModel.value = modelId
  const preset = MODEL_PRESETS.find(p => p.id === modelId)
  if (preset) {
    localAIVoiceEndpoint.value = preset.endpoint
    emit('setAIVoiceEndpoint', preset.endpoint)
    if (preset.voices.length > 0) {
      localAIVoiceId.value = preset.voices[0].id
      emit('setAIVoiceId', preset.voices[0].id)
    }
  }
  emit('setAIVoiceModel', modelId)
}

// When voice changes via dropdown
const onVoiceSelectChange = (voiceId: string) => {
  if (voiceId === '__custom__') {
    useCustomVoice.value = true
    localAIVoiceId.value = ''
    updateAIVoiceId()
    return
  }
  useCustomVoice.value = false
  localAIVoiceId.value = voiceId
  emit('setAIVoiceId', voiceId)
}

const voiceGroups = computed(() => {
  const groups: { label: string; voices: EdgeVoice[] }[] = []
  const map: Record<string, EdgeVoice[]> = {}
  for (const v of props.edgeVoices) {
    const key = v.lang || v.locale
    if (!map[key]) map[key] = []
    map[key].push(v)
  }
  for (const [label, voices] of Object.entries(map)) {
    if (voices.length) groups.push({ label, voices })
  }
  return groups
})

// Format voice name with localized gender suffix
const voiceDisplayName = (voice: EdgeVoice): string => {
  let name = voice.name
  if (voice.gender === 'male') name += ` (${t('tts.voiceMale')})`
  else if (voice.gender === 'female') name += ` (${t('tts.voiceFemale')})`
  else if (voice.gender === 'child') name += ` (${t('tts.voiceChild')})`
  return name
}

// Helper to avoid template type narrowing issues
const isBrowser = computed(() => props.provider === 'browser')

const checkServer = () => emit('checkServer')
const checkAIServer = () => emit('checkAIServer')
const setProvider = (p: string) => emit('setProvider', p)
const setEdgeVoice = (v: string) => emit('setEdgeVoice', v)
const updateEdgeEndpoint = () => emit('setEdgeEndpoint', localEdgeEndpoint.value)
const updateEdgeApiKey = () => emit('setEdgeApiKey', localEdgeApiKey.value)
const setVoice = (v: string | null) => emit('setVoice', v)
const setRate = (r: number) => emit('setRate', r)
const updateAIVoiceEndpoint = () => emit('setAIVoiceEndpoint', localAIVoiceEndpoint.value)
const updateAIVoiceApiKey = () => emit('setAIVoiceApiKey', localAIVoiceApiKey.value)
const updateAIVoiceModel = () => emit('setAIVoiceModel', localAIVoiceModel.value)
const updateAIVoiceId = () => emit('setAIVoiceId', localAIVoiceId.value)

// Restore model/voice to preset when user clicks "恢复预设列表"
const restoreModelPreset = () => {
  useCustomModel.value = false
  const match = MODEL_PRESETS.find(p => p.id === localAIVoiceModel.value)
  if (match) {
    emit('setAIVoiceModel', match.id)
  } else {
    const first = MODEL_PRESETS[0]
    localAIVoiceModel.value = first.id
    emit('setAIVoiceModel', first.id)
    if (first.voices.length > 0) {
      localAIVoiceId.value = first.voices[0].id
      emit('setAIVoiceId', first.voices[0].id)
    }
  }
}

const restoreVoicePreset = () => {
  useCustomVoice.value = false
  const match = MODEL_PRESETS.find(p => p.id === localAIVoiceModel.value)
  if (match && match.voices.length > 0) {
    localAIVoiceId.value = match.voices[0].id
    emit('setAIVoiceId', match.voices[0].id)
  }
}
</script>
