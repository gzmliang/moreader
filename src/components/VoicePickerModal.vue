<template>
  <div v-if="visible" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 transition-all duration-200" @click.self="handleClose">
    <div class="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border transition-colors duration-200 flex flex-col overflow-hidden"
         :class="[theme.containerBg || (isDark ? 'bg-zinc-900' : 'bg-white'), theme.borderColor || (isDark ? 'border-zinc-800' : 'border-zinc-200')]">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b shrink-0"
           :class="theme.borderColor || (isDark ? 'border-zinc-800' : 'border-zinc-200')">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-base shrink-0">
            🎙️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold leading-tight" :class="theme.textColor">{{ t('voicePicker.title') }}</h3>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                    :class="mode === 'edge' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'">
                {{ mode === 'edge' ? t('voicePicker.edgeVoice') : t('voicePicker.browserVoice') }}
              </span>
            </div>
            <p class="text-[11px] opacity-50 mt-0.5" :class="theme.textColor">
              {{ t('voicePicker.currentSelected') }}: <span class="font-semibold text-sky-600 dark:text-sky-400">{{ currentVoiceDisplayName }}</span>
            </p>
          </div>
        </div>

        <button @click="handleClose" class="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" :class="theme.textColor">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 搜索栏与分类 Tab -->
      <div class="px-5 pt-3 pb-2.5 border-b shrink-0 space-y-2.5 bg-black/[0.01] dark:bg-white/[0.01]"
           :class="theme.borderColor || (isDark ? 'border-zinc-800' : 'border-zinc-200')">
        <!-- 搜索框 -->
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" :class="theme.textColor" />
          <input ref="searchInputRef"
                 v-model="searchQuery"
                 type="text"
                 :placeholder="t('voicePicker.searchPlaceholder')"
                 class="w-full pl-9 pr-8 py-2 rounded-xl border bg-transparent text-xs outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                 :class="[theme.borderColor || (isDark ? 'border-zinc-700' : 'border-zinc-300'), theme.textColor]" />
          <button v-if="searchQuery"
                  @click="searchQuery = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-50 hover:opacity-100 transition-opacity"
                  :class="theme.textColor">
            <X class="w-3 h-3" />
          </button>
        </div>

        <!-- 分类标签页 -->
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <button v-for="tab in tabs" :key="tab.id"
                  @click="activeTab = tab.id"
                  class="px-2.5 py-1.5 rounded-lg font-medium shrink-0 transition-all text-center flex items-center gap-1"
                  :class="activeTab === tab.id
                    ? 'bg-sky-500 text-white font-semibold shadow-sm'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 ' + theme.textColor">
            <span>{{ tab.label }}</span>
            <span v-if="tab.count !== undefined" class="text-[10px] px-1 rounded-full"
                  :class="activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-black/5 dark:bg-white/10 opacity-70'">
              {{ tab.count }}
            </span>
          </button>
        </div>
      </div>

      <!-- 音色列表 (滚动区) -->
      <div class="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 min-h-[300px] max-h-[460px]">
        <!-- 浏览器模式：设为默认选项 -->
        <div v-if="mode === 'browser' && activeTab === 'recent' && !searchQuery"
             @click="selectVoice('')"
             class="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group"
             :class="[!currentVoice ? 'border-emerald-500 bg-emerald-500/5 shadow-sm' : 'hover:border-sky-500/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ' + (theme.borderColor || 'border-zinc-200 dark:border-zinc-800')]">
          <div class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
              ⚙️
            </div>
            <div>
              <div class="text-xs font-semibold leading-tight flex items-center gap-2" :class="theme.textColor">
                <span>{{ t('voicePicker.defaultBrowserVoice') }}</span>
              </div>
              <p class="text-[11px] opacity-50 mt-0.5" :class="theme.textColor">{{ t('tts.browserVoiceDefault') }}</p>
            </div>
          </div>
          <div v-if="!currentVoice" class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check class="w-3 h-3" />
          </div>
        </div>

        <!-- 列表项目 -->
        <div v-for="voice in filteredVoices" :key="voice.id"
             @click="selectVoice(voice.id)"
             class="p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 group"
             :class="[voice.id === currentVoice
               ? 'border-sky-500 bg-sky-500/10 shadow-sm'
               : 'hover:border-sky-500/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ' + (theme.borderColor || (isDark ? 'border-zinc-800' : 'border-zinc-200'))]">

          <!-- 左侧音色信息 -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 font-bold"
                 :class="voice.gender === 'male' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : voice.gender === 'child' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-pink-500/10 text-pink-600 dark:text-pink-400'">
              {{ voice.gender === 'male' ? '👨' : voice.gender === 'child' ? '🧒' : '👩' }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold truncate" :class="theme.textColor">
                  {{ voice.name }}
                </span>
                <!-- 标签 Badges -->
                <span class="text-[10px] px-1.5 py-0.5 rounded font-mono border"
                      :class="isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-600'">
                  {{ voice.langCode }}
                </span>
                <span v-if="voice.isOnline" class="text-[9.5px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {{ t('voicePicker.tagNatural') }}
                </span>
                <span v-if="voice.gender" class="text-[9.5px] px-1.5 py-0.5 rounded font-medium opacity-60"
                      :class="isDark ? 'bg-white/5 text-zinc-300' : 'bg-black/5 text-zinc-600'">
                  {{ voice.gender === 'male' ? t('voicePicker.tagMale') : voice.gender === 'child' ? t('voicePicker.tagChild') : t('voicePicker.tagFemale') }}
                </span>
              </div>
              <p class="text-[10.5px] opacity-45 truncate mt-0.5 font-mono" :class="theme.textColor">
                {{ voice.id }}
              </p>
            </div>
          </div>

          <!-- 右侧操作区：试听 + 选中标记 -->
          <div class="flex items-center gap-2 shrink-0" @click.stop>
            <!-- 试听按钮 -->
            <button @click="togglePreview(voice)"
                    class="p-2 rounded-xl border transition-all flex items-center gap-1 text-[11px] font-medium"
                    :class="previewingVoiceId === voice.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm animate-pulse'
                      : 'hover:bg-sky-500/10 hover:text-sky-600 hover:border-sky-500/40 ' + (theme.borderColor || (isDark ? 'border-zinc-700' : 'border-zinc-300'))"
                    :title="previewingVoiceId === voice.id ? t('voicePicker.stop') : t('voicePicker.preview')">
              <span v-if="previewLoading && previewingVoiceId === voice.id" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <Square v-else-if="previewingVoiceId === voice.id" class="w-3.5 h-3.5 fill-current" />
              <Play v-else class="w-3.5 h-3.5 fill-current opacity-70" />
              <span class="hidden sm:inline">{{ previewingVoiceId === voice.id ? t('voicePicker.stop') : t('voicePicker.preview') }}</span>
            </button>

            <!-- 选中对勾 -->
            <div v-if="voice.id === currentVoice" class="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Check class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <!-- 空数据提示 -->
        <div v-if="filteredVoices.length === 0" class="py-12 text-center">
          <div class="text-3xl mb-2">🔍</div>
          <p class="text-xs font-semibold opacity-70" :class="theme.textColor">{{ t('voicePicker.empty') }}</p>
          <p class="text-[11px] opacity-40 mt-1" :class="theme.textColor">
            {{ searchQuery ? `"${searchQuery}"` : '' }}
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 border-t shrink-0 flex items-center justify-between text-xs bg-black/[0.01] dark:bg-white/[0.01]"
           :class="theme.borderColor || (isDark ? 'border-zinc-800' : 'border-zinc-200')">
        <span class="opacity-50 text-[11px]" :class="theme.textColor">
          {{ t('voicePicker.voiceCount', { count: filteredVoices.length }) }}
        </span>
        <button @click="handleClose" class="px-4 py-1.5 rounded-xl border font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                :class="[theme.borderColor || (isDark ? 'border-zinc-700' : 'border-zinc-300'), theme.textColor]">
          {{ t('footnote.dismiss') }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { X, Search, Play, Square, Check } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import type { EdgeVoice } from '@/types/book'

const { t } = useI18n()

export interface UnifiedVoiceItem {
  id: string
  name: string
  langCode: string
  langName: string
  gender?: 'male' | 'female' | 'child'
  isOnline?: boolean
  rawVoice?: any
}

const props = defineProps<{
  visible: boolean
  mode: 'edge' | 'browser'
  currentVoice: string
  edgeVoices?: EdgeVoice[]
  browserVoices?: SpeechSynthesisVoice[]
  edgeEndpoint?: string
  theme: Record<string, string>
  isDark: boolean
}>()

const emit = defineEmits<{
  (e: 'select', voiceId: string): void
  (e: 'close'): void
}>()

const searchQuery = ref('')
const activeTab = ref<'recent' | 'zh' | 'en' | 'jako' | 'other' | 'all'>('recent')
const searchInputRef = ref<HTMLInputElement | null>(null)

// 试听相关状态
const previewingVoiceId = ref<string | null>(null)
const previewLoading = ref(false)
let currentAudio: HTMLAudioElement | null = null

// 经典常用推荐音色集合
const CLASSIC_POPULAR_VOICES = new Set([
  'zh-CN-XiaoxiaoNeural',
  'zh-CN-YunxiNeural',
  'zh-CN-YunjianNeural',
  'zh-CN-XiaoyiNeural',
  'zh-CN-YunyangNeural',
  'zh-TW-HsiaoChenNeural',
  'zh-HK-HiuMaanNeural',
  'en-US-JennyNeural',
  'en-US-GuyNeural',
  'en-US-AriaNeural',
  'en-US-AvaNeural',
  'en-US-AvaMultilingualNeural',
  'en-GB-SoniaNeural',
  'ja-JP-NanamiNeural',
  'ko-KR-SunHiNeural',
])

// 格式化为统一的数据列表
const allUnifiedVoices = computed<UnifiedVoiceItem[]>(() => {
  if (props.mode === 'edge') {
    const list = props.edgeVoices || []
    return list.map(v => {
      const isMulti = v.id.includes('Multilingual')
      const gender = v.gender || (v.name.includes('女') ? 'female' : 'male')
      return {
        id: v.id,
        name: v.name + (isMulti ? ' (Multi)' : ''),
        langCode: v.locale || (v.id.startsWith('zh-CN') ? 'zh-CN' : v.id.startsWith('zh-TW') ? 'zh-TW' : v.id.startsWith('zh-HK') ? 'zh-HK' : 'en-US'),
        langName: v.lang || 'Voice',
        gender,
        isOnline: true,
        rawVoice: v,
      }
    })
  } else {
    const list = props.browserVoices || []
    return list.map(v => {
      const isOnline = v.name.includes('Online') || v.name.includes('Natural')
      const isChild = v.name.toLowerCase().includes('child') || v.name.toLowerCase().includes('maisie')
      const isMale = v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('yunxi') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('andrew')
      return {
        id: v.voiceURI || v.name,
        name: v.name.replace(/^Microsoft /, '').replace(/ Online \(Natural\)/, ''),
        langCode: v.lang || 'en-US',
        langName: v.lang,
        gender: isChild ? 'child' : isMale ? 'male' : 'female',
        isOnline,
        rawVoice: v,
      }
    })
  }
})

// 分类 Tabs
const tabs = computed(() => {
  const voices = allUnifiedVoices.value
  const zhCount = voices.filter(v => v.langCode.toLowerCase().startsWith('zh')).length
  const enCount = voices.filter(v => v.langCode.toLowerCase().startsWith('en')).length
  const jakoCount = voices.filter(v => v.langCode.toLowerCase().startsWith('ja') || v.langCode.toLowerCase().startsWith('ko')).length
  const otherCount = voices.filter(v => !v.langCode.toLowerCase().startsWith('zh') && !v.langCode.toLowerCase().startsWith('en') && !v.langCode.toLowerCase().startsWith('ja') && !v.langCode.toLowerCase().startsWith('ko')).length

  return [
    { id: 'recent' as const, label: t('voicePicker.tabRecent') },
    { id: 'zh' as const, label: t('voicePicker.tabChinese'), count: zhCount },
    { id: 'en' as const, label: t('voicePicker.tabEnglish'), count: enCount },
    { id: 'jako' as const, label: t('voicePicker.tabJaKo'), count: jakoCount },
    { id: 'other' as const, label: t('voicePicker.tabInternational'), count: otherCount },
    { id: 'all' as const, label: t('voicePicker.tabAll'), count: voices.length },
  ]
})

// 当前选中音色的友好名称
const currentVoiceDisplayName = computed(() => {
  if (!props.currentVoice) {
    return props.mode === 'browser' ? t('tts.browserVoiceDefault') : 'zh-CN-XiaoxiaoNeural'
  }
  const found = allUnifiedVoices.value.find(v => v.id === props.currentVoice)
  return found ? `${found.name} (${found.langCode})` : props.currentVoice
})

// 筛选后的音色列表
const filteredVoices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const voices = allUnifiedVoices.value

  // 1. 若有搜索关键字，则全局跨分类搜索
  if (query) {
    return voices.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.id.toLowerCase().includes(query) ||
      v.langCode.toLowerCase().includes(query)
    )
  }

  // 2. 按 Tab 分类
  switch (activeTab.value) {
    case 'recent': {
      return voices.filter(v =>
        v.id === props.currentVoice ||
        CLASSIC_POPULAR_VOICES.has(v.id) ||
        (props.mode === 'browser' && v.isOnline)
      )
    }
    case 'zh':
      return voices.filter(v => v.langCode.toLowerCase().startsWith('zh'))
    case 'en':
      return voices.filter(v => v.langCode.toLowerCase().startsWith('en'))
    case 'jako':
      return voices.filter(v => v.langCode.toLowerCase().startsWith('ja') || v.langCode.toLowerCase().startsWith('ko'))
    case 'other':
      return voices.filter(v =>
        !v.langCode.toLowerCase().startsWith('zh') &&
        !v.langCode.toLowerCase().startsWith('en') &&
        !v.langCode.toLowerCase().startsWith('ja') &&
        !v.langCode.toLowerCase().startsWith('ko')
      )
    case 'all':
    default:
      return voices
  }
})

