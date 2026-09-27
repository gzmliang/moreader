<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-lg rounded-2xl shadow-2xl border p-6 flex flex-col gap-5 transition-all max-h-[90vh] overflow-y-auto"
        :class="[theme.menuBgClass || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800']"
      >
        <!-- 顶栏 -->
        <div class="flex items-center justify-between pb-3 border-b" :class="theme.borderColor">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">🌐</span>
            <div>
              <h2 class="text-base font-bold" :class="theme.textColor">
                {{ t('bilingual.exportTitle') }}
              </h2>
              <p class="text-xs opacity-60 truncate max-w-xs" :class="theme.textColor">
                {{ bookTitle }}
              </p>
            </div>
          </div>
          <button
            v-if="!isExporting"
            @click="handleClose"
            class="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            :class="theme.textColor"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 未开始/配置状态 -->
        <div v-if="!isExporting && !isSuccess" class="flex flex-col gap-4">
          <p class="text-xs opacity-80 leading-relaxed" :class="theme.textColor">
            {{ t('bilingual.exportDesc') }}
          </p>

          <!-- 翻译引擎通道选择 (卡片式) -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold" :class="theme.textColor">
              {{ t('bilingual.engineLabel') }}
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <!-- Google 免费通道 -->
              <div
                @click="onEngineSelect('google_free')"
                class="p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5"
                :class="[
                  selectedEngine === 'google_free'
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                    : 'opacity-70 hover:opacity-100 ' + theme.borderColor
                ]"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs" :class="theme.textColor">🌐 {{ t('bilingual.engineGoogle') }}</span>
                  <span class="text-[9.5px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium">
                    {{ t('bilingual.engineGoogleBadge') }}
                  </span>
                </div>
                <p class="text-[10.5px] opacity-75 leading-tight" :class="theme.textColor">
                  {{ t('bilingual.engineGoogleDesc') }}
                </p>
              </div>

              <!-- 自定义 AI 大模型通道 -->
              <div
                @click="onEngineSelect('ai')"
                class="p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5"
                :class="[
                  selectedEngine === 'ai'
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                    : 'opacity-70 hover:opacity-100 ' + theme.borderColor
                ]"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs" :class="theme.textColor">✨ {{ t('bilingual.engineAi') }}</span>
                  <span class="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                    {{ t('bilingual.engineAiBadge') }}
                  </span>
                </div>
                <p class="text-[10.5px] opacity-75 leading-tight" :class="theme.textColor">
                  {{ t('bilingual.engineAiDesc') }}
                </p>
              </div>
            </div>

            <!-- 未配置 Key 时的引导提示 -->
            <div
              v-if="selectedEngine === 'ai' && !hasValidAiKey"
              class="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-1.5 leading-snug">
                <span>⚠️</span>
                <span>{{ t('bilingual.engineAiNoKey') }}</span>
              </div>
              <button
                @click="emit('openSettings')"
                class="px-2 py-1 text-[11px] rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium shrink-0 transition-colors"
              >
                {{ t('bilingual.goToConfig') }}
              </button>
            </div>
          </div>

          <!-- 目标语言选择（方案 B 分组 + 方案 C 智能记忆） -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold" :class="theme.textColor">
              {{ t('bilingual.targetLangLabel') }}
            </label>
            <select
              v-model="selectedLang"
              @change="onLangSelect"
              class="w-full text-xs p-2.5 rounded-lg border bg-transparent transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
              :class="[theme.borderColor, theme.textColor]"
            >
              <optgroup :label="t('bilingual.langGroupPopular')">
                <option v-for="lang in POPULAR_TARGET_LANGUAGES" :key="lang.code" :value="lang.code">
                  {{ lang.flag }} {{ lang.name }} ({{ lang.nativeName }})
                </option>
              </optgroup>
              <optgroup :label="t('bilingual.langGroupMore')">
                <option v-for="lang in MORE_TARGET_LANGUAGES" :key="lang.code" :value="lang.code">
                  {{ lang.flag }} {{ lang.name }} ({{ lang.nativeName }})
                </option>
              </optgroup>
            </select>
          </div>

          <!-- 章节范围选择器 (支持全书 / 当前章节 / 自定义按需选章) -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold" :class="theme.textColor">
                {{ t('bilingual.scopeLabel') }}
              </label>
              <span class="text-[11px] text-blue-500 font-medium">
                {{ selectedChaptersSummaryText }}
              </span>
            </div>

            <!-- 模式切换卡片 -->
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="scopeMode = 'all'"
                class="py-2 px-1 text-center rounded-xl border text-xs font-medium transition-all"
                :class="[
                  scopeMode === 'all'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'opacity-70 hover:opacity-100 ' + theme.borderColor + ' ' + theme.textColor
                ]"
              >
                📚 {{ t('bilingual.scopeAll') }}
              </button>
              <button
                type="button"
                @click="selectCurrentChapterScope"
                class="py-2 px-1 text-center rounded-xl border text-xs font-medium transition-all"
                :class="[
                  scopeMode === 'current'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'opacity-70 hover:opacity-100 ' + theme.borderColor + ' ' + theme.textColor
                ]"
              >
                ⚡ {{ t('bilingual.scopeCurrent') }}
              </button>
              <button
                type="button"
                @click="scopeMode = 'custom'"
                class="py-2 px-1 text-center rounded-xl border text-xs font-medium transition-all"
                :class="[
                  scopeMode === 'custom'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'opacity-70 hover:opacity-100 ' + theme.borderColor + ' ' + theme.textColor
                ]"
              >
                🎯 {{ t('bilingual.scopeCustom') }}
              </button>
            </div>

            <!-- 自定义选章列表容器 -->
            <div
              v-if="scopeMode === 'custom'"
              class="flex flex-col gap-2 p-3 rounded-xl border bg-black/5 dark:bg-white/5"
              :class="theme.borderColor"
            >
              <div class="flex items-center justify-between text-[11px] pb-1.5 border-b" :class="theme.borderColor">
                <span class="opacity-70" :class="theme.textColor">{{ t('bilingual.selectChaptersHint') }}</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="selectAllChapters"
                    class="text-blue-500 hover:underline"
                  >
                    {{ t('bilingual.selectAll') }}
                  </button>
                  <span class="opacity-30">|</span>
                  <button
                    type="button"
                    @click="clearAllChapters"
                    class="text-red-500 hover:underline"
                  >
                    {{ t('bilingual.clearAll') }}
                  </button>
                </div>
              </div>

              <!-- 章节列表 -->
              <div v-if="isLoadingChapters" class="py-4 text-center text-xs opacity-60" :class="theme.textColor">
                {{ t('bilingual.loadingChapters') }}
              </div>
              <div
                v-else
                class="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar"
              >
                <label
                  v-for="chap in bookChapters"
                  :key="chap.index"
                  class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs"
                  :class="theme.textColor"
                >
                  <input
                    type="checkbox"
                    :value="chap.index"
                    v-model="customSelectedIndices"
                    class="rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span class="truncate flex-1">{{ chap.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 特性亮点卡片 -->
          <div class="p-3 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1.5 text-[11px]" :class="[theme.borderColor, theme.textColor]">
            <div class="flex items-center gap-2">
              <span>✨</span>
              <span class="font-medium">{{ t('bilingual.feature1') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span>📱</span>
              <span class="font-medium">{{ t('bilingual.feature2') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span>⚡</span>
              <span class="font-medium">{{ t('bilingual.feature3') }}</span>
            </div>
          </div>
        </div>

        <!-- 正在导出状态 -->
        <div v-if="isExporting" class="flex flex-col gap-4 py-2">
          <div class="flex items-center justify-between text-xs" :class="theme.textColor">
            <span class="font-medium flex items-center gap-1.5 truncate max-w-[340px]">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0"></span>
              <span class="truncate">{{ currentStepText }}</span>
            </span>
            <span class="font-bold text-blue-500 ml-2 shrink-0">{{ progressPercent }}%</span>
          </div>

          <!-- 进度条 -->
          <div class="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all duration-300 rounded-full"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>

          <!-- 动态引擎反馈提示 -->
          <div class="p-3 rounded-xl bg-black/5 dark:bg-white/5 border text-center text-[11.5px] leading-relaxed" :class="[theme.borderColor, theme.textColor]">
            <span v-if="retryText" class="text-amber-500 font-medium">
              ⚠️ {{ retryText }}
            </span>
            <span v-else-if="selectedEngine === 'ai'" class="opacity-80">
              ✨ {{ t('bilingual.statusAiProgress') }}
            </span>
            <span v-else class="opacity-80">
              💡 {{ t('bilingual.statusGoogleProgress') }}
            </span>
          </div>
        </div>

        <!-- 成功状态 (质检报告卡片) -->
        <div v-if="isSuccess" class="flex flex-col items-center gap-3.5 py-3 text-center">
          <div class="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-2xl font-bold shadow-sm">
            ✓
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-bold" :class="theme.textColor">
              {{ t('bilingual.reportTitle') }}
            </h3>
            <p class="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {{ t('bilingual.reportStats', { chapters: exportStats.chapters, sentences: exportStats.sentences }) }}
            </p>
          </div>
          <div class="p-3 rounded-xl border bg-black/5 dark:bg-white/5 text-[11px] opacity-80 leading-relaxed text-left max-w-sm" :class="[theme.borderColor, theme.textColor]">
            <span>📱 {{ t('bilingual.reportCompat') }}</span>
          </div>
        </div>

        <!-- 错误提示与引导 -->
        <div v-if="errorMessage" class="flex flex-col gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <p class="text-xs text-red-500 leading-relaxed">
            {{ errorMessage }}
          </p>
          <button
            v-if="showAiGuideOnError"
            @click="switchToAiAndConfig"
            class="self-start px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            {{ t('bilingual.switchToAi') }}
          </button>
        </div>

        <!-- 底栏操作按钮 -->
        <div class="pt-3 border-t flex items-center justify-end gap-3" :class="theme.borderColor">
          <button
            v-if="!isExporting && !isSuccess"
            @click="handleClose"
            class="px-4 py-2 text-xs rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            :class="[theme.borderColor, theme.textColor]"
          >
            {{ t('bilingual.cancel') }}
          </button>
          <button
            v-if="!isExporting && !isSuccess"
            @click="startExport"
            class="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white shadow-md transition-all flex items-center gap-1.5"
          >
            <span>🚀</span>
            <span>{{ t('bilingual.startExport') }}</span>
          </button>
          <button
            v-if="isExporting"
            @click="cancelExport"
            class="px-4 py-2 text-xs rounded-xl border text-red-500 border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            {{ t('bilingual.cancel') }}
          </button>
          <button
            v-if="isSuccess"
            @click="handleClose"
            class="px-5 py-2 text-xs font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-md transition-all"
          >
            {{ t('bilingual.done') }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { exportBilingualEpub, inspectEpubChapters, type ChapterMetaItem } from '@/utils/bilingualExporter'
import { downloadBlob } from '@/utils/aiExporter'
import { useLLMStore } from '@/stores/llmStore'
import { useBilingualStore } from '@/stores/bilingualStore'
import { POPULAR_TARGET_LANGUAGES, MORE_TARGET_LANGUAGES } from '@/types/languages'

const props = defineProps<{
  visible: boolean
  bookId: string
  bookTitle: string
  theme: any
  currentChapterHref?: string
  loadBinary: () => Promise<ArrayBuffer | null>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'openSettings'): void
}>()

const { t } = useI18n()
const llmStore = useLLMStore()
const bilingualStore = useBilingualStore()

const selectedLang = ref(bilingualStore.targetLang || 'zh-CN')
const selectedEngine = ref<'google_free' | 'ai'>(bilingualStore.engine || 'google_free')

// 章节范围模式：'all' 全书 | 'current' 当前章节 | 'custom' 自定义勾选
const scopeMode = ref<'all' | 'current' | 'custom'>('all')
const bookChapters = ref<ChapterMetaItem[]>([])
const customSelectedIndices = ref<number[]>([])
const isLoadingChapters = ref(false)

const isExporting = ref(false)
const isSuccess = ref(false)
const errorMessage = ref('')
const progressPercent = ref(0)
const currentStepText = ref('')
const retryText = ref('')
const exportStats = ref({ chapters: 0, sentences: 0 })
const showAiGuideOnError = ref(false)
let cancelled = false

const hasValidAiKey = computed(() => {
  const cfg = llmStore.config
  return !!(cfg && (cfg.apiKey || cfg.provider === 'custom'))
})

// 监听弹窗打开，自动预加载章节元数据
watch(
  () => props.visible,
  async (vis) => {
    if (vis) {
      isSuccess.value = false
      errorMessage.value = ''
      progressPercent.value = 0
      showAiGuideOnError.value = false
      if (bookChapters.value.length === 0) {
        await loadChaptersList()
      }
    }
  }
)

const loadChaptersList = async () => {
  try {
    isLoadingChapters.value = true
    const bin = await props.loadBinary()
    if (bin) {
      const items = await inspectEpubChapters(bin)
      bookChapters.value = items
      // 默认全选
      customSelectedIndices.value = items.map((_, i) => i)
    }
  } catch (err) {
    console.warn('Failed to inspect chapters:', err)
  } finally {
    isLoadingChapters.value = false
  }
}

const onLangSelect = () => {
  bilingualStore.setTargetLang(selectedLang.value)
}

const onEngineSelect = (eng: 'google_free' | 'ai') => {
  selectedEngine.value = eng
  bilingualStore.setEngine(eng)
}

const selectCurrentChapterScope = () => {
  scopeMode.value = 'current'
  if (props.currentChapterHref && bookChapters.value.length > 0) {
    const cleanHref = props.currentChapterHref.split('#')[0]
    const idx = bookChapters.value.findIndex(
      (c) => c.href === cleanHref || c.href.endsWith(cleanHref) || cleanHref.endsWith(c.href)
    )
    if (idx !== -1) {
      customSelectedIndices.value = [idx]
      return
    }
  }
  // 若无法精准匹配，默认选第 1 章节
  customSelectedIndices.value = [0]
}

const selectAllChapters = () => {
  customSelectedIndices.value = bookChapters.value.map((_, i) => i)
}

const clearAllChapters = () => {
  customSelectedIndices.value = []
}

const selectedChaptersSummaryText = computed(() => {
  const total = bookChapters.value.length || 0
  if (scopeMode.value === 'all') {
    return t('bilingual.scopeSummaryAll', { total })
  }
  if (scopeMode.value === 'current') {
    return t('bilingual.scopeSummaryCurrent')
  }
  return t('bilingual.scopeSummaryCustom', {
    selected: customSelectedIndices.value.length,
    total,
  })
})

const switchToAiAndConfig = () => {
  selectedEngine.value = 'ai'
  bilingualStore.setEngine('ai')
  errorMessage.value = ''
  showAiGuideOnError.value = false
  emit('openSettings')
}

const handleClose = () => {
  if (isExporting.value) return
  isSuccess.value = false
  errorMessage.value = ''
  progressPercent.value = 0
  retryText.value = ''
  emit('close')
}

const cancelExport = () => {
  cancelled = true
  isExporting.value = false
  currentStepText.value = ''
  retryText.value = ''
}

const startExport = async () => {
  errorMessage.value = ''
  isSuccess.value = false
  isExporting.value = true
  progressPercent.value = 0
  retryText.value = ''
  showAiGuideOnError.value = false
  cancelled = false
  currentStepText.value = t('bilingual.preparing')

  try {
    const arrayBuffer = await props.loadBinary()
    if (!arrayBuffer) {
      throw new Error(t('bilingual.loadFailed'))
    }

    // 计算实际要翻译的章节索引列表
    let targetIndices: number[] | undefined = undefined
    if (scopeMode.value === 'current') {
      if (props.currentChapterHref && bookChapters.value.length > 0) {
        const cleanHref = props.currentChapterHref.split('#')[0]
        const idx = bookChapters.value.findIndex(
          (c) => c.href === cleanHref || c.href.endsWith(cleanHref) || cleanHref.endsWith(c.href)
        )
        targetIndices = [idx !== -1 ? idx : 0]
      } else {
        targetIndices = [0]
      }
    } else if (scopeMode.value === 'custom') {
      if (customSelectedIndices.value.length === 0) {
        throw new Error(t('bilingual.noChaptersSelected'))
      }
      targetIndices = customSelectedIndices.value
    }

    const effectiveEngine = selectedEngine.value === 'ai' && !hasValidAiKey.value ? 'google_free' : selectedEngine.value

    const result = await exportBilingualEpub(
      arrayBuffer,
      props.bookTitle,
      selectedLang.value,
      effectiveEngine,
      llmStore.config,
      (p) => {
        progressPercent.value = p.percent
        currentStepText.value = t('bilingual.chapterProgress', {
          current: p.currentChapter,
          total: p.totalChapters,
          name: p.chapterName,
        })
        if (p.statusMessage) {
          const match = p.statusMessage.match(/Retry (\d+)/)
          if (match) {
            retryText.value = t('bilingual.statusRetry', { count: match[1] })
          }
        } else {
          retryText.value = ''
        }
      },
      () => cancelled,
      targetIndices
    )

    if (cancelled || !result) {
      isExporting.value = false
      return
    }

    exportStats.value = {
      chapters: result.processedChaptersCount,
      sentences: result.totalSentences,
    }

    // 触发下载
    const cleanTitle = props.bookTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fff-_]/g, '_').slice(0, 35)
    let suffix = '_[Bilingual]'
    if (scopeMode.value === 'current' && targetIndices && targetIndices.length === 1) {
      const chapLabel = (bookChapters.value[targetIndices[0]]?.label || `Ch${targetIndices[0] + 1}`)
        .replace(/[^a-zA-Z0-9\u4e00-\u9fff-_]/g, '_').slice(0, 20)
      suffix = `_[${chapLabel}_Bilingual]`
    } else if (scopeMode.value === 'custom' && targetIndices && targetIndices.length < (bookChapters.value.length || 999)) {
      suffix = `_[${targetIndices.length}Chaps_Bilingual]`
    }

    const filename = `${cleanTitle}${suffix}.epub`
    downloadBlob(result.blob, filename)

    isExporting.value = false
    isSuccess.value = true
  } catch (err: any) {
    console.error('Bilingual export failed:', err)
    if (err?.message === 'NO_TRANSLATIONS_PRODUCED') {
      errorMessage.value = t('bilingual.noSentencesError')
      showAiGuideOnError.value = true
    } else {
      errorMessage.value = err?.message || t('llm.error')
    }
    isExporting.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(150, 150, 150, 0.3);
  border-radius: 4px;
}
</style>
