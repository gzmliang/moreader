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
            <span class="font-medium flex items-center gap-1.5">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              {{ currentStepText }}
            </span>
            <span class="font-bold text-blue-500">{{ progressPercent }}%</span>
          </div>

          <!-- 进度条 -->
          <div class="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all duration-300 rounded-full"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>

          <p class="text-[11px] opacity-60 text-center" :class="theme.textColor">
            {{ t('bilingual.exportWarning') }}
          </p>
        </div>

        <!-- 成功状态 -->
        <div v-if="isSuccess" class="flex flex-col items-center gap-3 py-4 text-center">
          <div class="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-2xl font-bold">
            ✓
          </div>
          <h3 class="text-sm font-bold" :class="theme.textColor">
            {{ t('bilingual.exportSuccess') }}
          </h3>
          <p class="text-xs opacity-70" :class="theme.textColor">
            {{ t('bilingual.downloadTriggered') }}
          </p>
        </div>

        <!-- 错误提示 -->
        <p v-if="errorMessage" class="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg">
          {{ errorMessage }}
        </p>

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

const props = defineProps<{
  visible: boolean
  bookId: string
  bookTitle: string
  theme: any
  loadBinary: () => Promise<ArrayBuffer | null>
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

const selectedLang = ref('zh-CN')
const isExporting = ref(false)
const isSuccess = ref(false)
const errorMessage = ref('')
const progressPercent = ref(0)
const currentStepText = ref('')
let cancelled = false

const handleClose = () => {
  if (isExporting.value) return
  isSuccess.value = false
  errorMessage.value = ''
  progressPercent.value = 0
  emit('close')
}

const cancelExport = () => {
  cancelled = true
  isExporting.value = false
  currentStepText.value = ''
}

const startExport = async () => {
  errorMessage.value = ''
  isSuccess.value = false
  isExporting.value = true
  progressPercent.value = 0
  cancelled = false
  currentStepText.value = t('bilingual.preparing')

  try {
    const arrayBuffer = await props.loadBinary()
    if (!arrayBuffer) {
      throw new Error(t('bilingual.loadFailed'))
    }

    const blob = await exportBilingualEpub(
      arrayBuffer,
      props.bookTitle,
      selectedLang.value,
      (p) => {
        progressPercent.value = p.percent
        currentStepText.value = t('bilingual.chapterProgress', {
          current: p.currentChapter,
          total: p.totalChapters,
          name: p.chapterName,
        })
      },
      () => cancelled
    )

    if (cancelled || !blob) {
      isExporting.value = false
      return
    }

    // 触发下载
    const cleanTitle = props.bookTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fff-_]/g, '_').slice(0, 40)
    const filename = `${cleanTitle}_[Bilingual].epub`
    downloadBlob(blob, filename)

    isExporting.value = false
    isSuccess.value = true
  } catch (err: any) {
    console.error('Bilingual export failed:', err)
    errorMessage.value = err?.message || t('llm.error')
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