// 试听样本句子生成
function getSampleText(langCode: string): string {
  const code = (langCode || '').toLowerCase()
  if (code.startsWith('zh')) return t('voicePicker.sampleZh')
  if (code.startsWith('en')) return t('voicePicker.sampleEn')
  if (code.startsWith('ja')) return t('voicePicker.sampleJa')
  if (code.startsWith('ko')) return t('voicePicker.sampleKo')
  return t('voicePicker.sampleOther')
}

// 停止试听
function stopPreview() {
  previewLoading.value = false
  previewingVoiceId.value = null

  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.currentTime = 0
    } catch {}
    currentAudio = null
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
    } catch {}
  }
}

// 播放/停止试听
async function togglePreview(voice: UnifiedVoiceItem) {
  if (previewingVoiceId.value === voice.id) {
    stopPreview()
    return
  }

  stopPreview()
  previewingVoiceId.value = voice.id
  const sample = getSampleText(voice.langCode)

  if (props.mode === 'edge') {
    previewLoading.value = true
    const endpoint = (props.edgeEndpoint || 'http://p-plus.duckdns.org:5001').replace(/\/+$/, '')
    try {
      const resp = await fetch(`${endpoint}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sample,
          voice: voice.id,
          rate: '+0%',
        }),
      })
      if (!resp.ok) throw new Error('Edge TTS preview failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      currentAudio = new Audio(url)
      previewLoading.value = false

      currentAudio.onended = () => {
        URL.revokeObjectURL(url)
        if (previewingVoiceId.value === voice.id) {
          previewingVoiceId.value = null
        }
      }
      currentAudio.onerror = () => {
        URL.revokeObjectURL(url)
        stopPreview()
      }
      await currentAudio.play()
    } catch (e) {
      stopPreview()
    }
  } else {
    // 浏览器原生 SpeechSynthesis
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      stopPreview()
      return
    }
    try {
      const utterance = new SpeechSynthesisUtterance(sample)
      if (voice.rawVoice) {
        utterance.voice = voice.rawVoice
      }
      utterance.lang = voice.langCode
      utterance.rate = 1.0

      utterance.onend = () => {
        if (previewingVoiceId.value === voice.id) {
          previewingVoiceId.value = null
        }
      }
      utterance.onerror = () => {
        stopPreview()
      }
      window.speechSynthesis.speak(utterance)
    } catch {
      stopPreview()
    }
  }
}

function selectVoice(voiceId: string) {
  stopPreview()
  emit('select', voiceId)
  emit('close')
}

function handleClose() {
  stopPreview()
  emit('close')
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    handleClose()
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    searchQuery.value = ''
    activeTab.value = 'recent'
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    stopPreview()
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  stopPreview()
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
