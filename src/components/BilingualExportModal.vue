<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-lg rounded-2xl shadow-2xl border p-6 flex flex-col gap-5 transition-all"
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
                @click="selectedEngine = 'google_free'"
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
                @click="selectedEngine = 'ai'"
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

          <!-- 目标语言选择 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold" :class="theme.textColor">
              {{ t('bilingual.targetLangLabel') }}
            </label>
            <select
              v-model="selectedLang"
              class="w-full text-xs p-2.5 rounded-lg border bg-transparent transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
              :class="[theme.borderColor, theme.textColor]"
            >
              <option value="zh-CN">🇨🇳 简体中文 (Simplified Chinese)</option>
              <option value="zh-TW">🇭🇰 繁體中文 (Traditional Chinese)</option>
              <option value="ja">🇯🇵 日本語 (Japanese)</option>
              <option value="ko">🇰🇷 한국어 (Korean)</option>
              <option value="fr">🇫🇷 Français (French)</option>
              <option value="de">🇩🇪 Deutsch (German)</option>
              <option value="es">🇪🇸 Español (Spanish)</option>
              <option value="pt">🇧🇷 Português (Portuguese)</option>
            </select>
          </div>

          <!-- 特性亮点卡片 -->
          <div class="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 space-y-2 text-[11px]" :class="[theme.borderColor, theme.textColor]">
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
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { exportBilingualEpub } from '@/utils/bilingualExporter'
import { downloadBlob } from '@/utils/aiExporter'
import { useLLMStore } from '@/stores/llmStore'
import { useBilingualStore } from '@/stores/bilingualStore'

const props = defineProps<{
  visible: boolean
  bookId: string
  bookTitle: string
  theme: any
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

const switchToAiAndConfig = () => {
  selectedEngine.value = 'ai'
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
      () => cancelled
    )

    if (cancelled || !result) {
      isExporting.value = false
      return
    }

    exportStats.value = {
      chapters: result.totalChapters,
      sentences: result.totalSentences,
    }

    // 触发下载
    const cleanTitle = props.bookTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fff-_]/g, '_').slice(0, 40)
    const filename = `${cleanTitle}_[Bilingual].epub`
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
</style>
